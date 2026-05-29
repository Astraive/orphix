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

export interface CreateTerminalRequest {
  cwd?: string;
  shell?: string;
  cols?: number;
  rows?: number;
  kind?: TerminalKind;
}

export interface TerminalOutputChunk {
  session_id: string;
  seq: number;
  data: string;
  timestamp: string;
}

export interface TerminalStateEvent {
  session_id: string;
  status: string;
}

export interface TerminalExitEvent {
  session_id: string;
  exit_code: number | null;
}

export interface AttachSnapshot {
  session: TerminalSessionInfo;
  from_seq: number;
  latest_seq: number;
  recent_chunks: TerminalOutputChunk[];
}
