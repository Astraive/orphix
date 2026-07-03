import type { BrowserSessionSummary, BrowserTabSummary } from "./workspace";

export interface RemoteFileEntry {
  name: string;
  path: string;
  is_dir?: boolean;
  isDir?: boolean;
  size?: number;
  mtime?: number;
}

export interface RemoteGitFile {
  path: string;
  status: string;
  staged: boolean;
  additions?: number;
  deletions?: number;
}

export interface RemoteGitStatus {
  branch: string | null;
  files: RemoteGitFile[];
  ahead: number;
  behind: number;
}

export interface RemoteGitBranch {
  name: string;
  is_current?: boolean;
  isCurrent?: boolean;
  is_remote?: boolean;
  isRemote?: boolean;
}

export interface RemoteGitStash {
  index: number;
  name: string;
  message: string;
}

export interface RemoteDockerContainerPort {
  private: number;
  public: number | null;
  protocol: string;
}

export interface RemoteDockerContainer {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports: RemoteDockerContainerPort[] | string;
}

export interface RemoteDockerImage {
  id: string;
  repository: string;
  tag: string;
  size: string;
}

export interface RemoteRpcMethodMap {
  "fs.list": { params: { path: string }; result: RemoteFileEntry[] | { error: string } };
  "fs.read": { params: { path: string }; result: { content: string } | { error: string } };
  "fs.write": { params: { path: string; content: string }; result: boolean | { error: string } };
  "fs.create": { params: { path: string; isDir?: boolean; is_dir?: boolean }; result: boolean | { error: string } };
  "fs.rename": { params: { oldPath?: string; old_path?: string; newPath?: string; new_path?: string }; result: boolean | { error: string } };
  "fs.delete": { params: { path: string }; result: boolean | { error: string } };
  "fs.stat": { params: { path: string }; result: RemoteFileEntry | { error: string } };
  "git.status": { params: Record<string, never>; result: RemoteGitStatus | null | { error: string } };
  "git.branches": { params: Record<string, never>; result: RemoteGitBranch[] | { error: string } };
  "git.checkout": { params: { branch: string }; result: boolean | { error: string } };
  "git.diff": { params: { file: string }; result: string | { error: string } };
  "git.stage": { params: { files: string[] }; result: boolean | { error: string } };
  "git.unstage": { params: { files: string[] }; result: boolean | { error: string } };
  "git.commit": { params: { message: string }; result: boolean | { error: string } };
  "git.fetch": { params: Record<string, never>; result: boolean | { error: string } };
  "git.pull": { params: Record<string, never>; result: boolean | { error: string } };
  "git.push": { params: Record<string, never>; result: boolean | { error: string } };
  "git.sync": { params: Record<string, never>; result: boolean | { error: string } };
  "git.stage_all": { params: Record<string, never>; result: boolean | { error: string } };
  "git.unstage_all": { params: Record<string, never>; result: boolean | { error: string } };
  "git.discard": { params: { files: string[] }; result: boolean | { error: string } };
  "git.discard_all": { params: Record<string, never>; result: boolean | { error: string } };
  "git.stash_push": { params: { message?: string }; result: boolean | { error: string } };
  "git.stash_pop": { params: Record<string, never>; result: boolean | { error: string } };
  "git.stash_apply": { params: { stash: string }; result: boolean | { error: string } };
  "git.stash_drop": { params: { stash: string }; result: boolean | { error: string } };
  "git.stash_list": { params: Record<string, never>; result: RemoteGitStash[] | { error: string } };
  "docker.check_available": { params: Record<string, never>; result: boolean | { error: string } };
  "docker.ps": { params: { all?: boolean }; result: RemoteDockerContainer[] | { error: string } };
  "docker.images": { params: Record<string, never>; result: RemoteDockerImage[] | { error: string } };
  "docker.stats": { params: Record<string, never>; result: unknown };
  "docker.start": { params: { id: string }; result: boolean | { error: string } };
  "docker.stop": { params: { id: string }; result: boolean | { error: string } };
  "docker.restart": { params: { id: string }; result: boolean | { error: string } };
  "docker.remove": { params: { id: string; force?: boolean }; result: boolean | { error: string } };
  "docker.logs": { params: { id: string; tail?: number }; result: string | { error: string } };
  "docker.inspect": { params: { id: string }; result: unknown };
  "docker.image_remove": { params: { id: string; force?: boolean }; result: boolean | { error: string } };
  "docker.pull": { params: { image: string }; result: string | { error: string } };
  "docker.compose_ps": { params: Record<string, never>; result: unknown };
  "docker.compose_up": { params: { detach?: boolean }; result: string | { error: string } };
  "docker.compose_down": { params: Record<string, never>; result: string | { error: string } };
  "docker.compose_logs": { params: { tail?: number }; result: string | { error: string } };
  "docker.discover_workspace": { params: Record<string, never>; result: unknown };
  "browser.sessions": { params: Record<string, never>; result: BrowserSessionSummary[] | { error: string } };
  "browser.session.create": { params: { name?: string; url?: string }; result: BrowserSessionSummary | { error: string } };
  "browser.tabs.list": { params: { sessionId: string }; result: BrowserTabSummary[] | { error: string } };
  "browser.tab.open": { params: { sessionId: string; url: string }; result: BrowserTabSummary | { error: string } };
  "browser.tab.close": { params: { sessionId: string; tabId: string }; result: boolean | { error: string } };
  "browser.navigate": { params: { sessionId: string; tabId: string; url: string }; result: BrowserTabSummary | { error: string } };
  "browser.attach": { params: { sessionId: string; tabId: string; workspaceId?: string; windowId?: string; paneId?: string }; result: BrowserTabSummary | { error: string } };
  "browser.detach": { params: { sessionId: string; tabId: string }; result: BrowserTabSummary | { error: string } };
  "browser.snapshot": { params: { sessionId: string; tabId: string }; result: { snapshotDataUrl: string | null } | { error: string } };
}

export type RemoteRpcMethod = keyof RemoteRpcMethodMap;
export type RemoteRpcParams<M extends RemoteRpcMethod> = RemoteRpcMethodMap[M]["params"];
export type RemoteRpcResult<M extends RemoteRpcMethod> = RemoteRpcMethodMap[M]["result"];
