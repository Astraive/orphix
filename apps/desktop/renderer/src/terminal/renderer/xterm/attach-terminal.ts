import type { Terminal } from "@xterm/xterm";
import { onTerminalOutput } from "@/terminal/main/terminal-events";

export function attachTerminalOutput(
  terminal: Terminal,
  sessionId: string,
): () => void {
  return onTerminalOutput((chunk) => {
    if (chunk.session_id === sessionId) {
      terminal.write(chunk.data);
    }
  });
}
