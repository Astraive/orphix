import type { TerminalProfileId } from "./terminal-profiles";

export type TerminalStatus = 'starting' | 'running' | 'exited' | 'error';

export interface TerminalSessionSnapshot {
  terminalId: string;
  pid: number | null;
  profileId?: TerminalProfileId;
  shell: string;
  cwd: string;
  cols: number;
  rows: number;
  status: TerminalStatus;
  exitCode?: number;
  signal?: number;
  errorMessage?: string;
}

export interface CreateTerminalRequest {
  terminalId: string;
  cols: number;
  rows: number;
  cwd?: string;
  profileId?: TerminalProfileId;
  shell?: string;
}

export interface WriteTerminalRequest {
  terminalId: string;
  data: string;
}

export interface ResizeTerminalRequest {
  terminalId: string;
  cols: number;
  rows: number;
}

export interface KillTerminalRequest {
  terminalId: string;
}

export interface TerminalOutputEvent {
  terminalId: string;
  data: string;
}

export interface TerminalExitEvent {
  terminalId: string;
  exitCode: number;
  signal?: number;
}

export interface TerminalStateEvent {
  terminalId: string;
  snapshot: TerminalSessionSnapshot;
}

export interface ShellInfo {
  id: TerminalProfileId;
  command: string;
  args: string[];
  label: string;
  description: string;
}
