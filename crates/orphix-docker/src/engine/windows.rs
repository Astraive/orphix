use std::path::PathBuf;

pub fn cli_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Ok(cli) = std::env::var("DOCKER_CLI") {
        candidates.push(PathBuf::from(cli));
    }

    candidates.push(PathBuf::from("docker.exe"));
    candidates.push(PathBuf::from("docker"));

    if let Ok(program_files) = std::env::var("ProgramFiles") {
        candidates
            .push(PathBuf::from(program_files).join("Docker/Docker/resources/bin/docker.exe"));
    }

    if let Ok(program_files_x86) = std::env::var("ProgramFiles(x86)") {
        candidates
            .push(PathBuf::from(program_files_x86).join("Docker/Docker/resources/bin/docker.exe"));
    }

    candidates
}

pub fn engine_env() -> Vec<(String, String)> {
    if std::env::var_os("DOCKER_HOST").is_some() {
        Vec::new()
    } else {
        vec![(
            "DOCKER_HOST".to_string(),
            "npipe:////./pipe/docker_engine".to_string(),
        )]
    }
}
