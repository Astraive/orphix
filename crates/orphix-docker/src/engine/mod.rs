use std::ffi::OsStr;
use std::path::PathBuf;
use std::process::{Command, Output};

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

use crate::DockerError;

#[derive(Debug, Clone)]
pub struct DockerEngine {
    cli: PathBuf,
    env: Vec<(String, String)>,
}

impl DockerEngine {
    pub fn detect() -> Result<Self, DockerError> {
        let mut last_error = None;
        for candidate in platform::cli_candidates() {
            let engine = Self {
                cli: candidate,
                env: platform::engine_env(),
            };

            match engine.output(["version", "--format", "{{.Server.Version}}"]) {
                Ok(output) if output.status.success() => return Ok(engine),
                Ok(output) => last_error = Some(command_error(&output)),
                Err(error) => last_error = Some(error),
            }
        }

        Err(last_error.unwrap_or(DockerError::NotFound))
    }

    pub fn run<I, S>(&self, args: I) -> Result<String, DockerError>
    where
        I: IntoIterator<Item = S>,
        S: AsRef<OsStr>,
    {
        let output = self.output(args)?;
        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(command_error(&output))
        }
    }

    pub fn spawn_command(&self) -> Command {
        let mut command = Command::new(&self.cli);
        for (key, value) in &self.env {
            command.env(key, value);
        }
        command
    }

    fn output<I, S>(&self, args: I) -> Result<Output, DockerError>
    where
        I: IntoIterator<Item = S>,
        S: AsRef<OsStr>,
    {
        let mut command = self.spawn_command();
        command.args(args);
        command.output().map_err(|error| {
            if error.kind() == std::io::ErrorKind::NotFound {
                DockerError::NotFound
            } else {
                DockerError::Command(error.to_string())
            }
        })
    }
}

fn command_error(output: &Output) -> DockerError {
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let message = if stderr.is_empty() { stdout } else { stderr };

    if message.contains("Cannot connect to the Docker daemon")
        || message.contains("error during connect")
        || message.contains("daemon is not running")
        || message.contains("docker daemon")
    {
        DockerError::EngineUnavailable(message)
    } else if message.is_empty() {
        DockerError::Command(format!("docker exited with status {}", output.status))
    } else {
        DockerError::Command(message)
    }
}
