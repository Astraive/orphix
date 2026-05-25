use std::path::PathBuf;

use super::ShellInfo;

fn path_exists(p: &str) -> bool {
    PathBuf::from(p).exists()
}

fn parse_etc_shells() -> Vec<String> {
    let Ok(content) = std::fs::read_to_string("/etc/shells") else {
        return vec![];
    };
    content
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty() && !l.starts_with('#'))
        .collect()
}

fn list_candidate_shell_paths() -> Vec<String> {
    let mut candidates = Vec::new();
    let mut seen = std::collections::HashSet::new();

    if let Ok(shell) = std::env::var("SHELL") {
        let shell = shell.trim().to_string();
        if !shell.is_empty() && path_exists(&shell) && seen.insert(shell.clone()) {
            candidates.push(shell);
        }
    }

    for shell_path in parse_etc_shells() {
        if path_exists(&shell_path) && seen.insert(shell_path.clone()) {
            candidates.push(shell_path);
        }
    }

    candidates
}

fn shell_info_from_path(shell_path: &str) -> ShellInfo {
    let label = PathBuf::from(shell_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "sh".to_string());

    ShellInfo {
        program: shell_path.to_string(),
        args: vec!["-l".to_string()],
        label,
    }
}

pub fn resolve_default_shell() -> ShellInfo {
    let candidates = list_candidate_shell_paths();
    if candidates.is_empty() {
        for fallback in &["/bin/bash", "/bin/sh", "/usr/bin/sh"] {
            if path_exists(fallback) {
                return shell_info_from_path(fallback);
            }
        }
        return ShellInfo {
            program: "sh".to_string(),
            args: vec!["-l".to_string()],
            label: "sh".to_string(),
        };
    }

    if let Ok(preferred) = std::env::var("SHELL") {
        let preferred = preferred.trim();
        if let Some(found) = candidates.iter().find(|p| p.as_str() == preferred) {
            return shell_info_from_path(found);
        }
    }

    shell_info_from_path(&candidates[0])
}

pub fn list_shells() -> Vec<ShellInfo> {
    list_candidate_shell_paths()
        .iter()
        .map(|p| shell_info_from_path(p))
        .collect()
}
