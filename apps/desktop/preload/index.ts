import { contextBridge, ipcRenderer } from "electron";
import { CHANNELS } from "../shared/channels";
import type { OrphixAPI } from "../shared/types";

const orphix: OrphixAPI = {
  invoke: <T>(channel: string, args?: Record<string, unknown>): Promise<T> => {
    return ipcRenderer.invoke(channel, args);
  },
  on: (channel: string, callback: (...args: unknown[]) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
      callback(...args);
    };
    ipcRenderer.on(channel, handler);
    return () => {
      ipcRenderer.removeListener(channel, handler);
    };
  },
  off: (channel: string, callback: (...args: unknown[]) => void): void => {
    ipcRenderer.removeListener(channel, callback as (...args: unknown[]) => void);
  },
  window: {
    minimize: () => ipcRenderer.invoke(CHANNELS.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.invoke(CHANNELS.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.invoke(CHANNELS.WINDOW_CLOSE),
    isMaximized: () => ipcRenderer.invoke(CHANNELS.WINDOW_IS_MAXIMIZED),
  },
};

contextBridge.exposeInMainWorld("orphix", orphix);
