export type TerminalStatus = "starting" | "running" | "exited" | "error";

export interface TerminalSessionSnapshot {
  terminalId: string;
  pid: number | null;
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

export interface TerminalErrorEvent {
  terminalId: string;
  message: string;
}

export interface TerminalApi {
  createTerminal: (request: CreateTerminalRequest) => Promise<TerminalSessionSnapshot>;
  writeTerminal: (request: WriteTerminalRequest) => Promise<void>;
  resizeTerminal: (request: ResizeTerminalRequest) => Promise<void>;
  killTerminal: (request: KillTerminalRequest) => Promise<void>;
  listTerminals: () => Promise<TerminalSessionSnapshot[]>;
  listShells: () => Promise<{ program: string; args: string[]; label: string }[]>;
  onTerminalOutput: (listener: (event: TerminalOutputEvent) => void) => () => void;
  onTerminalExit: (listener: (event: TerminalExitEvent) => void) => () => void;
  onTerminalState: (listener: (event: TerminalStateEvent) => void) => () => void;
  onTerminalError: (listener: (event: TerminalErrorEvent) => void) => () => void;
}
