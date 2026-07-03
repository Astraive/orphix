import { BrowserWindow } from "electron";
import { randomUUID } from "node:crypto";
import { CHANNELS } from "../../shared/ipc/channels";
import type {
  BrowserSessionSummaryDto,
  BrowserTabAttachmentDto,
  BrowserTabSummaryDto,
} from "../../shared/types/common";
import type { CoreClient } from "../app/core-client";

interface BrowserTabInternal {
  id: string;
  window: BrowserWindow;
  title: string;
  url: string;
  status: "loading" | "ready" | "error" | "closed";
  createdAt: string;
  updatedAt: string;
  attachment: BrowserTabAttachmentDto | null;
  snapshotDataUrl: string | null;
  isClosing: boolean;
}

interface BrowserSessionInternal {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  activeTabId: string | null;
  tabs: Map<string, BrowserTabInternal>;
}

type BrowserRpcRequest = {
  type?: string;
  id?: string;
  params?: Record<string, unknown>;
};

export class BrowserService {
  private sessions = new Map<string, BrowserSessionInternal>();
  private tabWindowIds = new Set<number>();

  bindCoreClient(core: CoreClient): void {
    core.on("link.browser_rpc", async (data: any) => {
      const terminalId = typeof data?.terminal_id === "string" ? data.terminal_id : "";
      const request = (data?.request ?? {}) as BrowserRpcRequest;
      if (!terminalId || !request?.type || !request?.id) {
        return;
      }

      const response = await this.handleRpcRequest(request);
      await core.linkRelayRpcResponse(terminalId, response).catch((error) => {
        console.error("[browser] Failed to send browser RPC response:", error);
      });
    });
  }

  async createSession(payload: { name?: string; url?: string } = {}): Promise<BrowserSessionSummaryDto> {
    const now = new Date().toISOString();
    const sessionId = randomUUID();
    const session: BrowserSessionInternal = {
      id: sessionId,
      name: payload.name?.trim() || `Browser ${this.sessions.size + 1}`,
      createdAt: now,
      updatedAt: now,
      activeTabId: null,
      tabs: new Map(),
    };
    this.sessions.set(sessionId, session);
    await this.openTab({
      sessionId,
      url: payload.url?.trim() || "https://example.com",
    });
    return this.toSessionSummary(session);
  }

  listSessions(): BrowserSessionSummaryDto[] {
    return Array.from(this.sessions.values()).map((session) => this.toSessionSummary(session));
  }

  async listTabs(sessionId: string): Promise<BrowserTabSummaryDto[]> {
    const session = this.requireSession(sessionId);
    return Array.from(session.tabs.values()).map((tab) => this.toTabSummary(tab));
  }

  async openTab(payload: { sessionId: string; url: string }): Promise<BrowserTabSummaryDto> {
    const session = this.requireSession(payload.sessionId);
    const tabId = randomUUID();
    const now = new Date().toISOString();
    const window = this.createHiddenWindow(session.id, tabId);
    const tab: BrowserTabInternal = {
      id: tabId,
      window,
      title: "Loading...",
      url: payload.url,
      status: "loading",
      createdAt: now,
      updatedAt: now,
      attachment: null,
      snapshotDataUrl: null,
      isClosing: false,
    };

    session.tabs.set(tabId, tab);
    session.activeTabId = tabId;
    session.updatedAt = now;
    this.bindTabLifecycle(session, tab);
    await window.loadURL(payload.url);
    this.emitSessionsChanged();
    return this.toTabSummary(tab);
  }

  async closeTab(payload: { sessionId: string; tabId: string }): Promise<boolean> {
    const session = this.requireSession(payload.sessionId);
    const tab = this.requireTab(session, payload.tabId);
    tab.isClosing = true;
    session.tabs.delete(tab.id);
    session.updatedAt = new Date().toISOString();
    if (session.activeTabId === tab.id) {
      session.activeTabId = Array.from(session.tabs.keys())[0] ?? null;
    }
    this.tabWindowIds.delete(tab.window.id);
    if (!tab.window.isDestroyed()) {
      tab.window.destroy();
    }
    if (session.tabs.size === 0) {
      this.sessions.delete(session.id);
    }
    this.emitSessionsChanged();
    return true;
  }

  async navigate(payload: { sessionId: string; tabId: string; url: string }): Promise<BrowserTabSummaryDto> {
    const session = this.requireSession(payload.sessionId);
    const tab = this.requireTab(session, payload.tabId);
    tab.status = "loading";
    tab.url = payload.url;
    tab.updatedAt = new Date().toISOString();
    session.activeTabId = tab.id;
    session.updatedAt = tab.updatedAt;
    this.emitSessionsChanged();
    await tab.window.loadURL(payload.url);
    return this.toTabSummary(tab);
  }

  async attach(payload: {
    sessionId: string;
    tabId: string;
    workspaceId?: string;
    windowId?: string;
    paneId?: string;
  }): Promise<BrowserTabSummaryDto> {
    const session = this.requireSession(payload.sessionId);
    const tab = this.requireTab(session, payload.tabId);
    tab.attachment = {
      workspaceId: payload.workspaceId ?? null,
      windowId: payload.windowId ?? null,
      paneId: payload.paneId ?? `browser:${tab.id}`,
    };
    tab.updatedAt = new Date().toISOString();
    session.updatedAt = tab.updatedAt;
    this.emitSessionsChanged();
    return this.toTabSummary(tab);
  }

  async detach(payload: { sessionId: string; tabId: string }): Promise<BrowserTabSummaryDto> {
    const session = this.requireSession(payload.sessionId);
    const tab = this.requireTab(session, payload.tabId);
    tab.attachment = null;
    tab.updatedAt = new Date().toISOString();
    session.updatedAt = tab.updatedAt;
    this.emitSessionsChanged();
    return this.toTabSummary(tab);
  }

  async snapshot(payload: { sessionId: string; tabId: string }): Promise<{ snapshotDataUrl: string | null }> {
    const session = this.requireSession(payload.sessionId);
    const tab = this.requireTab(session, payload.tabId);
    await this.captureSnapshot(tab);
    return { snapshotDataUrl: tab.snapshotDataUrl };
  }

  getAttachedBrowserPanes(): Array<{
    workspaceId: string;
    windowId: string;
    paneId: string;
    browserSessionId: string;
    tabId: string;
    title: string;
    url: string;
    snapshotDataUrl: string | null;
  }> {
    const panes: Array<{
      workspaceId: string;
      windowId: string;
      paneId: string;
      browserSessionId: string;
      tabId: string;
      title: string;
      url: string;
      snapshotDataUrl: string | null;
    }> = [];

    for (const session of this.sessions.values()) {
      for (const tab of session.tabs.values()) {
        if (!tab.attachment?.workspaceId || !tab.attachment.windowId || !tab.attachment.paneId) {
          continue;
        }
        panes.push({
          workspaceId: tab.attachment.workspaceId,
          windowId: tab.attachment.windowId,
          paneId: tab.attachment.paneId,
          browserSessionId: session.id,
          tabId: tab.id,
          title: tab.title,
          url: tab.url,
          snapshotDataUrl: tab.snapshotDataUrl,
        });
      }
    }

    return panes;
  }

  destroy(): void {
    for (const session of this.sessions.values()) {
      for (const tab of session.tabs.values()) {
        if (!tab.window.isDestroyed()) {
          tab.window.destroy();
        }
      }
    }
    this.sessions.clear();
    this.tabWindowIds.clear();
  }

  private async handleRpcRequest(request: BrowserRpcRequest): Promise<Record<string, unknown>> {
    const type = request.type ?? "browser.unknown";
    const id = request.id ?? randomUUID();
    const params = request.params ?? {};

    try {
      let data: unknown;
      switch (type) {
        case "browser.sessions":
          data = this.listSessions();
          break;
        case "browser.session.create":
          data = await this.createSession({
            name: typeof params.name === "string" ? params.name : undefined,
            url: typeof params.url === "string" ? params.url : undefined,
          });
          break;
        case "browser.tabs.list":
          data = await this.listTabs(String(params.sessionId ?? ""));
          break;
        case "browser.tab.open":
          data = await this.openTab({
            sessionId: String(params.sessionId ?? ""),
            url: String(params.url ?? "about:blank"),
          });
          break;
        case "browser.tab.close":
          data = await this.closeTab({
            sessionId: String(params.sessionId ?? ""),
            tabId: String(params.tabId ?? ""),
          });
          break;
        case "browser.navigate":
          data = await this.navigate({
            sessionId: String(params.sessionId ?? ""),
            tabId: String(params.tabId ?? ""),
            url: String(params.url ?? "about:blank"),
          });
          break;
        case "browser.attach":
          data = await this.attach({
            sessionId: String(params.sessionId ?? ""),
            tabId: String(params.tabId ?? ""),
            workspaceId: typeof params.workspaceId === "string" ? params.workspaceId : undefined,
            windowId: typeof params.windowId === "string" ? params.windowId : undefined,
            paneId: typeof params.paneId === "string" ? params.paneId : undefined,
          });
          break;
        case "browser.detach":
          data = await this.detach({
            sessionId: String(params.sessionId ?? ""),
            tabId: String(params.tabId ?? ""),
          });
          break;
        case "browser.snapshot":
          data = await this.snapshot({
            sessionId: String(params.sessionId ?? ""),
            tabId: String(params.tabId ?? ""),
          });
          break;
        default:
          return {
            type: `${type}.response`,
            id,
            data: { error: `Unknown browser method: ${type}` },
          };
      }

      return {
        type: `${type}.response`,
        id,
        data,
      };
    } catch (error) {
      return {
        type: `${type}.response`,
        id,
        data: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  private createHiddenWindow(sessionId: string, tabId: string): BrowserWindow {
    const partition = `persist:orphix-browser-${sessionId}`;
    const window = new BrowserWindow({
      width: 1280,
      height: 720,
      show: false,
      skipTaskbar: true,
      autoHideMenuBar: true,
      webPreferences: {
        sandbox: true,
        partition,
      },
    });
    this.tabWindowIds.add(window.id);
    window.webContents.setWindowOpenHandler(({ url }) => {
      this.openTab({ sessionId, url }).catch((error) => {
        console.error("[browser] Failed to open popup tab:", error);
      });
      return { action: "deny" };
    });
    return window;
  }

  private bindTabLifecycle(session: BrowserSessionInternal, tab: BrowserTabInternal): void {
    const refresh = async () => {
      tab.title = tab.window.webContents.getTitle() || tab.title || tab.url;
      tab.url = tab.window.webContents.getURL() || tab.url;
      tab.updatedAt = new Date().toISOString();
      session.updatedAt = tab.updatedAt;
      session.activeTabId = tab.id;
      await this.captureSnapshot(tab);
      this.emitSessionsChanged();
    };

    tab.window.webContents.on("did-start-loading", () => {
      tab.status = "loading";
      tab.updatedAt = new Date().toISOString();
      session.updatedAt = tab.updatedAt;
      this.emitSessionsChanged();
    });

    tab.window.webContents.on("page-title-updated", () => {
      tab.title = tab.window.webContents.getTitle() || tab.title;
      tab.updatedAt = new Date().toISOString();
      session.updatedAt = tab.updatedAt;
      this.emitSessionsChanged();
    });

    tab.window.webContents.on("did-finish-load", () => {
      tab.status = "ready";
      refresh().catch((error) => {
        console.error("[browser] Failed to refresh tab metadata:", error);
      });
    });

    tab.window.webContents.on("did-fail-load", (_event, _code, description, validatedURL) => {
      tab.status = "error";
      tab.title = description || "Failed to load";
      tab.url = validatedURL || tab.url;
      tab.updatedAt = new Date().toISOString();
      session.updatedAt = tab.updatedAt;
      this.emitSessionsChanged();
    });

    tab.window.on("closed", () => {
      if (!tab.isClosing) {
        session.tabs.delete(tab.id);
        if (session.tabs.size === 0) {
          this.sessions.delete(session.id);
        } else if (session.activeTabId === tab.id) {
          session.activeTabId = Array.from(session.tabs.keys())[0] ?? null;
        }
        this.emitSessionsChanged();
      }
      this.tabWindowIds.delete(tab.window.id);
    });
  }

  private async captureSnapshot(tab: BrowserTabInternal): Promise<void> {
    if (tab.window.isDestroyed()) {
      return;
    }
    try {
      const image = await tab.window.webContents.capturePage();
      tab.snapshotDataUrl = image.isEmpty() ? null : image.toDataURL();
    } catch (error) {
      console.error("[browser] Failed to capture page:", error);
    }
  }

  private emitSessionsChanged(): void {
    const payload = this.listSessions();
    const windows = BrowserWindow.getAllWindows().filter((window) => !this.tabWindowIds.has(window.id));
    for (const window of windows) {
      window.webContents.send(CHANNELS.BROWSER_SESSIONS_UPDATED, payload);
    }
  }

  private requireSession(sessionId: string): BrowserSessionInternal {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown browser session: ${sessionId}`);
    }
    return session;
  }

  private requireTab(session: BrowserSessionInternal, tabId: string): BrowserTabInternal {
    const tab = session.tabs.get(tabId);
    if (!tab) {
      throw new Error(`Unknown browser tab: ${tabId}`);
    }
    return tab;
  }

  private toSessionSummary(session: BrowserSessionInternal): BrowserSessionSummaryDto {
    return {
      id: session.id,
      name: session.name,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      activeTabId: session.activeTabId,
      tabs: Array.from(session.tabs.values()).map((tab) => this.toTabSummary(tab)),
    };
  }

  private toTabSummary(tab: BrowserTabInternal): BrowserTabSummaryDto {
    return {
      id: tab.id,
      title: tab.title,
      url: tab.url,
      status: tab.status,
      createdAt: tab.createdAt,
      updatedAt: tab.updatedAt,
      attachment: tab.attachment,
      snapshotDataUrl: tab.snapshotDataUrl,
    };
  }
}
