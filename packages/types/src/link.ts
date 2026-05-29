export type LinkMode = "view_only" | "approve_only" | "full_control";
export type LinkStatus = "requested" | "approved" | "rejected" | "expired" | "ended";
export type TransportMode = "auto" | "webrtc" | "websocket" | "local";
export type ActiveTransport = "pending" | "webrtc" | "websocket" | "local";
export type SecurityMode = "E2EE_REQUIRED" | "E2EE_PREFERRED" | "DEV_PLAINTEXT_ALLOWED";
export type LinkTransport = ActiveTransport;

export interface TurnServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface LinkTransportSettings {
  mode: TransportMode;
}

export interface LinkEncryptionSettings {
  e2ee: boolean;
  allowPlainRelay: boolean;
  securityMode: SecurityMode;
}

export interface LinkWebRtcSettings {
  enabled: boolean;
  stun: string[];
  turn: {
    enabled: boolean;
    servers: TurnServerConfig[];
  };
}

export interface LinkWebSocketSettings {
  relayEnabled: boolean;
  requireE2ee: boolean;
}

export interface LinkSettings {
  autoApprove: boolean;
  approvalTimeout: number;
  autoApproveSameUser: boolean;
  transport: LinkTransportSettings;
  encryption: LinkEncryptionSettings;
  webrtc: LinkWebRtcSettings;
  websocket: LinkWebSocketSettings;
}

export const DEFAULT_LINK_SETTINGS: LinkSettings = {
  autoApprove: false,
  approvalTimeout: 30,
  autoApproveSameUser: true,
  transport: { mode: "auto" },
  encryption: {
    e2ee: true,
    allowPlainRelay: false,
    securityMode: "E2EE_REQUIRED",
  },
  webrtc: {
    enabled: true,
    stun: ["stun:stun.l.google.com:19302"],
    turn: { enabled: false, servers: [] },
  },
  websocket: {
    relayEnabled: true,
    requireE2ee: true,
  },
};

export interface LinkSession {
  id: string;
  userId: string;
  desktopDeviceId: string;
  mobileDeviceId: string;
  workspaceId: string | null;
  windowId: string | null;
  terminalId: string | null;
  mode: LinkMode;
  status: LinkStatus;
  transport: LinkTransport;
  createdAt: string;
  expiresAt: string;
  endedAt: string | null;
}

export interface LinkRequest {
  desktopDeviceId: string;
  workspaceId?: string;
  windowId?: string;
  terminalId?: string;
  mode: LinkMode;
}

export interface LinkApproval {
  sessionId: string;
  approved: boolean;
}
