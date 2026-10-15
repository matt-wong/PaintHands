fn main() {
    // The Vosk speech library is downloaded to src-tauri/vosk by `npm run setup:voice`
    let vosk = format!("{}/vosk", std::env::var("CARGO_MANIFEST_DIR").unwrap());
    println!("cargo:rustc-link-search=native={vosk}");
    // Lets the app find the library there when it starts in development
    // (the built .app carries its own copy in Contents/Frameworks)
    println!("cargo:rustc-link-arg=-Wl,-rpath,{vosk}");

    tauri_build::build()
}
