export interface WorkspaceMeta {
  id: string;
  name: string;
  windowCount: number;
}

export interface WindowMeta {
  id: string;
  name: string;
  terminalCount: number;
}

export interface TerminalMeta {
  id: string;
  name: string;
  status: string;
  shell: string;
  cwd: string;
}
