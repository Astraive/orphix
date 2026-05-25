use std::path::PathBuf;

use super::ShellInfo;

fn path_exists(p: &str) -> bool {
    PathBuf::from(p).exists()
}

fn find_in_path(name: &str) -> Option<String> {
    let path_env = std::env::var("PATH").unwrap_or_default();
    for segment in path_env.split(';') {
        let segment = segment.trim();
        if segment.is_empty() { continue; }
        let candidate = PathBuf::from(segment).join(name);
        if candidate.exists() {
            return Some(candidate.to_string_lossy().to_string());
        }
    }
    None
}

fn resolve_pwsh() -> Option<ShellInfo> {
    let program_files = std::env::var("ProgramFiles")
        .unwrap_or_else(|_| "C:\\Program Files".to_string());
    let program_files_x86 = std::env::var("ProgramFiles(x86)")
        .unwrap_or_else(|_| "C:\\Program Files (x86)".to_string());

    let candidates = [
        format!("{}\\PowerShell\\7\\pwsh.exe", program_files),
        format!("{}\\PowerShell\\7\\pwsh.exe", program_files_x86),
    ];

    let found = candidates.iter().find(|p| path_exists(p))
        .map(|s| s.to_string())
        .or_else(|| find_in_path("pwsh.exe"));

    found.map(|path| ShellInfo {
        program: path,
        args: vec!["-NoLogo".to_string()],
        label: "PowerShell 7".to_string(),
    })
}

fn resolve_windows_powershell() -> Option<ShellInfo> {
    let system_root = std::env::var("SystemRoot")
        .unwrap_or_else(|_| "C:\\Windows".to_string());
    let path = format!("{}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", system_root);

    if path_exists(&path) {
        Some(ShellInfo {
            program: path,
            args: vec!["-NoLogo".to_string()],
            label: "Windows PowerShell".to_string(),
        })
    } else {
        find_in_path("powershell.exe").map(|path| ShellInfo {
            program: path,
            args: vec!["-NoLogo".to_string()],
            label: "Windows PowerShell".to_string(),
        })
    }
}

fn resolve_cmd() -> ShellInfo {
    let comspec = std::env::var("ComSpec")
        .unwrap_or_else(|_| "cmd.exe".to_string());
    ShellInfo {
        program: comspec,
        args: vec![],
        label: "Command Prompt".to_string(),
    }
}

fn list_wsl_distributions() -> Vec<ShellInfo> {
    let system_root = std::env::var("SystemRoot")
        .unwrap_or_else(|_| "C:\\Windows".to_string());

    let wsl_path = [
        format!("{}\\System32\\wsl.exe", system_root),
        format!("{}\\Sysnative\\wsl.exe", system_root),
    ]
    .iter()
    .find(|p| path_exists(p))
    .map(|s| s.to_string())
    .or_else(|| find_in_path("wsl.exe"));

    let Some(wsl) = wsl_path else { return vec![] };

    let output = std::process::Command::new(&wsl)
        .args(["-l", "-q"])
        .output();

    let Ok(result) = output else { return vec![] };
    if !result.status.success() { return vec![] };

    let stdout = String::from_utf8_lossy(&result.stdout);
    stdout
        .lines()
        .map(|l| l.trim().trim_start_matches('\u{FEFF}').trim_start_matches('*').trim().to_string())
        .filter(|l| !l.is_empty())
        .map(|dist| ShellInfo {
            program: wsl.clone(),
            args: vec!["-d".to_string(), dist.clone()],
            label: dist,
        })
        .collect()
}

pub fn resolve_default_shell() -> ShellInfo {
    resolve_pwsh()
        .or_else(resolve_windows_powershell)
        .unwrap_or_else(resolve_cmd)
}

pub fn list_shells() -> Vec<ShellInfo> {
    let mut shells = Vec::new();

    if let Some(pwsh) = resolve_pwsh() {
        shells.push(pwsh);
    }
    if let Some(ps) = resolve_windows_powershell() {
        shells.push(ps);
    }
    shells.push(resolve_cmd());
    shells.extend(list_wsl_distributions());

    shells
}
