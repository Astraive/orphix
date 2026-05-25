use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatus {
    pub branch: Option<String>,
    pub files: Vec<GitFile>,
    pub ahead: i32,
    pub behind: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitFile {
    pub path: String,
    pub status: String,
    pub staged: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitBranch {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
}

/// Get git status for a directory
pub fn status(cwd: &str) -> Option<GitStatus> {
    let output = Command::new("git")
        .args(["status", "--porcelain=2", "--branch"])
        .current_dir(cwd)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut branch = None;
    let mut ahead = 0;
    let mut behind = 0;
    let mut files = Vec::new();

    for line in stdout.lines() {
        if line.starts_with("# branch.head ") {
            branch = Some(line[14..].trim().to_string());
        } else if line.starts_with("# branch.ab ") {
            let parts: Vec<&str> = line[12..].trim().split(' ').collect();
            ahead = parts.first().and_then(|s| s.parse().ok()).unwrap_or(0);
            behind = parts.get(1).and_then(|s| s.trim_start_matches('-').parse::<i32>().ok()).unwrap_or(0);
        } else if line.len() > 2 {
            let xy = &line[..2];
            let path = line[3..].trim().to_string();
            if path.is_empty() { continue; }

            if xy == "??" {
                files.push(GitFile { path, status: "??".to_string(), staged: false });
            } else {
                let x = xy.as_bytes()[0] as char;
                let y = xy.as_bytes()[1] as char;
                if x != ' ' && x != '?' {
                    files.push(GitFile { path: path.clone(), status: x.to_string(), staged: true });
                }
                if y != ' ' && y != '?' {
                    files.push(GitFile { path, status: y.to_string(), staged: false });
                }
            }
        }
    }

    Some(GitStatus { branch, files, ahead, behind })
}

/// Get list of branches
pub fn branches(cwd: &str) -> Vec<GitBranch> {
    let output = match Command::new("git")
        .args(["branch", "-a", "--format=%(refname:short)%(HEAD)"])
        .current_dir(cwd)
        .output()
    {
        Ok(o) if o.status.success() => o,
        _ => return Vec::new(),
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|line| {
            let is_current = line.ends_with('*');
            let name = line.replace('*', "").trim().to_string();
            let is_remote = name.starts_with("origin/") || name.starts_with("remotes/");
            GitBranch { name, is_current, is_remote }
        })
        .collect()
}

/// Checkout a branch
pub fn checkout(cwd: &str, branch: &str) -> bool {
    Command::new("git")
        .args(["checkout", branch])
        .current_dir(cwd)
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Get diff for a file
pub fn diff(cwd: &str, file: &str) -> String {
    Command::new("git")
        .args(["diff", "--", file])
        .current_dir(cwd)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
        .unwrap_or_default()
}

/// Stage files
pub fn stage(cwd: &str, files: &[String]) -> bool {
    let mut cmd = Command::new("git");
    cmd.arg("add").current_dir(cwd);
    for f in files {
        cmd.arg(f);
    }
    cmd.status().map(|s| s.success()).unwrap_or(false)
}

/// Unstage files
pub fn unstage(cwd: &str, files: &[String]) -> bool {
    let mut cmd = Command::new("git");
    cmd.args(["reset", "HEAD", "--"]).current_dir(cwd);
    for f in files {
        cmd.arg(f);
    }
    cmd.status().map(|s| s.success()).unwrap_or(false)
}

/// Create a commit
pub fn commit(cwd: &str, message: &str) -> bool {
    Command::new("git")
        .args(["commit", "-m", message])
        .current_dir(cwd)
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}
