import { ipcMain } from "electron";
import type { CoreClient } from "../core/core-client";
import { CHANNELS } from "../../shared/channels";

export function registerTerminalIpc(client: CoreClient): void {
  ipcMain.handle(CHANNELS.TERMINAL_CREATE, async (_event, args) => {
    return client.terminalCreate(args);
  });

  ipcMain.handle(CHANNELS.TERMINAL_WRITE, async (_event, args) => {
    return client.terminalWrite(args.sessionId ?? args.session_id, args.data);
  });

  ipcMain.handle(CHANNELS.TERMINAL_RESIZE, async (_event, args) => {
    return client.terminalResize(args.sessionId ?? args.session_id, args.cols, args.rows);
  });

  ipcMain.handle(CHANNELS.TERMINAL_KILL, async (_event, args) => {
    return client.terminalKill(args.sessionId ?? args.session_id);
  });

  ipcMain.handle(CHANNELS.TERMINAL_LIST, async () => {
    return client.terminalList();
  });

  ipcMain.handle(CHANNELS.TERMINAL_ATTACH, async (_event, args) => {
    return client.terminalAttach(args.sessionId ?? args.session_id);
  });

  ipcMain.handle(CHANNELS.TERMINAL_OUTPUT_RANGE, async (_event, args) => {
    return client.terminalOutputRange(
      args.sessionId ?? args.session_id,
      args.fromSeq ?? args.from_seq,
      args.toSeq ?? args.to_seq,
    );
  });

  ipcMain.handle(CHANNELS.TERMINAL_LIST_SHELLS, async () => {
    return client.terminalListShells();
  });

  ipcMain.handle(CHANNELS.SYSTEM_HOME_DIR, async () => {
    return client.systemHomeDir();
  });
}
