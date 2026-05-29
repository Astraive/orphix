import { create } from "zustand";
import { LinkService, type LinkServiceState, type WorkspaceNode } from "@/services/link-service";
import * as SecureStore from "expo-secure-store";
import type { ActiveTransport, TransportMode } from "@orphix/types";

const LINK_MODE_KEY = "orphix_link_transport_mode";

export type LinkState =
  | "idle"
  | "connecting"
  | "connected"
  | "authenticated"
  | "requesting"
  | "awaiting_approval"
  | "p2p_connecting"
  | "p2p_connected"
  | "terminal_attached"
  | "disconnected"
  | "error";

export type ConnectionMode = TransportMode;

export type Transport = ActiveTransport;

interface LinkSessionState {
  state: LinkState;
  sessionId: string | null;
  desktopDeviceId: string | null;
  error: string | null;
  terminalOutput: string[];
  workspaces: WorkspaceNode[];
  connectionMode: ConnectionMode;
  transport: Transport;
  service: LinkService | null;

  connect: () => Promise<void>;
  disconnect: () => void;
  requestLink: (desktopDeviceId: string, mode?: string, terminalId?: string) => void;
  createTerminal: (cwd?: string, shell?: string, workspaceId?: string, windowId?: string) => void;
  setConnectionMode: (mode: ConnectionMode) => void;
  startRelay: (terminalId: string) => void;
  setState: (state: LinkState) => void;
  setSession: (sessionId: string, desktopDeviceId: string) => void;
  setError: (error: string | null) => void;
  appendTerminalOutput: (data: string) => void;
  clearTerminalOutput: () => void;
  reset: () => void;
}

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

let serviceCleanup: (() => void) | null = null;

export const useLinkStore = create<LinkSessionState>((set, get) => ({
  state: "idle",
  sessionId: null,
  desktopDeviceId: null,
  error: null,
  terminalOutput: [],
  workspaces: [],
  connectionMode: "auto",
  transport: "pending",
  service: null,

  connect: async () => {
    if (get().service) return;

    let deviceId = await SecureStore.getItemAsync("orphix_device_id");
    if (!deviceId) {
      deviceId = `mobile_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      await SecureStore.setItemAsync("orphix_device_id", deviceId);
    }

    const service = new LinkService();
    const storedMode = await SecureStore.getItemAsync(LINK_MODE_KEY);
    if (storedMode === "auto" || storedMode === "webrtc" || storedMode === "websocket" || storedMode === "local") {
      service.setTransportMode(storedMode);
      set({ connectionMode: storedMode });
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
          set((s) => ({
            terminalOutput: [...s.terminalOutput.slice(-5000), event.data],
          }));
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

    set({ service, state: "connecting" });
    await service.connect();
  },

  disconnect: () => {
    if (serviceCleanup) {
      serviceCleanup();
      serviceCleanup = null;
    }
    get().service?.disconnect();
    set({ service: null, state: "disconnected", sessionId: null, desktopDeviceId: null, workspaces: [] });
  },

  requestLink: (desktopDeviceId, mode, terminalId) => {
    set({ state: "requesting", desktopDeviceId });
    get().service?.requestLink(desktopDeviceId, mode ?? "full_control");
  },

  createTerminal: (cwd, shell, workspaceId, windowId) => {
    get().service?.createTerminal(cwd, shell, workspaceId, windowId);
  },

  setConnectionMode: (connectionMode) => {
    set({ connectionMode });
    SecureStore.setItemAsync(LINK_MODE_KEY, connectionMode).catch(() => {});
    const service = get().service;
    if (service) {
      service.setTransportMode(connectionMode);
    }
  },

  startRelay: (terminalId) => {
    get().service?.startRelay(terminalId);
    set({ connectionMode: "websocket", transport: "websocket" });
  },

  setState: (state) => set({ state }),
  setSession: (sessionId, desktopDeviceId) => set({ sessionId, desktopDeviceId }),
  setError: (error) => set({ error }),
  appendTerminalOutput: (data) =>
    set((s) => ({ terminalOutput: [...s.terminalOutput.slice(-5000), data] })),
  clearTerminalOutput: () => set({ terminalOutput: [] }),
  reset: () => {
    if (serviceCleanup) {
      serviceCleanup();
      serviceCleanup = null;
    }
    get().service?.disconnect();
    set({
      state: "idle", sessionId: null, desktopDeviceId: null,
      error: null, terminalOutput: [], workspaces: [], service: null, connectionMode: "auto",
    });
  },
}));

// ── Standalone helpers (for use outside React components) ──

export function sendTerminalInput(data: string): void {
  useLinkStore.getState().service?.sendTerminalInput(data);
}

export function createTerminal(cwd?: string, shell?: string, workspaceId?: string, windowId?: string): void {
  useLinkStore.getState().service?.createTerminal(cwd, shell, workspaceId, windowId);
}

export function attachTerminal(terminalId: string): void {
  useLinkStore.getState().service?.attachTerminal(terminalId);
  useLinkStore.getState().setState("terminal_attached");
}

export function sendTerminalResize(cols: number, rows: number): void {
  useLinkStore.getState().service?.sendTerminalResize(cols, rows);
}

export function disconnectLinkService(): void {
  useLinkStore.getState().reset();
}
