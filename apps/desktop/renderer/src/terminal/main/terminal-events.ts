import { listen } from "@/lib/electron-ipc";
import type {
  TerminalOutputChunk,
  TerminalExitEvent,
} from "@/types/terminal";

export function onTerminalOutput(
  handler: (chunk: TerminalOutputChunk) => void,
): () => void {
  return listen<TerminalOutputChunk>("terminal:output", handler);
}

export function onTerminalState(
  handler: (event: { session_id: string; status: string }) => void,
): () => void {
  return listen<{ session_id: string; status: string }>("terminal:state", handler);
}

export function onTerminalExit(
  handler: (event: TerminalExitEvent) => void,
): () => void {
  return listen<TerminalExitEvent>("terminal:exit", handler);
}

export function onTerminalError(
  handler: (error: { session_id: string; error: string }) => void,
): () => void {
  return listen<{ session_id: string; error: string }>("terminal:error", handler);
}
