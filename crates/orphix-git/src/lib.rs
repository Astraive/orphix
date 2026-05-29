use serde::{Deserialize, Serialize};

mod platform;

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStash {
    pub index: usize,
    pub name: String,
    pub message: String,
}

fn run_git(cwd: &str, args: &[&str]) -> bool {
    platform::command()
        .args(args)
        .current_dir(cwd)
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Get git status for a directory
pub fn status(cwd: &str) -> Option<GitStatus> {
    let output = platform::command()
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
            ahead = parts
                .first()
                .and_then(|s| s.trim_start_matches('+').parse::<i32>().ok())
                .unwrap_or(0);
            behind = parts
                .get(1)
                .and_then(|s| s.trim_start_matches('-').parse::<i32>().ok())
                .unwrap_or(0);
        } else if let Some(path) = line.strip_prefix("? ") {
            let path = path.trim().to_string();
            if !path.is_empty() {
                files.push(GitFile {
                    path,
                    status: "??".to_string(),
                    staged: false,
                });
            }
        } else if line.starts_with("1 ") || line.starts_with("2 ") || line.starts_with("u ") {
            if let Some((xy, path)) = parse_porcelain_v2_file_line(line) {
                push_status_entries(&mut files, xy, path);
            }
        }
    }

    Some(GitStatus {
        branch,
        files,
        ahead,
        behind,
    })
}

fn parse_porcelain_v2_file_line(line: &str) -> Option<(&str, String)> {
    let mut parts = line.split_whitespace();
    let record_type = parts.next()?;
    let xy = parts.next()?;

    if xy.len() != 2 {
        return None;
    }

    let field_count_before_path = match record_type {
        "1" => 6,
        "2" => 7,
        "u" => 9,
        _ => return None,
    };

    for _ in 0..field_count_before_path {
        parts.next()?;
    }

    let path = parts.collect::<Vec<_>>().join(" ");
    if path.is_empty() {
        None
    } else {
        Some((xy, path))
    }
}

fn push_status_entries(files: &mut Vec<GitFile>, xy: &str, path: String) {
    let mut chars = xy.chars();
    let x = chars.next().unwrap_or(' ');
    let y = chars.next().unwrap_or(' ');

    if x != ' ' && x != '.' && x != '?' {
        files.push(GitFile {
            path: path.clone(),
            status: x.to_string(),
            staged: true,
        });
    }
    if y != ' ' && y != '.' && y != '?' {
        files.push(GitFile {
            path,
            status: y.to_string(),
            staged: false,
        });
    }
}

/// Get list of branches
pub fn branches(cwd: &str) -> Vec<GitBranch> {
    let output = match platform::command()
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
            GitBranch {
                name,
                is_current,
                is_remote,
            }
        })
        .collect()
}

/// Checkout a branch
pub fn checkout(cwd: &str, branch: &str) -> bool {
    run_git(cwd, &["checkout", branch])
}

/// Get diff for a file
pub fn diff(cwd: &str, file: &str) -> String {
    platform::command()
        .args(["diff", "--", file])
        .current_dir(cwd)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
        .unwrap_or_default()
}

/// Stage files
pub fn stage(cwd: &str, files: &[String]) -> bool {
    let mut cmd = platform::command();
    cmd.arg("add").current_dir(cwd);
    for f in files {
        cmd.arg(f);
    }
    cmd.status().map(|s| s.success()).unwrap_or(false)
}

/// Unstage files
pub fn unstage(cwd: &str, files: &[String]) -> bool {
    let mut cmd = platform::command();
    cmd.args(["reset", "HEAD", "--"]).current_dir(cwd);
    for f in files {
        cmd.arg(f);
    }
    cmd.status().map(|s| s.success()).unwrap_or(false)
}

/// Create a commit
pub fn commit(cwd: &str, message: &str) -> bool {
    run_git(cwd, &["commit", "-m", message])
}

pub fn fetch(cwd: &str) -> bool {
    run_git(cwd, &["fetch", "--all", "--prune"])
}

pub fn pull(cwd: &str) -> bool {
    run_git(cwd, &["pull", "--ff-only"])
}

pub fn push(cwd: &str) -> bool {
    run_git(cwd, &["push"])
}

pub fn sync(cwd: &str) -> bool {
    pull(cwd) && push(cwd)
}

pub fn stage_all(cwd: &str) -> bool {
    run_git(cwd, &["add", "-A"])
}

pub fn unstage_all(cwd: &str) -> bool {
    run_git(cwd, &["reset", "HEAD", "--"])
}

pub fn discard(cwd: &str, files: &[String]) -> bool {
    if files.is_empty() {
        return true;
    }

    let mut restore_cmd = platform::command();
    restore_cmd
        .args(["restore", "--staged", "--worktree", "--"])
        .current_dir(cwd);
    for file in files {
        restore_cmd.arg(file);
    }

    let restored = restore_cmd.status().map(|s| s.success()).unwrap_or(false);

    let mut clean_cmd = platform::command();
    clean_cmd.args(["clean", "-f", "--"]).current_dir(cwd);
    for file in files {
        clean_cmd.arg(file);
    }
    let cleaned = clean_cmd.status().map(|s| s.success()).unwrap_or(false);

    restored || cleaned
}

pub fn discard_all(cwd: &str) -> bool {
    run_git(cwd, &["reset", "--hard", "HEAD"]) && run_git(cwd, &["clean", "-fd"])
}

pub fn stash_push(cwd: &str, message: Option<&str>) -> bool {
    match message {
        Some(message) if !message.trim().is_empty() => {
            run_git(cwd, &["stash", "push", "-u", "-m", message])
        }
        _ => run_git(cwd, &["stash", "push", "-u"]),
    }
}

pub fn stash_pop(cwd: &str) -> bool {
    run_git(cwd, &["stash", "pop"])
}

pub fn stash_apply(cwd: &str, stash: &str) -> bool {
    run_git(cwd, &["stash", "apply", stash])
}

pub fn stash_drop(cwd: &str, stash: &str) -> bool {
    run_git(cwd, &["stash", "drop", stash])
}

pub fn stash_list(cwd: &str) -> Vec<GitStash> {
    let output = match platform::command()
        .args(["stash", "list", "--format=%gd%x00%s"])
        .current_dir(cwd)
        .output()
    {
        Ok(o) if o.status.success() => o,
        _ => return Vec::new(),
    };

    String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter_map(|line| {
            let (name, message) = line.split_once('\0')?;
            let index = name
                .strip_prefix("stash@{")
                .and_then(|value| value.strip_suffix('}'))
                .and_then(|value| value.parse::<usize>().ok())
                .unwrap_or(0);
            Some(GitStash {
                index,
                name: name.to_string(),
                message: message.to_string(),
            })
        })
        .collect()
}
