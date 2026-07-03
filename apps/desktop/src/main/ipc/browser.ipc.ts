import { ipcMain } from "electron";
import { CHANNELS } from "../../shared/ipc/channels";
import type { BrowserService } from "../browser/BrowserService";

export function registerBrowserIpc(browserService: BrowserService): void {
  ipcMain.handle(CHANNELS.BROWSER_LIST_SESSIONS, async () => {
    return browserService.listSessions();
  });

  ipcMain.handle(CHANNELS.BROWSER_CREATE_SESSION, async (_event, payload?: { name?: string; url?: string }) => {
    return browserService.createSession(payload ?? {});
  });

  ipcMain.handle(CHANNELS.BROWSER_LIST_TABS, async (_event, sessionId: string) => {
    return browserService.listTabs(sessionId);
  });

  ipcMain.handle(CHANNELS.BROWSER_OPEN_TAB, async (_event, payload: { sessionId: string; url: string }) => {
    return browserService.openTab(payload);
  });

  ipcMain.handle(CHANNELS.BROWSER_CLOSE_TAB, async (_event, payload: { sessionId: string; tabId: string }) => {
    const success = await browserService.closeTab(payload);
    return { success };
  });

  ipcMain.handle(CHANNELS.BROWSER_NAVIGATE, async (_event, payload: { sessionId: string; tabId: string; url: string }) => {
    return browserService.navigate(payload);
  });

  ipcMain.handle(CHANNELS.BROWSER_ATTACH, async (
    _event,
    payload: { sessionId: string; tabId: string; workspaceId?: string; windowId?: string; paneId?: string },
  ) => {
    return browserService.attach(payload);
  });

  ipcMain.handle(CHANNELS.BROWSER_DETACH, async (_event, payload: { sessionId: string; tabId: string }) => {
    return browserService.detach(payload);
  });

  ipcMain.handle(CHANNELS.BROWSER_SNAPSHOT, async (_event, payload: { sessionId: string; tabId: string }) => {
    return browserService.snapshot(payload);
  });
}
