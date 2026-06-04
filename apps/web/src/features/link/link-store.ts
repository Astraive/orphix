import { create } from "zustand";
import { LinkService, type LinkServiceState, type ConnectionMode } from "./link-service";
import { apiFetch } from "@/lib/api";
import type { LinkSettings, BrowserSessionSummary, WorkspaceCapabilities, WorkspaceSnapshotNode } from "@orphix/types";
import { createTerminalExitNotification, inspectTerminalOutput } from "@orphix/types";
import { useWebNotificationStore } from "@/features/notifications/notification-store";

export type LinkState =
  | "idle"
  | "connecting"
  | "connected"
  | "authenticated"
  | "requesting"
  | "awaiting_approval"
  | "p2p_connecting"
  | "p2p_connected"
  | "disconnected"
  | "error";

interface LinkStoreState {
  state: LinkState;
  sessionId: string | null;
  desktopDeviceId: string | null;
  error: string | null;
  terminalOutput: string[];
  workspaces: WorkspaceSnapshotNode[];
  browserSessions: BrowserSessionSummary[];
  capabilities: WorkspaceCapabilities;
  connectionMode: ConnectionMode;
  service: LinkService | null;

  connect: () => Promise<void>;
  disconnect: () => void;
  requestLink: (desktopDeviceId: string, mode?: string) => void;
  setConnectionMode: (mode: ConnectionMode) => void;
  startRelay: (terminalId: string) => void;
  attachTerminal: (terminalId: string) => void;
  createTerminal: (cwd?: string, shell?: string, workspaceId?: string, windowId?: string) => void;
  rpc: (method: string, params?: Record<string, any>, cwd?: string) => Promise<any>;
  sendTerminalInput: (data: string) => void;
  sendTerminalResize: (cols: number, rows: number) => void;
  clearTerminalOutput: () => void;
  reset: () => void;
}

let serviceCleanup: (() => void) | null = null;
let connectPromise: Promise<void> | null = null;

function mapServiceState(s: LinkServiceState): LinkState {
  switch (s) {
    case "idle": return "idle";
    case "connecting": return "connecting";
    case "connected": return "connected";
    case "authenticated": return "authenticated";
    case "requesting": return "requesting";
    case "awaiting_approval": return "awaiting_approval";
    case "p2p_connecting": return "p2p_connecting";
    case "p2p_connected": return "p2p_connected";
    case "disconnected": return "disconnected";
    case "error": return "error";
    default: return "idle";
  }
}

export const useLinkStore = create<LinkStoreState>((set, get) => ({
  state: "idle",
  sessionId: null,
  desktopDeviceId: null,
  error: null,
  terminalOutput: [],
  workspaces: [],
  browserSessions: [],
  capabilities: {
    filesystem: { root: ".", canWrite: false, focusedPath: null },
    git: { available: false, repoPath: null, branch: null },
    docker: { available: false, workspacePath: null, hasCompose: false, runningContainers: 0 },
    browser: { available: false, sessionCount: 0 },
    notifications: { available: true, unreadCount: 0 },
  },
  connectionMode: "auto",
  service: null,

  connect: async () => {
    if (connectPromise) return connectPromise;
    if (get().service) {
      const service = get().service;
      if (service?.getState() !== "authenticated") {
        return service?.connect();
      }
      return;
    }
    const service = new LinkService();
    set({ service, state: "connecting", error: null });
    try {
      const res = await apiFetch("/me/link-settings");
      if (res.ok) {
        const settings = await res.json() as LinkSettings;
        service.setTransportMode(settings.transport.mode);
        set({ connectionMode: settings.transport.mode });
      }
    } catch {
      // Keep default Auto mode.
    }
    serviceCleanup = service.on((event) => {
      switch (event.type) {
        case "state":
          set({ state: mapServiceState(event.state) });
          break;
        case "error":
          set({ state: "error", error: event.error });
          break;
        case "terminal.output":
          {
            const terminalId = get().service?.getAttachedTerminalId?.() ?? null;
            const draft = inspectTerminalOutput(terminalId ?? "linked-terminal", event.data);
            if (draft) {
              useWebNotificationStore.getState().push(draft);
            }
          }
          set((s) => ({ terminalOutput: [...s.terminalOutput.slice(-10000), event.data] }));
          break;
        case "terminal.state":
          set((s) => ({
            workspaces: s.workspaces.map((ws) => ({
              ...ws,
              windows: ws.windows.map((win) => ({
                ...win,
                terminals: win.terminals.map((t) =>
                  t.id === event.sessionId ? { ...t, status: event.status } : t
                ),
              })),
            })),
          }));
          break;
        case "terminal.exit":
          {
            const draft = createTerminalExitNotification(event.sessionId, event.exitCode);
            if (draft) {
              useWebNotificationStore.getState().push(draft);
            }
          }
          set((s) => ({
            workspaces: s.workspaces.map((ws) => ({
              ...ws,
              windows: ws.windows.map((win) => ({
                ...win,
                terminals: win.terminals.map((t) =>
                  t.id === event.sessionId ? { ...t, status: "exited" } : t
                ),
              })),
            })),
          }));
          break;
        case "workspace.list":
          set({
            workspaces: event.payload.workspaces,
            browserSessions: event.payload.browserSessions,
            capabilities: event.payload.capabilities,
          });
          break;
      }
    });
    connectPromise = service.connect().finally(() => {
      connectPromise = null;
    });
    await connectPromise;
  },

  disconnect: () => {
    connectPromise = null;
    if (serviceCleanup) { serviceCleanup(); serviceCleanup = null; }
    get().service?.disconnect();
    set({
      service: null,
      state: "disconnected",
      sessionId: null,
      desktopDeviceId: null,
      workspaces: [],
      browserSessions: [],
      capabilities: {
        filesystem: { root: ".", canWrite: false, focusedPath: null },
        git: { available: false, repoPath: null, branch: null },
        docker: { available: false, workspacePath: null, hasCompose: false, runningContainers: 0 },
        browser: { available: false, sessionCount: 0 },
        notifications: { available: true, unreadCount: 0 },
      },
    });
  },

  requestLink: (desktopDeviceId, mode) => {
    set({ desktopDeviceId });
    get().service?.requestLink(desktopDeviceId, mode ?? "full_control");
  },

  setConnectionMode: (connectionMode) => {
    set({ connectionMode });
    get().service?.setTransportMode(connectionMode);
  },

  startRelay: (terminalId) => {
    get().service?.startRelay(terminalId);
    set({ connectionMode: "websocket" });
  },

  attachTerminal: (terminalId) => { get().service?.attachTerminal(terminalId); },
  createTerminal: (cwd, shell, workspaceId, windowId) => { get().service?.createTerminal(cwd, shell, workspaceId, windowId); },
  rpc: async (method, params = {}, cwd) => { return get().service?.rpc(method, params, cwd) ?? null; },
  sendTerminalInput: (data) => { get().service?.sendTerminalInput(data); },
  sendTerminalResize: (cols, rows) => { get().service?.sendTerminalResize(cols, rows); },
  clearTerminalOutput: () => set({ terminalOutput: [] }),

  reset: () => {
    connectPromise = null;
    if (serviceCleanup) { serviceCleanup(); serviceCleanup = null; }
    get().service?.disconnect();
    set({
      state: "idle",
      sessionId: null,
      desktopDeviceId: null,
      error: null,
      terminalOutput: [],
      workspaces: [],
      browserSessions: [],
      capabilities: {
        filesystem: { root: ".", canWrite: false, focusedPath: null },
        git: { available: false, repoPath: null, branch: null },
        docker: { available: false, workspacePath: null, hasCompose: false, runningContainers: 0 },
        browser: { available: false, sessionCount: 0 },
        notifications: { available: true, unreadCount: 0 },
      },
      service: null,
      connectionMode: "auto",
    });
  },
}));

// ── Standalone helpers (for use outside React components) ──

export function sendTerminalInput(data: string): void {
  useLinkStore.getState().service?.sendTerminalInput(data);
}

export function rpc(method: string, params: Record<string, any> = {}, cwd?: string): Promise<any> {
  return useLinkStore.getState().service?.rpc(method, params, cwd) ?? Promise.reject(new Error("No link service"));
}
