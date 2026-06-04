import { app, BrowserWindow, ipcMain, nativeImage, Notification } from "electron";
import { CHANNELS } from "../../shared/ipc/channels";
import type { CoreClient } from "../app/core-client";

type BadgeSeverity = "info" | "success" | "warning" | "error" | null | undefined;

function getBadgeColor(severity: BadgeSeverity): string {
  switch (severity) {
    case "error":
      return "#ef4444";
    case "warning":
      return "#f59e0b";
    case "success":
      return "#10b981";
    case "info":
    default:
      return "#32E0C4";
  }
}

function createOverlayIcon(count: number, severity: BadgeSeverity) {
  const label = count > 99 ? "99+" : String(Math.max(0, count));
  const color = getBadgeColor(severity);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      <rect width="64" height="64" fill="transparent"/>
      <circle cx="47" cy="17" r="15" fill="${color}"/>
      <text x="47" y="22" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="700" fill="#041114">${label}</text>
    </svg>
  `;

  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
}

export function registerSystemIpc(client: CoreClient): void {
  ipcMain.handle(CHANNELS.SYSTEM_HOME_DIR, async () => {
    return client.systemHomeDir();
  });

  ipcMain.handle(CHANNELS.SYSTEM_WORKSPACE_DIR, async () => {
    return client.systemWorkspaceDir();
  });

  ipcMain.handle(CHANNELS.SYSTEM_NOTIFY, async (_event, payload: { title: string; body: string; severity?: BadgeSeverity }) => {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: payload.title,
        body: payload.body,
        silent: payload.severity === "success" || payload.severity === "info",
      });
      notification.show();
    }

    const win = BrowserWindow.getAllWindows()[0];
    if (win && (payload.severity === "error" || payload.severity === "warning")) {
      win.flashFrame(true);
      setTimeout(() => win.flashFrame(false), 1800);
    }

    return { success: true };
  });

  ipcMain.handle(CHANNELS.SYSTEM_SET_BADGE, async (_event, payload: { count: number; severity?: BadgeSeverity }) => {
    const count = Math.max(0, Math.floor(payload.count ?? 0));
    const win = BrowserWindow.getAllWindows()[0];

    if (process.platform === "win32" && win && !win.isDestroyed()) {
      win.setOverlayIcon(
        count > 0 ? createOverlayIcon(count, payload.severity) : null,
        count > 0 ? `${count} unread notifications` : "",
      );
    }

    if (typeof app.setBadgeCount === "function") {
      app.setBadgeCount(count);
    }

    return { success: true };
  });
}
