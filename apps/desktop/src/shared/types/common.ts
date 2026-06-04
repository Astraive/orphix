export type TerminalKind =
  | "shell"
  | "agent"
  | "dev_server"
  | "test_runner"
  | "script"
  | "task";

export type TerminalStatus =
  | "starting"
  | "running"
  | "exited"
  | "failed"
  | "killed";

export interface CreateTerminalRequest {
  terminal_id?: string;
  terminalId?: string;
  cwd?: string;
  shell?: string;
  cols?: number;
  rows?: number;
  kind?: TerminalKind;
}

export interface TerminalSessionInfo {
  id: string;
  kind: TerminalKind;
  cwd: string;
  shell: string;
  cols: number;
  rows: number;
  status: TerminalStatus;
  created_at: string;
  last_activity_at: string;
}

export interface TerminalOutputChunk {
  session_id: string;
  seq: number;
  data: string;
  timestamp: string;
}

export interface AttachSnapshot {
  session: TerminalSessionInfo;
  from_seq: number;
  latest_seq: number;
  recent_chunks: TerminalOutputChunk[];
}

export interface ShellInfoDto {
  program: string;
  args: string[];
  label: string;
}

export interface TerminalStatePayload {
  session_id: string;
  status: string;
}

export interface TerminalExitPayload {
  session_id: string;
  exit_code: number | null;
}

export interface TerminalErrorPayload {
  session_id: string;
  error: string;
}

// ── File types ──

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  mtime: number;
  children?: FileEntry[];
}

// ── Git types ──

export type GitFileStatus = "M" | "A" | "D" | "R" | "C" | "U" | "??";

export interface GitFile {
  path: string;
  status: GitFileStatus;
  staged: boolean;
  additions?: number;
  deletions?: number;
}

export interface GitStatus {
  branch: string | null;
  files: GitFile[];
  ahead: number;
  behind: number;
}

export interface GitStash {
  index: number;
  name: string;
  message: string;
}

export interface BrowserTabAttachmentDto {
  workspaceId?: string | null;
  windowId?: string | null;
  paneId?: string | null;
}

export interface BrowserTabSummaryDto {
  id: string;
  title: string;
  url: string;
  status: "loading" | "ready" | "error" | "closed";
  createdAt: string;
  updatedAt: string;
  attachment?: BrowserTabAttachmentDto | null;
  snapshotDataUrl?: string | null;
}

export interface BrowserSessionSummaryDto {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  activeTabId?: string | null;
  tabs: BrowserTabSummaryDto[];
}

export interface OrphixAPI {
  invoke: <T>(channel: string, args?: Record<string, unknown>) => Promise<T>;
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };
  auth: {
    login(): Promise<void>;
    logout(): Promise<void>;
    getStatus(): Promise<{ isAuthenticated: boolean; user: any | null }>;
    getToken(): Promise<string | null>;
    onCallback(callback: (tokens: { accessToken: string; refreshToken: string }) => void): () => void;
  };
  system: {
    notify(payload: { title: string; body: string; severity?: "info" | "success" | "warning" | "error" }): Promise<{ success: boolean }>;
    setBadge(payload: { count: number; severity?: "info" | "success" | "warning" | "error" | null }): Promise<{ success: boolean }>;
  };
  browser: {
    listSessions(): Promise<BrowserSessionSummaryDto[]>;
    createSession(payload?: { name?: string; url?: string }): Promise<BrowserSessionSummaryDto>;
    listTabs(sessionId: string): Promise<BrowserTabSummaryDto[]>;
    openTab(payload: { sessionId: string; url: string }): Promise<BrowserTabSummaryDto>;
    closeTab(payload: { sessionId: string; tabId: string }): Promise<{ success: boolean }>;
    navigate(payload: { sessionId: string; tabId: string; url: string }): Promise<BrowserTabSummaryDto>;
    attach(payload: { sessionId: string; tabId: string; workspaceId?: string; windowId?: string; paneId?: string }): Promise<BrowserTabSummaryDto>;
    detach(payload: { sessionId: string; tabId: string }): Promise<BrowserTabSummaryDto>;
    snapshot(payload: { sessionId: string; tabId: string }): Promise<{ snapshotDataUrl: string | null }>;
    onSessionsChanged(callback: (sessions: BrowserSessionSummaryDto[]) => void): () => void;
  };
  link: {
    connect(): Promise<{ status: string }>;
    disconnect(): Promise<{ status: string }>;
    getStatus(): Promise<{ status: string; deviceId: string | null }>;
    getUrl(): Promise<{ linkUrl: string; controlUrl: string }>;
    getSettings(): Promise<import("./link").LinkSettings>;
    updateSettings(settings: Partial<import("./link").LinkSettings>): Promise<import("./link").LinkSettings>;
    updateWorkspace(payload: Record<string, unknown>): Promise<{ success: boolean }>;
    approve(sessionId: string): Promise<{ success: boolean }>;
    reject(sessionId: string): Promise<{ success: boolean }>;
    sendSignal(msg: Record<string, unknown>): Promise<{ success: boolean }>;
    onStatus(callback: (data: { status: string; deviceId: string | null; event?: string; data?: any }) => void): () => void;
    onWebRTCSignal(callback: (msg: Record<string, unknown>) => void): () => void;
  };
}

declare global {
  interface Window {
    orphix: OrphixAPI;
  }
}
