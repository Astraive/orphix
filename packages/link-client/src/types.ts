import type { TransportMode, ActiveTransport, WorkspaceListPayload } from "@orphix/types";

export type LinkClientState =
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

export type LinkClientEvent =
  | { type: "state"; state: LinkClientState }
  | { type: "error"; error: string }
  | { type: "terminal.output"; data: string }
  | { type: "terminal.state"; sessionId: string; status: string }
  | { type: "terminal.exit"; sessionId: string; exitCode: number | null }
  | { type: "terminal.attached"; sessionId: string }
  | { type: "workspace.list"; payload: WorkspaceListPayload };

export type ConnectionMode = TransportMode;

export interface TokenStore {
  getAccessToken(): Promise<string | null>;
  refreshToken?(): Promise<string | null>;
}

export interface LinkClientOptions {
  /** WebSocket URL base (e.g. "ws://localhost:2606") */
  linkUrl: string;
  /** HTTP URL for control API (for token refresh) */
  controlUrl: string;
  /** Platform-specific token storage */
  tokenStore: TokenStore;
  /** Auth method to use on challenge */
  authMethod: "web.hello" | "mobile.hello";
  /** WebSocket constructor (platform-provided) */
  wsConstructor: typeof WebSocket;
  /** Device display name */
  deviceName: string;
  /** Generate or retrieve a persistent device ID */
  generateDeviceId: () => string;
  /** Maximum reconnect attempts (default: 15) */
  maxReconnectAttempts?: number;
  /** Base reconnect delay in ms (default: 2000) */
  baseReconnectDelay?: number;
}
