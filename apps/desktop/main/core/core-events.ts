import { BrowserWindow } from "electron";
import type { CoreClient } from "./core-client";

const EVENT_CHANNELS = {
  "terminal.output": "terminal:output",
  "terminal.state": "terminal:state",
  "terminal.exit": "terminal:exit",
  "terminal.error": "terminal:error",
} as const;

export function setupCoreEvents(client: CoreClient): void {
  for (const [coreEvent, ipcChannel] of Object.entries(EVENT_CHANNELS)) {
    client.on(coreEvent, (data: unknown) => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send(ipcChannel, data);
      }
    });
  }
}
