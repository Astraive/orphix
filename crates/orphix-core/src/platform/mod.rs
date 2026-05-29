use std::path::PathBuf;

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod mac;
#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "linux")]
use linux as platform;
#[cfg(target_os = "macos")]
use mac as platform;
#[cfg(target_os = "windows")]
use windows as platform;

pub fn home_dir() -> Option<PathBuf> {
    platform::home_dir().filter(|path| path.exists())
}

pub fn fallback_root() -> PathBuf {
    platform::fallback_root()
}
