// ── Docker Container ──

export type DockerContainerState =
  | "running"
  | "exited"
  | "created"
  | "paused"
  | "restarting"
  | "removing"
  | "dead"
  | "unknown";

export interface DockerPort {
  private: number;
  public: number | null;
  type: string;
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  state: DockerContainerState;
  status: string;
  ports: DockerPort[];
  created: string;
  size: string;
  command: string;
}

// ── Docker Image ──

export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: string;
  created: string;
}

// ── Docker Workspace ──

export type DockerWorkspaceFileKind =
  | "dockerfile"
  | "compose"
  | "ignore"
  | "env"
  | "script"
  | "other";

export interface DockerWorkspaceFile {
  path: string;
  name: string;
  kind: DockerWorkspaceFileKind;
  size: number;
  modified: string;
}

export interface DockerWorkspaceOption {
  id: string;
  label: string;
  description: string;
  command: string;
  cwd: string;
  kind: "compose" | "build" | "run" | "logs" | "shell" | "cleanup";
  file?: string;
}

export interface DockerWorkspaceSummary {
  cwd: string;
  files: DockerWorkspaceFile[];
  options: DockerWorkspaceOption[];
  composeFiles: string[];
  dockerfiles: string[];
}

// ── Docker Logs ──

export interface DockerLogLine {
  containerId?: string;
  timestamp: string | null;
  text: string;
  stream: "stdout" | "stderr";
}

// ── Docker Stats ──

export interface DockerStats {
  containerId: string;
  name: string;
  cpu: string;
  memory: string;
  memoryUsage: string;
  memoryLimit?: string;
  netIO: string;
  blockIO: string;
  pids: string;
}

// ── Docker Compose ──

export interface DockerComposeService {
  name: string;
  image: string;
  state: string;
  ports: string[];
  status: string;
}

export interface DockerComposeProject {
  name: string;
  services: DockerComposeService[];
  status: string;
  configFiles: string;
}

// ── Docker Inspect ──

export interface DockerInspect {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  created: string;
  startedAt: string;
  finishedAt: string;
  ports: DockerPort[];
  env: string[];
  mounts: Array<{
    type: string;
    source: string;
    destination: string;
    mode: string;
  }>;
  networks: string[];
  labels: Record<string, string>;
  raw: string;
}
