import { EventEmitter } from "events";
import type {
  CreateTerminalRequest,
  FileEntry,
  GitFile,
  GitStash,
  GitStatus,
  TerminalSessionInfo,
  TerminalOutputChunk,
  AttachSnapshot,
  ShellInfoDto,
} from "../../shared/types/common";
import type {
  DockerComposeProject,
  DockerContainer,
  DockerImage,
  DockerInspect,
  DockerStats,
  DockerWorkspaceSummary,
} from "../../shared/types/docker";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

interface CoreMessage {
  id?: string;
  result?: unknown;
  error?: string;
  event?: string;
  data?: unknown;
}

interface RawFileEntry {
  name: string;
  path: string;
  is_dir?: boolean;
  isDir?: boolean;
  size: number;
  mtime: number;
}

interface RawGitFile {
  path: string;
  status: string;
  staged: boolean;
  additions?: number;
  deletions?: number;
}

interface RawGitStatus {
  branch: string | null;
  files: RawGitFile[];
  ahead: number;
  behind: number;
}

export interface GitBranchInfo {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
}

interface RawGitBranchInfo {
  name: string;
  is_current?: boolean;
  isCurrent?: boolean;
  is_remote?: boolean;
  isRemote?: boolean;
}

export class CoreClient extends EventEmitter {
  private pendingRequests = new Map<string, PendingRequest>();
  private requestId = 0;
  private buffer = "";

  constructor(
    private send: (message: string) => void,
    onMessage: (handler: (data: Buffer) => void) => void,
  ) {
    super();
    onMessage((data: Buffer) => this.handleMessage(data));
  }

  private handleMessage(data: Buffer): void {
    this.buffer += data.toString();
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg: CoreMessage = JSON.parse(line);
        if (msg.id && (msg.result !== undefined || msg.error)) {
          const pending = this.pendingRequests.get(msg.id);
          if (pending) {
            this.pendingRequests.delete(msg.id);
            if (msg.error) {
              pending.reject(new Error(msg.error));
            } else {
              pending.resolve(msg.result);
            }
          }
        } else if (msg.event && msg.data !== undefined) {
          this.emit(msg.event, msg.data);
        }
      } catch (e) {
        console.error("Failed to parse core message:", e);
      }
    }
  }

  private request<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = String(++this.requestId);
      const timeoutMs = method.startsWith("docker.") ? 10 * 60 * 1000 : 15000;
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`orphix-core request timed out: ${method}`));
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value as T);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
      try {
        this.send(JSON.stringify({ id, method, params }));
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  terminalCreate(request: CreateTerminalRequest): Promise<TerminalSessionInfo> {
    return this.request("terminal.create", request as unknown as Record<string, unknown>);
  }

  terminalWrite(sessionId: string, data: string): Promise<void> {
    return this.request("terminal.write", { session_id: sessionId, data });
  }

  terminalResize(sessionId: string, cols: number, rows: number): Promise<void> {
    return this.request("terminal.resize", { session_id: sessionId, cols, rows });
  }

  terminalKill(sessionId: string): Promise<void> {
    return this.request("terminal.kill", { session_id: sessionId });
  }

  terminalList(): Promise<TerminalSessionInfo[]> {
    return this.request("terminal.list");
  }

  terminalAttach(sessionId: string): Promise<AttachSnapshot> {
    return this.request("terminal.attach", { session_id: sessionId });
  }

  terminalOutputRange(sessionId: string, fromSeq: number, toSeq: number): Promise<TerminalOutputChunk[]> {
    return this.request("terminal.output_range", { session_id: sessionId, from_seq: fromSeq, to_seq: toSeq });
  }

  terminalListShells(): Promise<ShellInfoDto[]> {
    return this.request("terminal.list_shells");
  }

  // ── Link methods ──

  linkEnable(accessToken: string, linkUrl?: string, controlUrl?: string, deviceId?: string, devicePrivateKey?: string, devicePublicKey?: string, linkSettings?: { transport_mode?: string; require_e2ee?: boolean; allow_plain_relay?: boolean }): Promise<{ state: string; device_id?: string }> {
    return this.request("link.enable", {
      access_token: accessToken,
      link_url: linkUrl,
      control_url: controlUrl,
      device_id: deviceId,
      device_private_key: devicePrivateKey,
      device_public_key: devicePublicKey,
      ...linkSettings,
    });
  }

  linkDisable(): Promise<void> {
    return this.request("link.disable");
  }

  linkStatus(): Promise<{ state: string; device_id?: string; session_id?: string }> {
    return this.request("link.status");
  }

  linkApprove(sessionId: string): Promise<void> {
    return this.request("link.approve", { session_id: sessionId });
  }

  linkReject(sessionId: string): Promise<void> {
    return this.request("link.reject", { session_id: sessionId });
  }

  linkWebRTCSignal(msg: Record<string, unknown>): Promise<void> {
    return this.request("link.webrtc.signal", msg);
  }

  linkWorkspaceUpdate(payload: Record<string, unknown>): Promise<void> {
    return this.request("link.workspace.update", payload);
  }

  linkRelayRpcResponse(terminalId: string, response: Record<string, unknown>): Promise<void> {
    return this.request("link.relay.rpc_response", {
      terminal_id: terminalId,
      response,
    });
  }

  systemHomeDir(): Promise<string> {
    return this.request("system.home_dir");
  }

  systemWorkspaceDir(): Promise<string> {
    return this.request("system.workspace_dir");
  }

  async fileList(path: string): Promise<FileEntry[]> {
    const entries = await this.request<RawFileEntry[]>("fs.list", { path });
    return entries.map(toFileEntry);
  }

  fileRead(path: string): Promise<{ content: string }> {
    return this.request("fs.read", { path });
  }

  fileWrite(path: string, content: string): Promise<void> {
    return this.request("fs.write", { path, content });
  }

  fileCreate(path: string, isDir: boolean): Promise<void> {
    return this.request("fs.create", { path, is_dir: isDir });
  }

  fileRename(oldPath: string, newPath: string): Promise<void> {
    return this.request("fs.rename", { old_path: oldPath, new_path: newPath });
  }

  fileDelete(path: string): Promise<void> {
    return this.request("fs.delete", { path });
  }

  fileCopy(srcPath: string, destPath: string): Promise<void> {
    return this.request("fs.copy", { src_path: srcPath, dest_path: destPath });
  }

  fileMove(srcPath: string, destPath: string): Promise<void> {
    return this.request("fs.move", { src_path: srcPath, dest_path: destPath });
  }

  async fileStat(path: string): Promise<FileEntry & { isSymlink: boolean }> {
    const entry = await this.request<RawFileEntry>("fs.stat", { path });
    return { ...toFileEntry(entry), isSymlink: false };
  }

  async gitStatus(cwd: string): Promise<GitStatus> {
    const status = await this.request<RawGitStatus | null>("git.status", { cwd });
    return {
      branch: status?.branch ?? null,
      files: (status?.files ?? []).map(toGitFile),
      ahead: status?.ahead ?? 0,
      behind: status?.behind ?? 0,
    };
  }

  async gitBranches(cwd: string): Promise<GitBranchInfo[]> {
    const branches = await this.request<RawGitBranchInfo[]>("git.branches", { cwd });
    return branches.map((branch) => ({
      name: branch.name,
      isCurrent: Boolean(branch.isCurrent ?? branch.is_current),
      isRemote: Boolean(branch.isRemote ?? branch.is_remote),
    }));
  }

  gitCheckout(cwd: string, branch: string): Promise<boolean> {
    return this.request("git.checkout", { cwd, branch });
  }

  gitDiff(cwd: string, file: string): Promise<string> {
    return this.request("git.diff", { cwd, file });
  }

  gitStage(cwd: string, files: string[]): Promise<boolean> {
    return this.request("git.stage", { cwd, files });
  }

  gitUnstage(cwd: string, files: string[]): Promise<boolean> {
    return this.request("git.unstage", { cwd, files });
  }

  gitCommit(cwd: string, message: string): Promise<boolean> {
    return this.request("git.commit", { cwd, message });
  }

  gitFetch(cwd: string): Promise<boolean> {
    return this.request("git.fetch", { cwd });
  }

  gitPull(cwd: string): Promise<boolean> {
    return this.request("git.pull", { cwd });
  }

  gitPush(cwd: string): Promise<boolean> {
    return this.request("git.push", { cwd });
  }

  gitSync(cwd: string): Promise<boolean> {
    return this.request("git.sync", { cwd });
  }

  gitStageAll(cwd: string): Promise<boolean> {
    return this.request("git.stage_all", { cwd });
  }

  gitUnstageAll(cwd: string): Promise<boolean> {
    return this.request("git.unstage_all", { cwd });
  }

  gitDiscard(cwd: string, files: string[]): Promise<boolean> {
    return this.request("git.discard", { cwd, files });
  }

  gitDiscardAll(cwd: string): Promise<boolean> {
    return this.request("git.discard_all", { cwd });
  }

  gitStashPush(cwd: string, message?: string): Promise<boolean> {
    return this.request("git.stash_push", { cwd, message });
  }

  gitStashPop(cwd: string): Promise<boolean> {
    return this.request("git.stash_pop", { cwd });
  }

  gitStashApply(cwd: string, stash: string): Promise<boolean> {
    return this.request("git.stash_apply", { cwd, stash });
  }

  gitStashDrop(cwd: string, stash: string): Promise<boolean> {
    return this.request("git.stash_drop", { cwd, stash });
  }

  gitStashList(cwd: string): Promise<GitStash[]> {
    return this.request("git.stash_list", { cwd });
  }

  dockerCheckAvailable(): Promise<boolean> {
    return this.request("docker.check_available");
  }

  dockerPs(all = false): Promise<DockerContainer[]> {
    return this.request("docker.ps", { all });
  }

  dockerPsAll(): Promise<DockerContainer[]> {
    return this.request("docker.ps_all");
  }

  dockerStart(id: string): Promise<void> {
    return this.request("docker.start", { id });
  }

  dockerStop(id: string): Promise<void> {
    return this.request("docker.stop", { id });
  }

  dockerRestart(id: string): Promise<void> {
    return this.request("docker.restart", { id });
  }

  dockerRemove(id: string, force?: boolean): Promise<void> {
    return this.request("docker.remove", { id, force: Boolean(force) });
  }

  dockerLogs(id: string, tail?: number): Promise<string> {
    return this.request("docker.logs", { id, tail });
  }

  dockerInspect(id: string): Promise<DockerInspect> {
    return this.request("docker.inspect", { id });
  }

  dockerExec(id: string, cmd?: string): Promise<{ shell: string; args: string[] }> {
    return this.request("docker.exec", { id, cmd });
  }

  dockerImages(): Promise<DockerImage[]> {
    return this.request("docker.images");
  }

  dockerDiscoverWorkspace(cwd: string): Promise<DockerWorkspaceSummary> {
    return this.request("docker.discover_workspace", { cwd });
  }

  dockerImageRemove(id: string, force?: boolean): Promise<void> {
    return this.request("docker.image_remove", { id, force: Boolean(force) });
  }

  dockerBuild(context: string, tag?: string, dockerfile?: string): Promise<string> {
    return this.request("docker.build", { context, tag, dockerfile });
  }

  dockerPull(image: string): Promise<string> {
    return this.request("docker.pull", { image });
  }

  dockerComposePs(cwd?: string): Promise<DockerComposeProject | null> {
    return this.request("docker.compose_ps", { cwd });
  }

  dockerComposeUp(cwd?: string, detach = true): Promise<string> {
    return this.request("docker.compose_up", { cwd, detach });
  }

  dockerComposeDown(cwd?: string): Promise<string> {
    return this.request("docker.compose_down", { cwd });
  }

  dockerComposeLogs(cwd?: string, tail?: number): Promise<string> {
    return this.request("docker.compose_logs", { cwd, tail });
  }

  dockerStats(): Promise<DockerStats[]> {
    return this.request("docker.stats");
  }
}

function toFileEntry(entry: RawFileEntry): FileEntry {
  return {
    name: entry.name,
    path: entry.path,
    isDir: Boolean(entry.isDir ?? entry.is_dir),
    size: entry.size,
    mtime: entry.mtime,
  };
}

function toGitFile(file: RawGitFile): GitFile {
  const result: GitFile = {
    path: file.path,
    status: file.status as GitFile["status"],
    staged: file.staged,
  };
  if (file.additions != null) result.additions = file.additions;
  if (file.deletions != null) result.deletions = file.deletions;
  return result;
}
