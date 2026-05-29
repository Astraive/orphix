use std::path::PathBuf;

pub fn cli_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Ok(cli) = std::env::var("DOCKER_CLI") {
        candidates.push(PathBuf::from(cli));
    }

    candidates.push(PathBuf::from("docker"));
    candidates.push(PathBuf::from("/usr/local/bin/docker"));
    candidates.push(PathBuf::from("/opt/homebrew/bin/docker"));
    candidates.push(PathBuf::from(
        "/Applications/Docker.app/Contents/Resources/bin/docker",
    ));

    candidates
}

pub fn engine_env() -> Vec<(String, String)> {
    Vec::new()
}
