use std::path::PathBuf;

pub fn git_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Ok(git) = std::env::var("GIT") {
        candidates.push(PathBuf::from(git));
    }

    candidates.push(PathBuf::from("git.exe"));
    candidates.push(PathBuf::from("git"));

    if let Ok(program_files) = std::env::var("ProgramFiles") {
        candidates.push(PathBuf::from(&program_files).join("Git/cmd/git.exe"));
        candidates.push(PathBuf::from(program_files).join("Git/bin/git.exe"));
    }

    if let Ok(program_files_x86) = std::env::var("ProgramFiles(x86)") {
        candidates.push(PathBuf::from(&program_files_x86).join("Git/cmd/git.exe"));
        candidates.push(PathBuf::from(program_files_x86).join("Git/bin/git.exe"));
    }

    candidates
}
