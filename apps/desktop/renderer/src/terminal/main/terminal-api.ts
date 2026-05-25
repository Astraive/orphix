import { invoke } from "@/lib/electron-ipc";
import type {
  AttachSnapshot,
  CreateTerminalRequest,
  TerminalOutputChunk,
  TerminalSessionInfo,
} from "@/types/terminal";

export interface ShellInfoDto {
  program: string;
  args: string[];
  label: string;
}

export async function terminalCreate(
  request: CreateTerminalRequest,
): Promise<TerminalSessionInfo> {
  return invoke<TerminalSessionInfo>("terminal:create", request);
}

export async function terminalWrite(
  sessionId: string,
  data: string,
): Promise<void> {
  return invoke<void>("terminal:write", { sessionId, data });
}

export async function terminalResize(
  sessionId: string,
  cols: number,
  rows: number,
): Promise<void> {
  return invoke<void>("terminal:resize", { sessionId, cols, rows });
}

export async function terminalKill(sessionId: string): Promise<void> {
  return invoke<void>("terminal:kill", { sessionId });
}

export async function terminalList(): Promise<TerminalSessionInfo[]> {
  return invoke<TerminalSessionInfo[]>("terminal:list");
}

export async function terminalAttach(
  sessionId: string,
): Promise<AttachSnapshot> {
  return invoke<AttachSnapshot>("terminal:attach", { sessionId });
}

export async function terminalOutputRange(
  sessionId: string,
  fromSeq: number,
  toSeq: number,
): Promise<TerminalOutputChunk[]> {
  return invoke<TerminalOutputChunk[]>("terminal:output_range", {
    sessionId,
    fromSeq,
    toSeq,
  });
}

export async function terminalListShells(): Promise<ShellInfoDto[]> {
  return invoke<ShellInfoDto[]>("terminal:list_shells");
}

export async function systemHomeDir(): Promise<string> {
  return invoke<string>("system:home_dir");
}
