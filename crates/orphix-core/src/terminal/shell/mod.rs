pub mod darwin;
pub mod linux;
pub mod windows;

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
    dirs_or_fallback().unwrap_or_else(crate::platform::fallback_root)
}

fn dirs_or_fallback() -> Option<PathBuf> {
    crate::platform::home_dir().or_else(|| std::env::current_dir().ok())
}
