pub mod windows;
pub mod darwin;
pub mod linux;

use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct ShellInfo {
    pub program: String,
    pub args: Vec<String>,
    pub label: String,
}

pub fn detect_default_shell() -> ShellInfo {
    if cfg!(target_os = "windows") {
        windows::resolve_default_shell()
    } else if cfg!(target_os = "macos") {
        darwin::resolve_default_shell()
    } else {
        linux::resolve_default_shell()
    }
}

pub fn list_available_shells() -> Vec<ShellInfo> {
    if cfg!(target_os = "windows") {
        windows::list_shells()
    } else if cfg!(target_os = "macos") {
        darwin::list_shells()
    } else {
        linux::list_shells()
    }
}

pub fn default_cwd() -> PathBuf {
    dirs_or_fallback().unwrap_or_else(|| {
        if cfg!(target_os = "windows") {
            PathBuf::from("C:\\")
        } else {
            PathBuf::from("/")
        }
    })
}

fn dirs_or_fallback() -> Option<PathBuf> {
    if cfg!(target_os = "windows") {
        std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .ok()
            .map(PathBuf::from)
    } else {
        std::env::var("HOME").ok().map(PathBuf::from)
    }
    .filter(|p| p.exists())
    .or_else(|| std::env::current_dir().ok())
}
