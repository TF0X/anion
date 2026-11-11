fn main() {
    #[cfg(target_os = "windows")]
    {
        println!("cargo:rerun-if-changed=icons/icon.ico");
        let mut res = winresource::WindowsResource::new();
        res.set_icon("icons/icon.ico");
        res.set("ProductName", "Anion");
        res.set("FileDescription", "Anion");
        if let Err(e) = res.compile() {
            println!("cargo:warning=icon resource not embedded: {e}");
        }
    }
}
