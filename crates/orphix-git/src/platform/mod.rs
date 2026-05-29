use std::path::PathBuf;
use std::process::Command;

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

pub fn command() -> Command {
    Command::new(resolve_git())
}

fn resolve_git() -> PathBuf {
    platform::git_candidates()
        .into_iter()
        .find(|candidate| candidate.is_absolute() && candidate.exists())
        .unwrap_or_else(|| PathBuf::from("git"))
}
