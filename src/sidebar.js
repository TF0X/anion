// Injected into every page the webview loads.
// Lives in a closed shadow root so host-page CSS can never reach it.
(function () {
  "use strict";

  // Official brand marks, inlined as SVG path data. Inline SVG is DOM rather
  // than a fetched resource, so a host page's img-src CSP can never blank them.
  var D_CLAUDE = "m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z";

  // One sixth of the OpenAI knot; the full mark is this wedge at 60° steps.
  var D_CHATGPT = "M1107.3 299.1c-197.999 0-373.9 127.3-435.2 315.3L650 743.5v427.9c0 21.4 11 40.4 29.4 51.4l344.5 198.515V833.3h.1v-27.9L1372.7 604c33.715-19.52 70.44-32.857 108.47-39.828L1447.6 450.3C1361 353.5 1237.1 298.5 1107.3 299.1zm0 117.5-.6.6c79.699 0 156.3 27.5 217.6 78.4-2.5 1.2-7.4 4.3-11 6.1L952.8 709.3c-18.4 10.4-29.4 30-29.4 51.4V1248l-155.1-89.4V755.8c-.1-187.099 151.601-338.9 339-339.2z";

  var D_GEMINI = "M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81";

  var D_DEEPSEEK = "M23.748 4.651c-.254-.124-.364.113-.512.233-.051.04-.094.09-.137.137-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.155-.708-.311-.955-.65-.172-.24-.219-.509-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.094.172.187.129.323-.082.28-.18.553-.266.833-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836.27-.098.094-.433-.778-.428-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136 9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653 1.857 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.132-.284 4.994-1.86.47.234.962.328 1.78.398.629.058 1.235-.031 1.705-.129.735-.155.684-.836.418-.961-2.155-1.004-1.682-.595-2.112-.926 1.095-1.295 2.768-3.598 3.284-6.733.05-.346.115-.834.108-1.114-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16-.39.024-.32.472-.234.763.09.288.207.487.371.74.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.168-1.361-.801-2.5-1.86-3.301-3.306-.775-1.393-1.225-2.888-1.299-4.482-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774.868.86 1.525 1.887 2.202 2.89.72 1.066 1.494 2.082 2.48 2.915.348.291.626.513.892.677-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287.3.3 0 0 1 .113.074.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078.253.253 0 0 1-.114-.358 1 1 0 0 1 .192-.21c.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.392.451.462.576.685.915.176.264.336.536.446.848.066.194-.02.353-.25.45";

  var D_META = "M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z";

  var PROVIDERS = [
    { id: "claude",   name: "Claude",   url: "https://claude.ai",             color: "#D97757", match: ["claude.ai"],
      box: "0 0 24 24", d: D_CLAUDE },
    { id: "chatgpt",  name: "ChatGPT",  url: "https://chatgpt.com",           color: "#10A37F", match: ["chatgpt.com", "openai.com"],
      box: "0 0 2406 2406", d: D_CHATGPT, spin: [0, 60, 120, 180, 240, 300], pivot: "1203 1203" },
    { id: "gemini",   name: "Gemini",   url: "https://gemini.google.com/app", color: "#8E75B2", match: ["gemini.google.com"],
      box: "0 0 24 24", d: D_GEMINI },
    { id: "deepseek", name: "DeepSeek", url: "https://chat.deepseek.com",     color: "#5786FE", match: ["deepseek.com"],
      box: "0 0 24 24", d: D_DEEPSEEK },
    { id: "meta",     name: "Meta AI",  url: "https://www.meta.ai",           color: "#0467DF", match: ["meta.ai"],
      box: "0 0 24 24", d: D_META }
  ];

  var SVG_NS = "http://www.w3.org/2000/svg";

  function mark(p) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", p.box);
    svg.setAttribute("aria-hidden", "true");
    var angles = p.spin || [0];
    for (var i = 0; i < angles.length; i++) {
      var path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", p.d);
      if (angles[i]) path.setAttribute("transform", "rotate(" + angles[i] + " " + p.pivot + ")");
      svg.appendChild(path);
    }
    return svg;
  }

  var RAIL = 52;
  var ROOT_ID = "__anion_root";

  function send(action, extra) {
    var payload = { action: action };
    if (extra) for (var k in extra) payload[k] = extra[k];
    try {
      window.ipc.postMessage(JSON.stringify(payload));
    } catch (e) { /* host not ready */ }
  }

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function activeId() {
    var host = location.hostname || "";
    for (var i = 0; i < PROVIDERS.length; i++) {
      var m = PROVIDERS[i].match;
      for (var j = 0; j < m.length; j++) {
        if (host === m[j] || host.endsWith("." + m[j])) return PROVIDERS[i].id;
      }
    }
    return null;
  }

  var CSS = `
:host {
  all: initial;
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
* { margin: 0; padding: 0; box-sizing: border-box; }

.rail {
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: ${RAIL}px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 9px 0 12px;
  pointer-events: auto;
  background: rgba(20, 20, 26, 0.55);
  backdrop-filter: blur(34px) saturate(185%);
  -webkit-backdrop-filter: blur(34px) saturate(185%);
  box-shadow:
    inset 1px 0 0 rgba(255, 255, 255, 0.07),
    -14px 0 36px -16px rgba(0, 0, 0, 0.55);
  transition: transform .34s cubic-bezier(.32, .72, 0, 1), opacity .24s ease;
}
.rail.collapsed { transform: translateX(${RAIL}px); opacity: 0; }

/* ---- window controls ---- */
.winbar { display: flex; gap: 5px; flex: 0 0 auto; }
.wbtn {
  width: 15px; height: 15px; border: 0; border-radius: 50%;
  background: rgba(255, 255, 255, 0.13);
  cursor: pointer; padding: 0; position: relative;
  transition: background .16s ease, transform .16s ease;
}
.wbtn:hover { transform: scale(1.14); }
.wbtn.min:hover   { background: #FEBC2E; }
.wbtn.close:hover { background: #FF5F57; }

.grip {
  flex: 0 0 auto;
  width: 22px; height: 14px;
  cursor: grab;
  display: grid;
  grid-template-columns: 3px 3px;
  grid-auto-rows: 3px;
  gap: 3px;
  align-content: center;
  justify-content: center;
  opacity: .32;
  transition: opacity .18s ease;
}
.grip:hover { opacity: .7; }
.grip:active { cursor: grabbing; }
.grip i { background: #fff; border-radius: 50%; display: block; }

.sep {
  flex: 0 0 auto;
  width: 22px; height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 1px 0 3px;
}

/* ---- provider buttons ---- */
.list { display: flex; flex-direction: column; gap: 5px; flex: 0 0 auto; }

.pbtn {
  position: relative;
  width: 36px; height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.62);
  font-size: 14px; font-weight: 600; line-height: 1;
  letter-spacing: .2px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background .2s ease, color .2s ease, transform .2s cubic-bezier(.32,.72,0,1), box-shadow .2s ease, border-color .2s ease;
}
.pbtn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  transform: translateY(-1px);
}
.pbtn:active { transform: translateY(0) scale(.95); }

.pbtn svg {
  width: 18px; height: 18px; display: block;
  fill: var(--accent);
  opacity: .8;
  transition: opacity .2s ease, filter .2s ease;
}
.pbtn:hover svg { opacity: 1; }
.pbtn.on svg {
  opacity: 1;
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 65%, transparent));
}

.pbtn.on {
  color: #fff;
  background: color-mix(in srgb, var(--accent) 26%, rgba(255,255,255,.05));
  border-color: color-mix(in srgb, var(--accent) 55%, transparent);
  box-shadow: 0 0 18px -5px var(--accent), inset 0 1px 0 rgba(255,255,255,.14);
}
.pbtn .dot {
  position: absolute; left: -9px; top: 50%;
  width: 3px; height: 0; border-radius: 3px;
  background: var(--accent);
  transform: translateY(-50%);
  transition: height .26s cubic-bezier(.32,.72,0,1);
}
.pbtn.on .dot { height: 17px; }

.tip {
  position: absolute; right: calc(100% + 11px); top: 50%;
  transform: translateY(-50%) translateX(5px);
  padding: 5px 9px;
  border-radius: 7px;
  background: rgba(28, 28, 34, 0.9);
  backdrop-filter: blur(14px) saturate(170%);
  -webkit-backdrop-filter: blur(14px) saturate(170%);
  box-shadow: 0 0 0 1px rgba(255,255,255,.08), 0 8px 22px -8px rgba(0,0,0,.7);
  color: rgba(255, 255, 255, 0.92);
  font-size: 11px; font-weight: 500; white-space: nowrap;
  opacity: 0; pointer-events: none;
  transition: opacity .16s ease, transform .16s cubic-bezier(.32,.72,0,1);
}
.pbtn:hover .tip { opacity: 1; transform: translateY(-50%) translateX(0); }

.spacer { flex: 1 1 auto; align-self: stretch; cursor: grab; min-height: 10px; }
.spacer:active { cursor: grabbing; }

.fold, .gbtn {
  flex: 0 0 auto;
  width: 26px; height: 26px;
  border: 0; border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background .18s ease, color .18s ease;
}
.fold:hover, .gbtn:hover { background: rgba(255, 255, 255, 0.1); color: rgba(255,255,255,.85); }
.gbtn.lit { color: rgba(255,255,255,.92); background: rgba(255,255,255,.11); }

/* ---- resize grips (frameless windows get none for free) ---- */
.rz { position: absolute; pointer-events: auto; }
.rz.n  { top: 0; left: 0; right: 0; height: 5px; cursor: ns-resize; }
.rz.s  { bottom: 0; left: 0; right: 0; height: 5px; cursor: ns-resize; }
.rz.w  { left: 0; top: 0; bottom: 0; width: 5px; cursor: ew-resize; }
.rz.e  { right: 0; top: 0; bottom: 0; width: 5px; cursor: ew-resize; }
.rz.nw { top: 0; left: 0; width: 12px; height: 12px; cursor: nwse-resize; }
.rz.ne { top: 0; right: 0; width: 12px; height: 12px; cursor: nesw-resize; }
.rz.sw { bottom: 0; left: 0; width: 12px; height: 12px; cursor: nesw-resize; }
.rz.se { bottom: 0; right: 0; width: 12px; height: 12px; cursor: nwse-resize; }

/* ---- peek tab shown while collapsed ---- */
.peek {
  position: absolute; top: 50%; right: 0;
  transform: translateY(-50%) translateX(100%);
  width: 15px; height: 54px;
  border: 0; border-radius: 9px 0 0 9px;
  background: rgba(20, 20, 26, 0.6);
  backdrop-filter: blur(22px) saturate(180%);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  box-shadow: inset 1px 0 0 rgba(255,255,255,.08), -8px 0 22px -12px rgba(0,0,0,.6);
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  pointer-events: auto;
  opacity: 0;
  transition: transform .34s cubic-bezier(.32,.72,0,1), opacity .2s ease, color .18s ease;
}
.peek.show { transform: translateY(-50%) translateX(0); opacity: 1; }
.peek:hover { color: #fff; }
`;

  // ---- glass engine -------------------------------------------------------
  // Sites paint their own opaque backdrop, which hides the window's acrylic.
  // We walk the shallow chain of full-bleed "app shell" elements and knock
  // their background alpha down, so the desktop blur shows through the page
  // while text and controls stay fully opaque.
  var LEVELS = [
    { alpha: 1,    glyph: "○", name: "Solid" },
    { alpha: 0.82, glyph: "◑", name: "Frosted" },
    { alpha: 0.55, glyph: "●", name: "Clear" }
  ];
  var SKIP = { SCRIPT: 1, STYLE: 1, IMG: 1, VIDEO: 1, CANVAS: 1, SVG: 1, TEXTAREA: 1, INPUT: 1 };
  var level = 0;
  var touched = [];
  var glassBtn = null;
  var settleTimer = null;

  function restore() {
    for (var i = 0; i < touched.length; i++) {
      var t = touched[i];
      if (t[1]) t[0].style.setProperty("background-color", t[1], t[2]);
      else t[0].style.removeProperty("background-color");
      if (t[3]) t[0].style.setProperty("background-image", t[3], t[4]);
      else t[0].style.removeProperty("background-image");
    }
    touched = [];
  }

  function keep(e) {
    touched.push([
      e,
      e.style.getPropertyValue("background-color"),
      e.style.getPropertyPriority("background-color"),
      e.style.getPropertyValue("background-image"),
      e.style.getPropertyPriority("background-image")
    ]);
  }

  // Breadth-first so the outermost shells get handled first, node-capped so a
  // huge chat transcript can never turn this into a layout-thrashing crawl.
  function dim(root, alpha) {
    var queue = [[root, 0]];
    var seen = 0;
    while (queue.length && seen < 800) {
      var item = queue.shift();
      var node = item[0];
      var depth = item[1];
      if (depth > 8 || !node.children) continue;

      for (var i = 0; i < node.children.length; i++) {
        var e = node.children[i];
        if (SKIP[e.tagName] || e.id === ROOT_ID) continue;
        seen++;

        var r = e.getBoundingClientRect();
        // Cheap gate before the expensive computed-style lookup.
        if (r.width >= innerWidth * 0.6) {
          var cs = getComputedStyle(e);
          var full = r.height >= innerHeight * 0.4;
          // Headers, toolbars and composer bars: full width but short. They are
          // the opaque strips left over once the main shell goes translucent.
          var bar =
            !full &&
            r.height >= 24 &&
            (cs.position === "fixed" ||
              cs.position === "sticky" ||
              r.top <= 2 ||
              r.bottom >= innerHeight - 2);

          if (full || bar) {
            var m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(cs.backgroundColor);
            var opaqueFill = m && (m[4] === undefined || parseFloat(m[4]) > 0.9);
            var hasImage = cs.backgroundImage && cs.backgroundImage !== "none";

            // An opaque gradient hides the backdrop just as well as a flat fill,
            // so a surface only counts as glassed once both are dealt with.
            if (opaqueFill || hasImage) {
              keep(e);
              if (opaqueFill) {
                e.style.setProperty(
                  "background-color",
                  "rgba(" + m[1] + "," + m[2] + "," + m[3] + "," + alpha + ")",
                  "important"
                );
              }
              if (hasImage) e.style.setProperty("background-image", "none", "important");
            }
          }
        }
        // Descend regardless: the opaque surface is often nested under a
        // narrower positioning wrapper that is not itself full-bleed.
        queue.push([e, depth + 1]);
      }
    }
  }

  function paintGlass() {
    restore();
    var sid = "__anion_glass_style";
    var tag = document.getElementById(sid);
    if (!level) {
      if (tag) tag.remove();
      return;
    }
    if (!tag) {
      tag = el("style");
      tag.id = sid;
      (document.head || document.documentElement).appendChild(tag);
    }
    tag.textContent =
      "html,body{background-color:transparent!important;background-image:none!important}";
    dim(document.body || document.documentElement, LEVELS[level].alpha);
  }

  function settle() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(paintGlass, 350);
  }

  function setLevel(next, persist) {
    level = ((next % LEVELS.length) + LEVELS.length) % LEVELS.length;
    paintGlass();
    if (glassBtn) {
      glassBtn.textContent = LEVELS[level].glyph;
      glassBtn.title = "Glass: " + LEVELS[level].name;
      glassBtn.classList.toggle("lit", level > 0);
    }
    if (persist) send("glass", { level: level });
  }

  // Rust pushes persisted settings back in once the page announces itself.
  window.__anionState = function (s) {
    if (s && typeof s.glass === "number") setLevel(s.glass, false);
  };

  function build() {
    if (document.getElementById(ROOT_ID)) return;
    if (!document.documentElement) { requestAnimationFrame(build); return; }

    var host = el("div");
    host.id = ROOT_ID;
    var sh = host.attachShadow({ mode: "closed" });

    var style = el("style");
    style.textContent = CSS;
    sh.appendChild(style);

    var rail = el("div", "rail");

    // window controls
    var winbar = el("div", "winbar");
    var close = el("button", "wbtn close");
    close.title = "Close";
    close.addEventListener("click", function () { send("close"); });
    var min = el("button", "wbtn min");
    min.title = "Minimize";
    min.addEventListener("click", function () { send("minimize"); });
    winbar.appendChild(close);
    winbar.appendChild(min);
    rail.appendChild(winbar);

    // drag grip
    var grip = el("div", "grip");
    grip.title = "Drag to move · double-click to maximize";
    for (var d = 0; d < 6; d++) grip.appendChild(el("i"));
    rail.appendChild(grip);

    rail.appendChild(el("div", "sep"));

    // providers
    var cur = activeId();
    var list = el("div", "list");
    PROVIDERS.forEach(function (p) {
      var b = el("button", "pbtn" + (p.id === cur ? " on" : ""));
      b.style.setProperty("--accent", p.color);
      b.appendChild(el("span", "dot"));

      b.appendChild(mark(p));

      var tip = el("span", "tip");
      tip.textContent = p.name;
      b.appendChild(tip);

      b.addEventListener("click", function () {
        if (p.id === cur) return;
        send("navigate", { url: p.url });
      });
      list.appendChild(b);
    });
    rail.appendChild(list);

    var spacer = el("div", "spacer");
    rail.appendChild(spacer);

    glassBtn = el("button", "gbtn");
    glassBtn.textContent = LEVELS[level].glyph;
    glassBtn.title = "Glass: " + LEVELS[level].name;
    glassBtn.classList.toggle("lit", level > 0);
    glassBtn.addEventListener("click", function () { setLevel(level + 1, true); });
    rail.appendChild(glassBtn);

    var fold = el("button", "fold");
    fold.textContent = "›";
    fold.title = "Hide sidebar";
    rail.appendChild(fold);

    // peek tab (visible only when collapsed)
    var peek = el("button", "peek");
    peek.textContent = "‹";
    peek.title = "Show sidebar";

    fold.addEventListener("click", function () {
      rail.classList.add("collapsed");
      peek.classList.add("show");
    });
    peek.addEventListener("click", function () {
      rail.classList.remove("collapsed");
      peek.classList.remove("show");
    });

    // Dragging. Deliberately no dblclick-to-maximize here: drag_window() takes
    // over the mouse on mousedown, so two drags in quick succession surface as
    // a dblclick and would snap the window back to its restored size.
    function dragOn(node) {
      node.addEventListener("mousedown", function (e) {
        if (e.button !== 0) return;
        e.preventDefault();
        send("drag");
      });
    }
    dragOn(grip);
    dragOn(spacer);

    sh.appendChild(rail);
    sh.appendChild(peek);

    // Edge/corner grips. Corners appended last so they sit above the edges.
    ["n", "s", "w", "e", "nw", "ne", "sw", "se"].forEach(function (dir) {
      var g = el("div", "rz " + dir);
      g.addEventListener("mousedown", function (e) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        send("resize", { dir: dir });
      });
      sh.appendChild(g);
    });

    document.documentElement.appendChild(host);

    // SPA re-renders replace the shells we dimmed, so re-apply after they settle.
    if (document.body) {
      new MutationObserver(function () { if (level) settle(); })
        .observe(document.body, { childList: true, subtree: true });
    }
    addEventListener("resize", function () { if (level) settle(); }, { passive: true });

    send("ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build, { once: true });
  } else {
    build();
  }
  // SPA route changes can wipe nodes; cheap re-assert.
  setInterval(function () {
    if (!document.getElementById(ROOT_ID)) build();
  }, 1500);
})();
