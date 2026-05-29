import { BrowserWindow } from "electron";
import type { CoreClient } from "./core-client";
import { TERMINAL_CHANNELS } from "../../shared/terminal/terminal-ipc";
import type { TerminalStatus } from "../../shared/terminal/types";

function broadcast(channel: string, data: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  }
}

function toDesktopStatus(status: unknown): TerminalStatus {
  if (status === "exited" || status === "killed") return "exited";
  if (status === "failed" || status === "error") return "error";
  if (status === "starting") return "starting";
  return "running";
}

function getTerminalId(data: Record<string, unknown>): string | null {
  const terminalId = data.terminalId ?? data.session_id ?? data.id;
  return typeof terminalId === "string" && terminalId.length > 0 ? terminalId : null;
}

export function setupCoreEvents(client: CoreClient): void {
  client.on("terminal.output", (raw: unknown) => {
    const data = (raw ?? {}) as Record<string, unknown>;
    const terminalId = getTerminalId(data);
    if (!terminalId) return;
    broadcast(TERMINAL_CHANNELS.output, {
      terminalId,
      data: typeof data.data === "string" ? data.data : "",
    });
  });

  client.on("terminal.state", (raw: unknown) => {
    const data = (raw ?? {}) as Record<string, unknown>;
    const terminalId = getTerminalId(data);
    if (!terminalId) return;
    broadcast(TERMINAL_CHANNELS.state, {
      terminalId,
      linked: true,
      snapshot: {
        terminalId,
        pid: null,
        shell: typeof data.shell === "string" ? data.shell : "orphix-core",
        cwd: typeof data.cwd === "string" ? data.cwd : "",
        cols: typeof data.cols === "number" ? data.cols : 120,
        rows: typeof data.rows === "number" ? data.rows : 30,
        status: toDesktopStatus(data.status),
      },
    });
  });

  client.on("terminal.exit", (raw: unknown) => {
    const data = (raw ?? {}) as Record<string, unknown>;
    const terminalId = getTerminalId(data);
    if (!terminalId) return;
    broadcast(TERMINAL_CHANNELS.exit, {
      terminalId,
      exitCode: typeof data.exit_code === "number"
        ? data.exit_code
        : typeof data.exitCode === "number"
          ? data.exitCode
          : 0,
    });
  });

  client.on("terminal.error", (raw: unknown) => {
    const data = (raw ?? {}) as Record<string, unknown>;
    const terminalId = getTerminalId(data);
    if (!terminalId) return;
    broadcast(TERMINAL_CHANNELS.error, {
      terminalId,
      message: typeof data.error === "string"
        ? data.error
        : typeof data.message === "string"
          ? data.message
          : "Terminal error",
    });
  });
}
