use std::path::PathBuf;

pub fn home_dir() -> Option<PathBuf> {
    std::env::var("HOME").ok().map(PathBuf::from)
}

pub fn fallback_root() -> PathBuf {
    PathBuf::from("/")
}
