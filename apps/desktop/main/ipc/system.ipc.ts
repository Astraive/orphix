import { ipcMain } from "electron";
import { CHANNELS } from "../../shared/channels";
import type { CoreClient } from "../core/core-client";

export function registerSystemIpc(client: CoreClient): void {
  ipcMain.handle(CHANNELS.SYSTEM_HOME_DIR, async () => {
    return client.systemHomeDir();
  });

  ipcMain.handle(CHANNELS.SYSTEM_WORKSPACE_DIR, async () => {
    return client.systemWorkspaceDir();
  });
}
