import { ipcMain } from "electron";
import { CHANNELS } from "../../shared/ipc/channels";
import type { LinkManager } from "../link/link-manager";
import { loadLinkSettings, saveLinkSettings } from "../link/link-settings";
import type { LinkSettings } from "../../shared/types/link";

export function registerLinkIpc(linkManager: LinkManager): void {
  ipcMain.handle(CHANNELS.LINK_CONNECT, async () => {
    await linkManager.connect();
    return { status: linkManager.getStatus() };
  });

  ipcMain.handle(CHANNELS.LINK_DISCONNECT, async () => {
    await linkManager.disconnect();
    return { status: "disconnected" };
  });

  ipcMain.handle(CHANNELS.LINK_STATUS, async () => {
    await linkManager.syncStatusFromCore();
    return linkManager.getStatusPayload();
  });

  ipcMain.handle(CHANNELS.LINK_APPROVE, async (_event, sessionId: string) => {
    linkManager.approve(sessionId);
    return { success: true };
  });

  ipcMain.handle(CHANNELS.LINK_REJECT, async (_event, sessionId: string) => {
    linkManager.reject(sessionId);
    return { success: true };
  });

  // Renderer sends a WebRTC signaling message to relay via orphix-core → link API
  ipcMain.handle(CHANNELS.WEBRTC_SEND_SIGNAL, async (_event, msg: Record<string, unknown>) => {
    linkManager.sendSignal(msg);
    return { success: true };
  });

  // Renderer asks for the link API URL (to fetch ICE config, etc.)
  ipcMain.handle(CHANNELS.LINK_GET_URL, async () => {
    return { linkUrl: linkManager.getLinkUrl(), controlUrl: linkManager.getControlUrl() };
  });

  ipcMain.handle(CHANNELS.LINK_GET_SETTINGS, async () => {
    return loadLinkSettings();
  });

  ipcMain.handle(CHANNELS.LINK_UPDATE_SETTINGS, async (_event, settings: Partial<LinkSettings>) => {
    return saveLinkSettings(settings);
  });

  ipcMain.handle(CHANNELS.LINK_WORKSPACE_UPDATE, async (_event, workspaces: unknown[]) => {
    linkManager.updateWorkspaceSnapshot(workspaces);
    return { success: true };
  });
}
