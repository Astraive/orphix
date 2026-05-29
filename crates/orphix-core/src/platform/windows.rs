use std::path::PathBuf;

pub fn home_dir() -> Option<PathBuf> {
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .ok()
        .map(PathBuf::from)
}

pub fn fallback_root() -> PathBuf {
    PathBuf::from("C:\\")
}
