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

use std::fs::DirEntry;

pub fn should_skip_entry(entry: &DirEntry, name: &str) -> bool {
    platform::should_skip_entry(entry, name) || name == "node_modules" || name == "target"
}
