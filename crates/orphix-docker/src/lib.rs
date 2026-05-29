mod engine;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use std::fmt;
use std::fs;
use std::path::{Path, PathBuf};

pub use engine::DockerEngine;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DockerContainerState {
    Running,
    Exited,
    Created,
    Paused,
    Restarting,
    Removing,
    Dead,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DockerPort {
    pub private: u16,
    pub public: Option<u16>,
    #[serde(rename = "type")]
    pub protocol: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DockerContainer {
    pub id: String,
    pub name: String,
    pub image: String,
    pub state: DockerContainerState,
    pub status: String,
    pub ports: Vec<DockerPort>,
    pub created: String,
    pub size: String,
    pub command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DockerImage {
    pub id: String,
    pub repository: String,
    pub tag: String,
    pub size: String,
    pub created: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DockerInspect {
    pub id: String,
    pub name: String,
    pub image: String,
    pub state: DockerContainerState,
    pub status: String,
    pub created: String,
    #[serde(rename = "startedAt")]
    pub started_at: String,
    #[serde(rename = "finishedAt")]
    pub finished_at: String,
    pub ports: Vec<DockerPort>,
    pub env: Vec<String>,
    pub mounts: Vec<DockerMount>,
    pub networks: Vec<String>,
    pub labels: BTreeMap<String, String>,
    pub raw: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DockerMount {
    #[serde(rename = "type")]
    pub mount_type: String,
    pub source: String,
    pub destination: String,
    pub mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DockerStats {
    #[serde(rename = "containerId")]
    pub container_id: String,
    pub name: String,
    pub cpu: String,
    pub memory: String,
    #[serde(rename = "memoryUsage")]
    pub memory_usage: String,
    #[serde(rename = "memoryLimit")]
    pub memory_limit: String,
    #[serde(rename = "netIO")]
    pub net_io: String,
    #[serde(rename = "blockIO")]
    pub block_io: String,
    pub pids: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DockerComposeProject {
    pub name: String,
    pub services: Vec<DockerComposeService>,
    pub status: String,
    #[serde(rename = "configFiles")]
    pub config_files: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DockerComposeService {
    pub name: String,
    pub image: String,
    pub state: String,
    pub ports: Vec<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DockerWorkspaceFileKind {
    Dockerfile,
    Compose,
    Ignore,
    Env,
    Script,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DockerWorkspaceFile {
    pub path: String,
    pub name: String,
    pub kind: DockerWorkspaceFileKind,
    pub size: u64,
    pub modified: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DockerWorkspaceOption {
    pub id: String,
    pub label: String,
    pub description: String,
    pub command: String,
    pub cwd: String,
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DockerWorkspaceSummary {
    pub cwd: String,
    pub files: Vec<DockerWorkspaceFile>,
    pub options: Vec<DockerWorkspaceOption>,
    #[serde(rename = "composeFiles")]
    pub compose_files: Vec<String>,
    pub dockerfiles: Vec<String>,
}

const MAX_DISCOVERY_DEPTH: usize = 4;
const MAX_DISCOVERY_FILES: usize = 300;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DockerError {
    NotFound,
    EngineUnavailable(String),
    Command(String),
    Parse(String),
}

impl fmt::Display for DockerError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotFound => write!(f, "Docker CLI was not found"),
            Self::EngineUnavailable(message) => {
                write!(f, "Docker engine is unavailable: {message}")
            }
            Self::Command(message) => write!(f, "{message}"),
            Self::Parse(message) => write!(f, "Failed to parse Docker output: {message}"),
        }
    }
}

impl std::error::Error for DockerError {}

pub struct DockerClient {
    engine: DockerEngine,
}

impl DockerClient {
    pub fn connect() -> Result<Self, DockerError> {
        Ok(Self {
            engine: DockerEngine::detect()?,
        })
    }

    pub fn check_available() -> bool {
        DockerEngine::detect().is_ok()
    }

    pub fn ps(&self, all: bool) -> Result<Vec<DockerContainer>, DockerError> {
        let mut args = vec!["ps", "--format", "json"];
        if all {
            args.push("-a");
        }
        let raw = self.engine.run(args)?;
        parse_ndjson(&raw, parse_container)
    }

    pub fn start(&self, id: &str) -> Result<(), DockerError> {
        self.engine.run(["start", id]).map(|_| ())
    }

    pub fn stop(&self, id: &str) -> Result<(), DockerError> {
        self.engine.run(["stop", id]).map(|_| ())
    }

    pub fn restart(&self, id: &str) -> Result<(), DockerError> {
        self.engine.run(["restart", id]).map(|_| ())
    }

    pub fn remove(&self, id: &str, force: bool) -> Result<(), DockerError> {
        let mut args = vec!["rm"];
        if force {
            args.push("-f");
        }
        args.push(id);
        self.engine.run(args).map(|_| ())
    }

    pub fn logs(&self, id: &str, tail: u32) -> Result<String, DockerError> {
        self.engine
            .run(["logs", "--tail", &tail.to_string(), "--timestamps", id])
    }

    pub fn inspect(&self, id: &str) -> Result<DockerInspect, DockerError> {
        let raw = self.engine.run(["inspect", id])?;
        let values: Vec<Value> =
            serde_json::from_str(&raw).map_err(|error| DockerError::Parse(error.to_string()))?;
        let value = values.into_iter().next().unwrap_or(Value::Null);
        parse_inspect(value)
    }

    pub fn images(&self) -> Result<Vec<DockerImage>, DockerError> {
        let raw = self.engine.run(["images", "--format", "json"])?;
        parse_ndjson(&raw, parse_image)
    }

    pub fn remove_image(&self, id: &str, force: bool) -> Result<(), DockerError> {
        let mut args = vec!["rmi"];
        if force {
            args.push("-f");
        }
        args.push(id);
        self.engine.run(args).map(|_| ())
    }

    pub fn build(
        &self,
        context: &str,
        tag: Option<&str>,
        dockerfile: Option<&str>,
    ) -> Result<String, DockerError> {
        let mut args = vec!["build"];
        if let Some(tag) = tag {
            args.extend(["-t", tag]);
        }
        if let Some(dockerfile) = dockerfile {
            args.extend(["-f", dockerfile]);
        }
        args.push(context);
        self.engine.run(args)
    }

    pub fn pull(&self, image: &str) -> Result<String, DockerError> {
        self.engine.run(["pull", image])
    }

    pub fn compose_ps(
        &self,
        cwd: Option<&str>,
    ) -> Result<Option<DockerComposeProject>, DockerError> {
        let mut command = self.engine.spawn_command();
        command.args(["compose", "ps", "--format", "json"]);
        if let Some(cwd) = cwd {
            command.current_dir(cwd);
        }

        let output = command
            .output()
            .map_err(|error| DockerError::Command(error.to_string()))?;
        if !output.status.success() {
            return Ok(None);
        }

        let raw = String::from_utf8_lossy(&output.stdout);
        let services = parse_ndjson(&raw, parse_compose_service)?;
        let status = if services.iter().any(|service| service.state == "running") {
            "running"
        } else {
            "stopped"
        };
        let name = services
            .first()
            .map(|service| {
                service
                    .name
                    .split('-')
                    .next()
                    .unwrap_or("compose")
                    .to_string()
            })
            .unwrap_or_else(|| "compose".to_string());

        Ok(Some(DockerComposeProject {
            name,
            services,
            status: status.to_string(),
            config_files: String::new(),
        }))
    }

    pub fn compose_up(&self, cwd: Option<&str>, detach: bool) -> Result<String, DockerError> {
        self.run_compose(cwd, if detach { &["up", "-d"] } else { &["up"] })
    }

    pub fn compose_down(&self, cwd: Option<&str>) -> Result<String, DockerError> {
        self.run_compose(cwd, &["down"])
    }

    pub fn compose_logs(&self, cwd: Option<&str>, tail: u32) -> Result<String, DockerError> {
        self.run_compose(cwd, &["logs", "--tail", &tail.to_string(), "--timestamps"])
    }

    pub fn stats(&self) -> Result<Vec<DockerStats>, DockerError> {
        let raw = self
            .engine
            .run(["stats", "--no-stream", "--format", "json"])?;
        parse_ndjson(&raw, parse_stats)
    }

    pub fn discover_workspace(&self, cwd: &str) -> Result<DockerWorkspaceSummary, DockerError> {
        discover_workspace(cwd)
    }

    fn run_compose(&self, cwd: Option<&str>, args: &[&str]) -> Result<String, DockerError> {
        let mut command = self.engine.spawn_command();
        command.arg("compose").args(args);
        if let Some(cwd) = cwd {
            command.current_dir(cwd);
        }

        let output = command
            .output()
            .map_err(|error| DockerError::Command(error.to_string()))?;
        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            Err(DockerError::Command(stderr))
        }
    }
}

pub fn check_available() -> bool {
    DockerClient::check_available()
}

pub fn ps(all: bool) -> Result<Vec<DockerContainer>, String> {
    DockerClient::connect()
        .and_then(|client| client.ps(all))
        .map_err(|error| error.to_string())
}

pub fn images() -> Result<Vec<DockerImage>, String> {
    DockerClient::connect()
        .and_then(|client| client.images())
        .map_err(|error| error.to_string())
}

pub fn stats() -> Result<Vec<DockerStats>, String> {
    DockerClient::connect()
        .and_then(|client| client.stats())
        .map_err(|error| error.to_string())
}

pub fn discover_workspace(cwd: &str) -> Result<DockerWorkspaceSummary, DockerError> {
    let root = PathBuf::from(cwd);
    if !root.is_dir() {
        return Err(DockerError::Command(format!(
            "Docker workspace path is not a directory: {cwd}"
        )));
    }

    let mut files = Vec::new();
    discover_docker_files(&root, &root, 0, &mut files);
    files.sort_by(|a, b| {
        format!("{:?}", a.kind)
            .cmp(&format!("{:?}", b.kind))
            .then_with(|| a.path.cmp(&b.path))
    });

    let options = create_workspace_options(cwd, &files);
    let compose_files = files
        .iter()
        .filter(|file| file.kind == DockerWorkspaceFileKind::Compose)
        .map(|file| file.path.clone())
        .collect();
    let dockerfiles = files
        .iter()
        .filter(|file| file.kind == DockerWorkspaceFileKind::Dockerfile)
        .map(|file| file.path.clone())
        .collect();

    Ok(DockerWorkspaceSummary {
        cwd: cwd.to_string(),
        files,
        options,
        compose_files,
        dockerfiles,
    })
}

pub fn discover_workspace_for_app(cwd: &str) -> Result<DockerWorkspaceSummary, String> {
    discover_workspace(cwd).map_err(|error| error.to_string())
}

pub fn inspect(id: &str) -> Result<DockerInspect, String> {
    DockerClient::connect()
        .and_then(|client| client.inspect(id))
        .map_err(|error| error.to_string())
}

pub fn start(id: &str) -> Result<(), String> {
    DockerClient::connect()
        .and_then(|client| client.start(id))
        .map_err(|error| error.to_string())
}

pub fn stop(id: &str) -> Result<(), String> {
    DockerClient::connect()
        .and_then(|client| client.stop(id))
        .map_err(|error| error.to_string())
}

pub fn restart(id: &str) -> Result<(), String> {
    DockerClient::connect()
        .and_then(|client| client.restart(id))
        .map_err(|error| error.to_string())
}

pub fn remove(id: &str, force: bool) -> Result<(), String> {
    DockerClient::connect()
        .and_then(|client| client.remove(id, force))
        .map_err(|error| error.to_string())
}

pub fn logs(id: &str, tail: u32) -> Result<String, String> {
    DockerClient::connect()
        .and_then(|client| client.logs(id, tail))
        .map_err(|error| error.to_string())
}

pub fn remove_image(id: &str, force: bool) -> Result<(), String> {
    DockerClient::connect()
        .and_then(|client| client.remove_image(id, force))
        .map_err(|error| error.to_string())
}

pub fn build(context: &str, tag: Option<&str>, dockerfile: Option<&str>) -> Result<String, String> {
    DockerClient::connect()
        .and_then(|client| client.build(context, tag, dockerfile))
        .map_err(|error| error.to_string())
}

pub fn pull(image: &str) -> Result<String, String> {
    DockerClient::connect()
        .and_then(|client| client.pull(image))
        .map_err(|error| error.to_string())
}

pub fn compose_ps(cwd: Option<&str>) -> Result<Option<DockerComposeProject>, String> {
    DockerClient::connect()
        .and_then(|client| client.compose_ps(cwd))
        .map_err(|error| error.to_string())
}

pub fn compose_up(cwd: Option<&str>, detach: bool) -> Result<String, String> {
    DockerClient::connect()
        .and_then(|client| client.compose_up(cwd, detach))
        .map_err(|error| error.to_string())
}

pub fn compose_down(cwd: Option<&str>) -> Result<String, String> {
    DockerClient::connect()
        .and_then(|client| client.compose_down(cwd))
        .map_err(|error| error.to_string())
}

pub fn compose_logs(cwd: Option<&str>, tail: u32) -> Result<String, String> {
    DockerClient::connect()
        .and_then(|client| client.compose_logs(cwd, tail))
        .map_err(|error| error.to_string())
}

fn discover_docker_files(
    root: &Path,
    dir: &Path,
    depth: usize,
    result: &mut Vec<DockerWorkspaceFile>,
) {
    if depth > MAX_DISCOVERY_DEPTH || result.len() >= MAX_DISCOVERY_FILES {
        return;
    }

    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };

    for entry in entries.flatten() {
        if result.len() >= MAX_DISCOVERY_FILES {
            return;
        }

        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let Ok(file_type) = entry.file_type() else {
            continue;
        };

        if file_type.is_dir() {
            if !should_skip_dir(&name) {
                discover_docker_files(root, &path, depth + 1, result);
            }
            continue;
        }

        if !file_type.is_file() {
            continue;
        }

        let Some(kind) = classify_docker_file(&name) else {
            continue;
        };

        let (size, modified) = entry
            .metadata()
            .map(|metadata| {
                let modified = metadata
                    .modified()
                    .ok()
                    .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|duration| duration.as_secs().to_string())
                    .unwrap_or_default();
                (metadata.len(), modified)
            })
            .unwrap_or_default();

        result.push(DockerWorkspaceFile {
            path: relative_path(root, &path),
            name,
            kind,
            size,
            modified,
        });
    }
}

fn should_skip_dir(name: &str) -> bool {
    matches!(
        name,
        ".git" | ".turbo" | "node_modules" | "target" | "dist" | "out" | "build" | ".next"
    )
}

fn classify_docker_file(name: &str) -> Option<DockerWorkspaceFileKind> {
    let lower = name.to_ascii_lowercase();
    if lower == "dockerfile" || lower.starts_with("dockerfile.") {
        return Some(DockerWorkspaceFileKind::Dockerfile);
    }
    if lower == "compose.yaml"
        || lower == "compose.yml"
        || lower == "docker-compose.yaml"
        || lower == "docker-compose.yml"
        || (lower.starts_with("docker-compose.")
            && (lower.ends_with(".yaml") || lower.ends_with(".yml")))
    {
        return Some(DockerWorkspaceFileKind::Compose);
    }
    if lower == ".dockerignore" {
        return Some(DockerWorkspaceFileKind::Ignore);
    }
    if lower == ".env" || lower.starts_with(".env.") {
        return Some(DockerWorkspaceFileKind::Env);
    }
    if lower.contains("docker")
        && (lower.ends_with(".sh")
            || lower.ends_with(".ps1")
            || lower.ends_with(".cmd")
            || lower.ends_with(".bat")
            || lower.ends_with(".mk")
            || lower == "makefile")
    {
        return Some(DockerWorkspaceFileKind::Script);
    }
    lower
        .contains("docker")
        .then_some(DockerWorkspaceFileKind::Other)
}

fn create_workspace_options(cwd: &str, files: &[DockerWorkspaceFile]) -> Vec<DockerWorkspaceOption> {
    let mut options = Vec::new();
    for file in files
        .iter()
        .filter(|file| file.kind == DockerWorkspaceFileKind::Compose)
    {
        let name = Path::new(&file.path)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or(&file.path);
        options.push(workspace_option(
            format!("compose-up:{}", file.path),
            format!("Compose up: {name}"),
            "Start services from this compose file",
            format!("docker compose -f \"{}\" up -d", file.path),
            cwd,
            "compose",
            Some(file.path.clone()),
        ));
        options.push(workspace_option(
            format!("compose-down:{}", file.path),
            format!("Compose down: {name}"),
            "Stop and remove services from this compose file",
            format!("docker compose -f \"{}\" down", file.path),
            cwd,
            "compose",
            Some(file.path.clone()),
        ));
        options.push(workspace_option(
            format!("compose-logs:{}", file.path),
            format!("Compose logs: {name}"),
            "Follow service logs for this compose file",
            format!("docker compose -f \"{}\" logs -f --tail 200", file.path),
            cwd,
            "logs",
            Some(file.path.clone()),
        ));
    }

    for file in files
        .iter()
        .filter(|file| file.kind == DockerWorkspaceFileKind::Dockerfile)
    {
        let tag = Path::new(cwd)
            .file_name()
            .and_then(|name| name.to_str())
            .map(sanitize_tag)
            .filter(|tag| !tag.is_empty())
            .unwrap_or_else(|| "local-image".to_string());
        options.push(workspace_option(
            format!("build:{}", file.path),
            format!("Build: {}", file.path),
            format!("Build an image from {}", file.path),
            format!("docker build -f \"{}\" -t {tag}:latest .", file.path),
            cwd,
            "build",
            Some(file.path.clone()),
        ));
    }

    options.extend([
        workspace_option("system-ps-all", "Show all containers", "List running and stopped containers", "docker ps -a", cwd, "run", None),
        workspace_option("system-images", "Show all images", "List local Docker images", "docker images", cwd, "run", None),
        workspace_option("system-volumes", "Show all volumes", "List Docker volumes", "docker volume ls", cwd, "run", None),
        workspace_option("system-networks", "Show all networks", "List Docker networks", "docker network ls", cwd, "run", None),
        workspace_option("system-contexts", "Show Docker contexts", "List Docker contexts and the active engine endpoint", "docker context ls", cwd, "run", None),
        workspace_option("system-usage", "Show disk usage", "Show Docker disk usage by images, containers, volumes, and cache", "docker system df", cwd, "run", None),
        workspace_option("system-prune", "Prune unused resources", "Open a terminal with a safe Docker prune prompt", "docker system df && docker system prune", cwd, "cleanup", None),
    ]);
    options
}

fn workspace_option(
    id: impl Into<String>,
    label: impl Into<String>,
    description: impl Into<String>,
    command: impl Into<String>,
    cwd: &str,
    kind: impl Into<String>,
    file: Option<String>,
) -> DockerWorkspaceOption {
    DockerWorkspaceOption {
        id: id.into(),
        label: label.into(),
        description: description.into(),
        command: command.into(),
        cwd: cwd.to_string(),
        kind: kind.into(),
        file,
    }
}

fn relative_path(root: &Path, path: &Path) -> String {
    path.strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', std::path::MAIN_SEPARATOR_STR)
}

fn sanitize_tag(value: &str) -> String {
    value
        .to_ascii_lowercase()
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '_' || ch == '.' || ch == '-' {
                ch
            } else {
                '-'
            }
        })
        .collect()
}

fn parse_ndjson<T>(
    raw: &str,
    parse: impl Fn(Value) -> Result<T, DockerError>,
) -> Result<Vec<T>, DockerError> {
    raw.lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(|line| {
            let value = serde_json::from_str(line)
                .map_err(|error| DockerError::Parse(error.to_string()))?;
            parse(value)
        })
        .collect()
}

fn parse_container(value: Value) -> Result<DockerContainer, DockerError> {
    Ok(DockerContainer {
        id: string_field(&value, &["ID", "id"]),
        name: string_field(&value, &["Names", "names", "Name"]),
        image: string_field(&value, &["Image", "image"]),
        state: parse_state(&string_field(&value, &["State", "state"])),
        status: string_field(&value, &["Status", "status"]),
        ports: parse_ports(&string_field(&value, &["Ports", "ports"])),
        created: string_field(&value, &["CreatedAt", "Created", "created"]),
        size: string_field(&value, &["Size", "size"]),
        command: string_field(&value, &["Command", "command"]),
    })
}

fn parse_image(value: Value) -> Result<DockerImage, DockerError> {
    Ok(DockerImage {
        id: string_field(&value, &["ID", "id"]),
        repository: default_string_field(&value, &["Repository", "repository"], "<none>"),
        tag: default_string_field(&value, &["Tag", "tag"], "<none>"),
        size: string_field(&value, &["Size", "size"]),
        created: string_field(&value, &["CreatedSince", "CreatedAt", "created"]),
    })
}

fn parse_inspect(value: Value) -> Result<DockerInspect, DockerError> {
    let state = value.get("State").unwrap_or(&Value::Null);
    let host_config = value.get("HostConfig").unwrap_or(&Value::Null);
    let config = value.get("Config").unwrap_or(&Value::Null);
    let network_settings = value.get("NetworkSettings").unwrap_or(&Value::Null);

    let ports = host_config
        .get("PortBindings")
        .and_then(Value::as_object)
        .map(|bindings| {
            bindings
                .iter()
                .flat_map(|(container_port, host_bindings)| {
                    parse_port_bindings(container_port, host_bindings)
                })
                .collect()
        })
        .unwrap_or_default();

    let mounts = value
        .get("Mounts")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .map(|mount| DockerMount {
                    mount_type: string_field(mount, &["Type"]),
                    source: string_field(mount, &["Source"]),
                    destination: string_field(mount, &["Destination"]),
                    mode: string_field(mount, &["Mode"]),
                })
                .collect()
        })
        .unwrap_or_default();

    let networks = network_settings
        .get("Networks")
        .and_then(Value::as_object)
        .map(|networks| networks.keys().cloned().collect())
        .unwrap_or_default();
    let labels = config
        .get("Labels")
        .and_then(Value::as_object)
        .map(|labels| {
            labels
                .iter()
                .filter_map(|(key, value)| value.as_str().map(|value| (key.clone(), value.to_string())))
                .collect()
        })
        .unwrap_or_default();
    let raw = serde_json::to_string_pretty(&value).unwrap_or_else(|_| value.to_string());

    Ok(DockerInspect {
        id: string_field(&value, &["Id", "ID"]),
        name: string_field(&value, &["Name"])
            .trim_start_matches('/')
            .to_string(),
        image: string_field(config, &["Image"]),
        state: parse_state(&string_field(state, &["Status"])),
        status: string_field(state, &["Status"]),
        created: string_field(&value, &["Created"]),
        started_at: string_field(state, &["StartedAt"]),
        finished_at: string_field(state, &["FinishedAt"]),
        ports,
        env: string_array(config, "Env"),
        mounts,
        networks,
        labels,
        raw,
    })
}

fn parse_compose_service(value: Value) -> Result<DockerComposeService, DockerError> {
    Ok(DockerComposeService {
        name: string_field(&value, &["Name", "Service"]),
        image: string_field(&value, &["Image"]),
        state: string_field(&value, &["State", "Status"]),
        ports: string_field(&value, &["Ports"])
            .split(',')
            .map(str::trim)
            .filter(|port| !port.is_empty())
            .map(ToString::to_string)
            .collect(),
        status: string_field(&value, &["Status"]),
    })
}

fn parse_stats(value: Value) -> Result<DockerStats, DockerError> {
    let (memory_usage, memory_limit) = split_once_field(&string_field(&value, &["MemUsage", "memUsage"]));
    Ok(DockerStats {
        container_id: string_field(&value, &["ID", "id"]),
        name: string_field(&value, &["Name", "name"]),
        cpu: string_field(&value, &["CPUPerc", "cpuPercent", "cpu"]),
        memory: string_field(&value, &["MemPerc", "memPercent", "memory"]),
        memory_usage,
        memory_limit,
        net_io: string_field(&value, &["NetIO", "netIO"]),
        block_io: string_field(&value, &["BlockIO", "blockIO"]),
        pids: string_field(&value, &["PIDs", "pids"]),
    })
}

fn parse_ports(raw: &str) -> Vec<DockerPort> {
    raw.split(',')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .filter_map(parse_port)
        .collect()
}

fn parse_port(raw: &str) -> Option<DockerPort> {
    let (left, right) = raw
        .rsplit_once("->")
        .map_or((None, raw), |(left, right)| (Some(left), right));
    let (private, protocol) = right.rsplit_once('/')?;
    let public = left
        .and_then(|host| host.rsplit(':').next())
        .and_then(parse_u16);

    Some(DockerPort {
        private: parse_u16(private)?,
        public,
        protocol: protocol.to_string(),
    })
}

fn parse_port_bindings(container_port: &str, host_bindings: &Value) -> Vec<DockerPort> {
    let Some((private, protocol)) = container_port.rsplit_once('/') else {
        return Vec::new();
    };
    let Some(private) = parse_u16(private) else {
        return Vec::new();
    };

    host_bindings
        .as_array()
        .map(|bindings| {
            bindings
                .iter()
                .map(|binding| DockerPort {
                    private,
                    public: binding
                        .get("HostPort")
                        .and_then(Value::as_str)
                        .and_then(parse_u16),
                    protocol: protocol.to_string(),
                })
                .collect()
        })
        .unwrap_or_else(|| {
            vec![DockerPort {
                private,
                public: None,
                protocol: protocol.to_string(),
            }]
        })
}

fn parse_state(raw: &str) -> DockerContainerState {
    match raw.to_ascii_lowercase().as_str() {
        "running" => DockerContainerState::Running,
        "exited" => DockerContainerState::Exited,
        "created" => DockerContainerState::Created,
        "paused" => DockerContainerState::Paused,
        "restarting" => DockerContainerState::Restarting,
        "removing" => DockerContainerState::Removing,
        "dead" => DockerContainerState::Dead,
        _ => DockerContainerState::Unknown,
    }
}

fn string_field(value: &Value, keys: &[&str]) -> String {
    default_string_field(value, keys, "")
}

fn default_string_field(value: &Value, keys: &[&str], default: &str) -> String {
    keys.iter()
        .find_map(|key| value.get(key))
        .and_then(|value| {
            value
                .as_str()
                .map(ToString::to_string)
                .or_else(|| value.as_i64().map(|number| number.to_string()))
                .or_else(|| value.as_u64().map(|number| number.to_string()))
        })
        .unwrap_or_else(|| default.to_string())
}

fn string_array(value: &Value, key: &str) -> Vec<String> {
    value
        .get(key)
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .map(ToString::to_string)
                .collect()
        })
        .unwrap_or_default()
}

fn parse_u16(value: &str) -> Option<u16> {
    value.trim().parse::<u16>().ok()
}

fn split_once_field(value: &str) -> (String, String) {
    value
        .split_once(" / ")
        .map(|(left, right)| (left.to_string(), right.to_string()))
        .unwrap_or_else(|| (value.to_string(), String::new()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_container_ndjson_with_windows_style_host_port() {
        let raw = r#"{"ID":"abc123","Names":"web","Image":"nginx","State":"running","Status":"Up 2 minutes","Ports":"127.0.0.1:8080->80/tcp, 443/tcp","CreatedAt":"2026-05-25","Size":"0B","Command":"nginx"}"#;

        let containers = parse_ndjson(raw, parse_container).unwrap();

        assert_eq!(containers[0].state, DockerContainerState::Running);
        assert_eq!(
            containers[0].ports,
            vec![
                DockerPort {
                    private: 80,
                    public: Some(8080),
                    protocol: "tcp".to_string()
                },
                DockerPort {
                    private: 443,
                    public: None,
                    protocol: "tcp".to_string()
                }
            ]
        );
    }

    #[test]
    fn parses_stats_memory_into_usage_and_limit() {
        let raw = r#"{"ID":"abc123","Name":"web","CPUPerc":"0.10%","MemUsage":"10MiB / 1GiB","MemPerc":"1.00%","NetIO":"1kB / 2kB","BlockIO":"0B / 0B","PIDs":"2"}"#;

        let stats = parse_ndjson(raw, parse_stats).unwrap();

        assert_eq!(stats[0].memory_usage, "10MiB");
        assert_eq!(stats[0].memory_limit, "1GiB");
        assert_eq!(stats[0].memory, "1.00%");
    }

    #[test]
    fn discovers_workspace_docker_files_and_options() {
        let root = std::env::temp_dir().join(format!(
            "orphix-docker-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(root.join("scripts")).unwrap();
        std::fs::create_dir_all(root.join("node_modules")).unwrap();
        std::fs::write(root.join("Dockerfile"), "FROM alpine\n").unwrap();
        std::fs::write(root.join("compose.yaml"), "services:\n  app:\n    image: alpine\n").unwrap();
        std::fs::write(root.join(".dockerignore"), "node_modules\n").unwrap();
        std::fs::write(root.join("scripts").join("docker-clean.ps1"), "docker system df\n").unwrap();
        std::fs::write(root.join("node_modules").join("Dockerfile"), "FROM scratch\n").unwrap();

        let workspace = discover_workspace(root.to_str().unwrap()).unwrap();
        let paths: Vec<_> = workspace.files.iter().map(|file| file.path.as_str()).collect();

        assert!(paths.contains(&"Dockerfile"));
        assert!(paths.contains(&"compose.yaml"));
        assert!(paths.contains(&".dockerignore"));
        assert!(paths.iter().any(|path| path.ends_with("docker-clean.ps1")));
        assert!(!paths.iter().any(|path| path.contains("node_modules")));
        assert!(workspace
            .options
            .iter()
            .any(|option| option.command == "docker volume ls"));
        assert!(workspace
            .options
            .iter()
            .any(|option| option.command == "docker network ls"));
        assert!(workspace
            .options
            .iter()
            .any(|option| option.command == "docker system df"));

        std::fs::remove_dir_all(root).unwrap();
    }
}
