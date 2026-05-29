import { create } from "zustand";

export interface ApprovalRequest {
  sessionId: string;
  mobileDeviceName: string;
  mobileDeviceType: string;
  workspaceId?: string;
  windowId?: string;
  terminalId?: string;
  mode: string;
  transportMode?: string;
  requireE2ee?: boolean;
  expiresIn?: number;
}

export interface LinkSession {
  sessionId: string;
  desktopDeviceId: string;
  mobileDeviceId: string;
  status: string;
  mode: string;
  activeTransport?: string;
}

/**
 * Link state machine:
 *   disabled          → user turned off link, or never enabled
 *   connecting        → enabling, connecting to link API
 *   authenticated     → connected and authenticated with link API
 *   error             → failed to connect (network, auth, etc)
 *
 * When `enabled` is false → status is "disabled"
 * When `enabled` is true  → status transitions: connecting → authenticated, or → error
 */
export type P2PState = "idle" | "p2p_connecting" | "p2p_connected";

interface LinkState {
  enabled: boolean;
  status: "disabled" | "connecting" | "authenticated" | "error";
  deviceId: string | null;
  error: string | null;
  p2pState: P2PState;
  pendingApprovals: ApprovalRequest[];
  activeSessions: LinkSession[];

  enable: () => void;
  disable: () => void;
  reconnect: () => void;
  setStatus: (status: LinkState["status"]) => void;
  setDeviceId: (id: string | null) => void;
  setError: (error: string | null) => void;
  setP2PState: (state: P2PState) => void;
  addApproval: (req: ApprovalRequest) => void;
  removeApproval: (sessionId: string) => void;
  addSession: (session: LinkSession) => void;
  removeSession: (sessionId: string) => void;
  approve: (sessionId: string) => void;
  reject: (sessionId: string) => void;
}

export const useLinkStore = create<LinkState>((set, get) => ({
  enabled: false,
  status: "disabled",
  deviceId: null,
  error: null,
  p2pState: "idle",
  pendingApprovals: [],
  activeSessions: [],

  enable: () => {
    set({ enabled: true, status: "connecting", error: null });
    window.orphix?.link?.connect();
  },

  disable: () => {
    set({ enabled: false, status: "disabled", error: null, p2pState: "idle", pendingApprovals: [], activeSessions: [] });
    window.orphix?.link?.disconnect();
  },

  reconnect: () => {
    set({ status: "connecting", error: null });
    window.orphix?.link?.connect();
  },

  setStatus: (status) => set({ status }),
  setDeviceId: (deviceId) => set({ deviceId }),
  setError: (error) => set({ error }),
  setP2PState: (p2pState) => set((s) => (s.p2pState === p2pState ? s : { p2pState })),

  addApproval: (req) =>
    set((s) => ({ pendingApprovals: [...s.pendingApprovals, req] })),

  removeApproval: (sessionId) =>
    set((s) => ({ pendingApprovals: s.pendingApprovals.filter((a) => a.sessionId !== sessionId) })),

  addSession: (session) =>
    set((s) => ({
      activeSessions: [
        ...s.activeSessions.filter((existing) => existing.sessionId !== session.sessionId),
        session,
      ],
    })),

  removeSession: (sessionId) =>
    set((s) => ({ activeSessions: s.activeSessions.filter((s2) => s2.sessionId !== sessionId) })),

  approve: (sessionId) => {
    window.orphix?.link?.approve(sessionId);
    get().removeApproval(sessionId);
  },

  reject: (sessionId) => {
    window.orphix?.link?.reject(sessionId);
    get().removeApproval(sessionId);
  },
}));
