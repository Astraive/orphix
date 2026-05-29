export type TransportMode = "auto" | "webrtc" | "websocket" | "local";
export type SecurityMode = "E2EE_REQUIRED" | "E2EE_PREFERRED" | "DEV_PLAINTEXT_ALLOWED";

export interface LinkSettings {
  transport: {
    mode: TransportMode;
  };
  encryption: {
    e2ee: boolean;
    allowPlainRelay: boolean;
    securityMode: SecurityMode;
  };
  webrtc: {
    enabled: boolean;
    stun: string[];
    turn: {
      enabled: boolean;
      servers: Array<{ urls: string | string[]; username?: string; credential?: string }>;
    };
  };
  websocket: {
    relayEnabled: boolean;
    requireE2ee: boolean;
  };
}

export const DEFAULT_LINK_SETTINGS: LinkSettings = {
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
