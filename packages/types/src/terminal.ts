export type TerminalStatus = "starting" | "running" | "exited" | "error";

export interface TerminalSessionSnapshot {
  terminalId: string;
  pid: number | null;
  profileId?: string;
  shell: string;
  cwd: string;
  cols: number;
  rows: number;
  status: TerminalStatus;
  exitCode?: number;
  signal?: string;
  errorMessage?: string;
}

export interface CreateTerminalRequest {
  terminalId: string;
  cols: number;
  rows: number;
  cwd?: string;
  profileId?: string;
  shell?: string;
}

export interface KillTerminalRequest {
  terminalId: string;
}

export interface ShellInfo {
  id: string;
  command: string;
  args: string[];
  label: string;
  description: string;
}
