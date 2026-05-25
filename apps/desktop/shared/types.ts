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
}

export interface GitStatus {
  branch: string | null;
  files: GitFile[];
  ahead: number;
  behind: number;
}

export interface OrphixAPI {
  invoke: <T>(channel: string, args?: Record<string, unknown>) => Promise<T>;
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
  off: (channel: string, callback: (...args: unknown[]) => void) => void;
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };
}

declare global {
  interface Window {
    orphix: OrphixAPI;
  }
}
