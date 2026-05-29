import { create } from "zustand";
import { LinkService, type LinkServiceState, type ConnectionMode } from "./link-service";
import { apiFetch } from "@/lib/api";
import type { LinkSettings } from "@orphix/types";

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
  workspaces: WorkspaceNode[];
  connectionMode: ConnectionMode;
  service: LinkService | null;

  connect: () => Promise<void>;
  disconnect: () => void;
  requestLink: (desktopDeviceId: string, mode?: string) => void;
  setConnectionMode: (mode: ConnectionMode) => void;
  startRelay: (terminalId: string) => void;
  attachTerminal: (terminalId: string) => void;
  createTerminal: (cwd?: string, shell?: string, workspaceId?: string, windowId?: string) => void;
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

export interface WorkspaceNode {
  id: string;
  name: string;
  windows: Array<{
    id: string;
    name: string;
    terminals: Array<{ id: string; name: string; status: string }>;
  }>;
}

export const useLinkStore = create<LinkStoreState>((set, get) => ({
  state: "idle",
  sessionId: null,
  desktopDeviceId: null,
  error: null,
  terminalOutput: [],
  workspaces: [],
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
          set({ workspaces: event.workspaces });
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
    set({ service: null, state: "disconnected", sessionId: null, desktopDeviceId: null });
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
  sendTerminalInput: (data) => { get().service?.sendTerminalInput(data); },
  sendTerminalResize: (cols, rows) => { get().service?.sendTerminalResize(cols, rows); },
  clearTerminalOutput: () => set({ terminalOutput: [] }),

  reset: () => {
    connectPromise = null;
    if (serviceCleanup) { serviceCleanup(); serviceCleanup = null; }
    get().service?.disconnect();
    set({ state: "idle", sessionId: null, desktopDeviceId: null, error: null, terminalOutput: [], workspaces: [], service: null, connectionMode: "auto" });
  },
}));
