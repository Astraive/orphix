import { EventEmitter } from "node:events";
import type { CoreClient } from "../app/core-client";
import type {
  DockerContainer,
  DockerImage,
  DockerLogLine,
  DockerStats,
  DockerInspect,
  DockerComposeProject,
  DockerWorkspaceSummary,
} from "../../shared/types/docker";

interface LogFollowState {
  timer: NodeJS.Timeout;
  seen: Set<string>;
}

export class DockerManager extends EventEmitter {
  private logStreams = new Map<string, LogFollowState>();
  private core: CoreClient;

  constructor(core: CoreClient) {
    super();
    this.core = core;
  }

  checkAvailable(): Promise<boolean> {
    return this.core.dockerCheckAvailable();
  }

  ps(all = false): Promise<DockerContainer[]> {
    return this.core.dockerPs(all);
  }

  start(id: string): Promise<void> {
    return this.core.dockerStart(id);
  }

  stop(id: string): Promise<void> {
    return this.core.dockerStop(id);
  }

  restart(id: string): Promise<void> {
    return this.core.dockerRestart(id);
  }

  remove(id: string, force = false): Promise<void> {
    return this.core.dockerRemove(id, force);
  }

  logs(id: string, tail = 100): Promise<string> {
    return this.core.dockerLogs(id, tail);
  }

  async startLogStream(id: string): Promise<void> {
    if (this.logStreams.has(id)) return;

    const state: LogFollowState = {
      seen: new Set(),
      timer: setInterval(() => {
        void this.pollLogs(id);
      }, 1000),
    };
    this.logStreams.set(id, state);
    await this.pollLogs(id);
  }

  stopLogStream(id: string): void {
    const state = this.logStreams.get(id);
    if (!state) return;
    clearInterval(state.timer);
    this.logStreams.delete(id);
  }

  stopAllLogStreams(): void {
    for (const [id, state] of this.logStreams) {
      clearInterval(state.timer);
      this.logStreams.delete(id);
    }
  }

  inspect(id: string): Promise<DockerInspect> {
    return this.core.dockerInspect(id);
  }

  exec(id: string, cmd = "/bin/sh"): Promise<{ shell: string; args: string[] }> {
    return this.core.dockerExec(id, cmd);
  }

  images(): Promise<DockerImage[]> {
    return this.core.dockerImages();
  }

  discoverWorkspace(cwd: string): Promise<DockerWorkspaceSummary> {
    return this.core.dockerDiscoverWorkspace(cwd);
  }

  removeImage(id: string, force = false): Promise<void> {
    return this.core.dockerImageRemove(id, force);
  }

  build(context: string, tag?: string, dockerfile?: string): Promise<string> {
    return this.core.dockerBuild(context, tag, dockerfile);
  }

  pull(image: string): Promise<string> {
    return this.core.dockerPull(image);
  }

  composePs(cwd?: string): Promise<DockerComposeProject | null> {
    return this.core.dockerComposePs(cwd);
  }

  composeUp(cwd?: string, detach = true): Promise<string> {
    return this.core.dockerComposeUp(cwd, detach);
  }

  composeDown(cwd?: string): Promise<string> {
    return this.core.dockerComposeDown(cwd);
  }

  composeLogs(cwd?: string, tail = 100): Promise<string> {
    return this.core.dockerComposeLogs(cwd, tail);
  }

  stats(): Promise<DockerStats[]> {
    return this.core.dockerStats();
  }

  private async pollLogs(id: string): Promise<void> {
    const state = this.logStreams.get(id);
    if (!state) return;

    try {
      const logs = await this.core.dockerLogs(id, 200);
      for (const line of logs.split("\n")) {
        const trimmed = line.trimEnd();
        if (!trimmed || state.seen.has(trimmed)) continue;
        state.seen.add(trimmed);
        if (state.seen.size > 1000) {
          state.seen = new Set(Array.from(state.seen).slice(-500));
        }
        this.emit("log-stream", parseLogLine(id, trimmed));
      }
    } catch (error) {
      this.emit("log-stream", {
        containerId: id,
        timestamp: "",
        stream: "stderr",
        text: error instanceof Error ? error.message : String(error),
      } satisfies DockerLogLine);
      this.stopLogStream(id);
    }
  }
}

function parseLogLine(containerId: string, line: string): DockerLogLine {
  const match = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.+-]+Z?)\s*(.*)$/);
  return {
    containerId,
    timestamp: match?.[1] ?? "",
    stream: "stdout",
    text: match?.[2] ?? line,
  };
}
