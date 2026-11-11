#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::time::{Duration, Instant};

use tao::{
    dpi::{LogicalSize, PhysicalPosition, PhysicalSize},
    event::{Event, StartCause, WindowEvent},
    event_loop::{ControlFlow, EventLoopBuilder},
    window::{ResizeDirection, Window, WindowBuilder},
};
use wry::{WebContext, WebView, WebViewBuilder, http::Request};

/// How long the window must go untouched before we start reclaiming memory.
const IDLE: Duration = Duration::from_secs(300);
/// While idle we re-check this often, so minimizing *later* still escalates.
const POLL: Duration = Duration::from_secs(60);

const SIDEBAR_JS: &str = include_str!("sidebar.js");
const HOME: &str = "https://claude.ai";

/// 1/8 the area of a 1080p screen, kept at a comfortable chat aspect ratio.
const DEFAULT_W: f64 = 480.0;
const DEFAULT_H: f64 = 540.0;

enum Ev {
    Navigate(String),
    Glass(u8),
    Ready,
    Drag,
    Resize(ResizeDirection),
    Maximize,
    Minimize,
    Close,
}

#[derive(Clone)]
struct State {
    url: String,
    glass: u8,
    /// Last position and size in physical pixels: x, y, w, h.
    win: Option<(i32, i32, u32, u32)>,
}

fn state_dir() -> PathBuf {
    let dir = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("anion");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

fn load_state() -> State {
    let v = std::fs::read_to_string(state_dir().join("state.json"))
        .ok()
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .unwrap_or_default();
    let win = match (&v["x"], &v["y"], &v["w"], &v["h"]) {
        (x, y, w, h) if w.is_number() && h.is_number() => Some((
            x.as_i64().unwrap_or(0) as i32,
            y.as_i64().unwrap_or(0) as i32,
            w.as_u64().unwrap_or(0) as u32,
            h.as_u64().unwrap_or(0) as u32,
        )),
        _ => None,
    }
    .filter(|(_, _, w, h)| *w >= 300 && *h >= 260);

    State {
        url: v["url"].as_str().unwrap_or(HOME).to_owned(),
        glass: v["glass"].as_u64().unwrap_or(1).min(2) as u8,
        win,
    }
}

fn save_state(state: &State) {
    let mut doc = serde_json::json!({ "url": state.url, "glass": state.glass });
    if let Some((x, y, w, h)) = state.win {
        doc["x"] = x.into();
        doc["y"] = y.into();
        doc["w"] = w.into();
        doc["h"] = h.into();
    }
    let _ = std::fs::write(state_dir().join("state.json"), doc.to_string());
}

fn direction(tag: &str) -> Option<ResizeDirection> {
    Some(match tag {
        "n" => ResizeDirection::North,
        "s" => ResizeDirection::South,
        "w" => ResizeDirection::West,
        "e" => ResizeDirection::East,
        "nw" => ResizeDirection::NorthWest,
        "ne" => ResizeDirection::NorthEast,
        "sw" => ResizeDirection::SouthWest,
        "se" => ResizeDirection::SouthEast,
        _ => return None,
    })
}

/// Park the window near the bottom-right, the way a companion panel wants to sit.
fn place_bottom_right(window: &Window) {
    let Some(monitor) = window.primary_monitor().or_else(|| window.current_monitor()) else {
        return;
    };
    let area = monitor.size();
    let origin = monitor.position();
    let win = window.outer_size();
    window.set_outer_position(PhysicalPosition::new(
        origin.x + area.width as i32 - win.width as i32 - 28,
        origin.y + area.height as i32 - win.height as i32 - 72,
    ));
}

/// Two tiers of memory reclaim.
///
/// Trimming is invisible and safe whenever the window is idle. A full suspend
/// has to hide the webview first (WebView2 refuses to suspend a visible
/// controller), which would blank a window the user can still see — so it is
/// gated on the window actually being minimized. Suspend *freezes* the
/// renderer rather than discarding it, so an unsent draft survives.
#[cfg(target_os = "windows")]
mod reclaim {
    use super::WebView;
    use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2_3;
    use webview2_com::TrySuspendCompletedHandler;
    use windows::core::Interface;
    use wry::{MemoryUsageLevel, WebViewExtWindows};

    pub fn trim(wv: &WebView) {
        let _ = wv.set_memory_usage_level(MemoryUsageLevel::Low);
    }

    pub fn untrim(wv: &WebView) {
        let _ = wv.set_memory_usage_level(MemoryUsageLevel::Normal);
    }

    // Release builds are GUI-subsystem, so there is no stderr to write to.
    pub fn diag(msg: &str) {
        if std::env::var_os("ANION_DIAG").is_none() {
            return;
        }
        use std::io::Write;
        if let Ok(mut f) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(super::state_dir().join("diag.log"))
        {
            let _ = writeln!(f, "{msg}");
        }
    }

    pub fn suspend(wv: &WebView) -> bool {
        if let Err(e) = wv.set_visible(false) {
            diag(&format!("set_visible(false) failed: {e}"));
            return false;
        }
        trim(wv);
        match wv.webview().cast::<ICoreWebView2_3>() {
            Ok(w3) => unsafe {
                // The BOOL handed to the handler is advisory: WebView2 declines
                // while audio or a download is live.
                let r = w3.TrySuspend(&TrySuspendCompletedHandler::create(Box::new(
                    |hr, succeeded| {
                        diag(&format!(
                            "TrySuspend completed: hr={hr:?} succeeded={succeeded}"
                        ));
                        Ok(())
                    },
                )));
                diag(&format!("TrySuspend call returned: {r:?}"));
                r.is_ok()
            },
            Err(_) => {
                let _ = wv.set_visible(true);
                false
            }
        }
    }

    pub fn resume(wv: &WebView) {
        if let Ok(w3) = wv.webview().cast::<ICoreWebView2_3>() {
            unsafe {
                let _ = w3.Resume();
            }
        }
        let _ = wv.set_visible(true);
        untrim(wv);
    }
}

#[cfg(not(target_os = "windows"))]
mod reclaim {
    use super::WebView;
    pub fn diag(_: &str) {}
    pub fn trim(_: &WebView) {}
    pub fn untrim(_: &WebView) {}
    pub fn suspend(_: &WebView) -> bool {
        false
    }
    pub fn resume(_: &WebView) {}
}

fn main() -> wry::Result<()> {
    let event_loop = EventLoopBuilder::<Ev>::with_user_event().build();
    let proxy = event_loop.create_proxy();

    let mut state = load_state();

    let mut builder = WindowBuilder::new()
        .with_title("Anion")
        .with_min_inner_size(LogicalSize::new(300.0, 260.0))
        .with_decorations(false)
        .with_transparent(true)
        .with_resizable(true);

    builder = match state.win {
        Some((_, _, w, h)) => builder.with_inner_size(PhysicalSize::new(w, h)),
        None => builder.with_inner_size(LogicalSize::new(DEFAULT_W, DEFAULT_H)),
    };

    #[cfg(target_os = "windows")]
    {
        use tao::platform::windows::WindowBuilderExtWindows;
        builder = builder.with_undecorated_shadow(false);
    }

    let window = builder.build(&event_loop).unwrap();

    // A saved position can point at a monitor that no longer exists. There is
    // no titlebar to drag the window back with, so verify before trusting it.
    let visible = state.win.is_some_and(|(x, y, _, _)| {
        window.available_monitors().any(|m| {
            let (p, s) = (m.position(), m.size());
            x + 80 >= p.x
                && y + 40 >= p.y
                && x + 80 <= p.x + s.width as i32
                && y + 40 <= p.y + s.height as i32
        })
    });

    match state.win {
        Some((x, y, _, _)) if visible => window.set_outer_position(PhysicalPosition::new(x, y)),
        _ => place_bottom_right(&window),
    }

    #[cfg(target_os = "windows")]
    {
        use tao::platform::windows::WindowExtWindows;
        // Restores the drop shadow + rounded corners Windows gives decorated windows.
        window.set_undecorated_shadow(true);
        // On Win11 22621+ this takes the DWM backdrop path and ignores any tint,
        // so the glass colour is done in CSS instead.
        let _ = window_vibrancy::apply_acrylic(&window, None);
    }

    // Leaked so the context outlives the webview without borrow gymnastics;
    // it lives for the whole process anyway. This is what keeps logins persistent.
    let ctx: &'static mut WebContext =
        Box::leak(Box::new(WebContext::new(Some(state_dir().join("webview")))));

    let webview = WebViewBuilder::new_with_web_context(ctx)
        .with_transparent(true)
        .with_url(&state.url)
        .with_initialization_script(SIDEBAR_JS)
        .with_ipc_handler(move |req: Request<String>| {
            let Ok(msg) = serde_json::from_str::<serde_json::Value>(req.body()) else {
                return;
            };
            let ev = match msg["action"].as_str() {
                Some("navigate") => match msg["url"].as_str() {
                    Some(url) => Ev::Navigate(url.to_owned()),
                    None => return,
                },
                Some("resize") => match msg["dir"].as_str().and_then(direction) {
                    Some(dir) => Ev::Resize(dir),
                    None => return,
                },
                Some("glass") => Ev::Glass(msg["level"].as_u64().unwrap_or(0).min(2) as u8),
                Some("ready") => Ev::Ready,
                Some("drag") => Ev::Drag,
                Some("maximize") => Ev::Maximize,
                Some("minimize") => Ev::Minimize,
                Some("close") => Ev::Close,
                _ => return,
            };
            let _ = proxy.send_event(ev);
        })
        .build(&window)?;

    let mut webview = Some(webview);
    // Assume idle until the window actually takes focus: launching unfocused is
    // normal, and an app that never got focus should still be allowed to idle.
    let mut last_active = Instant::now();
    let mut focused = false;
    let mut suspended = false;
    let mut trimmed = false;

    event_loop.run(move |event, _, control_flow| {
        // A steady heartbeat rather than focus events alone, so that minimizing
        // (or never being focused at all) still reaches the idle path.
        *control_flow = ControlFlow::WaitUntil(Instant::now() + POLL);

        match event {
            Event::NewEvents(StartCause::ResumeTimeReached { .. }) => {
                if let Some(w) = webview.as_ref() {
                    let minimized = window.is_minimized();
                    reclaim::diag(&format!(
                        "tick: focused={focused} minimized={minimized} idle={}s suspended={suspended} trimmed={trimmed}",
                        last_active.elapsed().as_secs()
                    ));

                    if suspended && !minimized {
                        // Back on screen without taking focus: un-hide it.
                        reclaim::resume(w);
                        suspended = false;
                        trimmed = false;
                    } else if !focused && last_active.elapsed() >= IDLE {
                        if minimized {
                            if !suspended && reclaim::suspend(w) {
                                suspended = true;
                                trimmed = true;
                            }
                        } else if !trimmed {
                            reclaim::trim(w);
                            trimmed = true;
                        }
                    }
                }
            }
            Event::WindowEvent {
                event: WindowEvent::Focused(has_focus),
                ..
            } => {
                focused = has_focus;
                last_active = Instant::now();
                if has_focus && let Some(w) = webview.as_ref() {
                    if suspended {
                        reclaim::resume(w);
                        suspended = false;
                        trimmed = false;
                    } else if trimmed {
                        reclaim::untrim(w);
                        trimmed = false;
                    }
                }
            }
            Event::UserEvent(Ev::Navigate(url)) => {
                if let Some(w) = &webview {
                    if suspended {
                        reclaim::resume(w);
                        suspended = false;
                        trimmed = false;
                    }
                    last_active = Instant::now();
                    state.url = url;
                    save_state(&state);
                    let _ = w.load_url(&state.url);
                    *control_flow = ControlFlow::Wait;
                }
            }
            // Every page announces itself at document-start; hand it the saved
            // settings so preferences follow you across providers and restarts.
            Event::UserEvent(Ev::Ready) => {
                if let Some(w) = &webview {
                    let _ = w.evaluate_script(&format!(
                        "window.__anionState({{glass:{}}})",
                        state.glass
                    ));
                }
            }
            Event::UserEvent(Ev::Glass(level)) => {
                state.glass = level;
                save_state(&state);
            }
            Event::UserEvent(Ev::Drag) => {
                let _ = window.drag_window();
            }
            Event::UserEvent(Ev::Resize(dir)) => {
                let _ = window.drag_resize_window(dir);
            }
            Event::UserEvent(Ev::Maximize) => {
                window.set_maximized(!window.is_maximized());
            }
            Event::UserEvent(Ev::Minimize) => {
                window.set_minimized(true);
            }
            // Remember geometry so a resize survives a restart. Minimized
            // windows report bogus sizes and a -32000 origin, so skip those.
            Event::WindowEvent {
                event: WindowEvent::Resized(size),
                ..
            } => {
                if size.width > 0 && size.height > 0 && !window.is_minimized() {
                    if let Ok(pos) = window.outer_position() {
                        state.win = Some((pos.x, pos.y, size.width, size.height));
                    }
                }
            }
            Event::WindowEvent {
                event: WindowEvent::Moved(pos),
                ..
            } => {
                if !window.is_minimized() && pos.x > -30000 && pos.y > -30000 {
                    let size = window.inner_size();
                    state.win = Some((pos.x, pos.y, size.width, size.height));
                }
            }
            Event::UserEvent(Ev::Close)
            | Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            } => {
                save_state(&state);
                // Drop the webview before tearing down the loop.
                let _ = webview.take();
                *control_flow = ControlFlow::Exit;
            }
            _ => {}
        }
    });
}
