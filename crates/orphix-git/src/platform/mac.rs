use std::path::PathBuf;

pub fn git_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Ok(git) = std::env::var("GIT") {
        candidates.push(PathBuf::from(git));
    }

    candidates.push(PathBuf::from("git"));
    candidates.push(PathBuf::from("/usr/bin/git"));
    candidates.push(PathBuf::from("/usr/local/bin/git"));
    candidates.push(PathBuf::from("/opt/homebrew/bin/git"));

    candidates
}
