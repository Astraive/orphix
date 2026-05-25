fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.contains(&"--stdio".to_string()) {
        orphix_core::server::stdio::run();
    } else {
        eprintln!("orphix-core — native terminal engine for Orphix");
        eprintln!();
        eprintln!("Usage: orphix-core --stdio");
        eprintln!();
        eprintln!("  --stdio    Run in stdio mode (JSON lines over stdin/stdout)");
    }
}
