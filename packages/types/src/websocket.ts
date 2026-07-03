import type { DeviceProof, DeviceType } from "./device";
import type { LinkMode, LinkApproval } from "./link";
import type { BrowserSessionSummary, WorkspaceCapabilities, WorkspaceListPayload, WorkspaceSnapshotNode, WorkspaceWindowSnapshot, WorkspaceTerminalSummary } from "./workspace";

// --- Client Hello ---
export interface DesktopHello {
  type: "desktop.hello";
  deviceId: string;
  accessToken: string;
  deviceProof: DeviceProof;
}

export interface MobileHello {
  type: "mobile.hello";
  deviceId: string;
  accessToken: string;
  deviceProof: DeviceProof;
}

// --- Server Messages ---
export interface ChallengeMessage {
  type: "challenge";
  nonce: string;
  socketId: string;
}

export interface ChallengeResponse {
  type: "challenge.response";
  deviceId: string;
  signature: string;
}

export interface HelloAck {
  type: "hello.ack";
  deviceId: string;
  socketId: string;
  status: "authenticated";
}

export interface HelloReject {
  type: "hello.reject";
  reason: string;
}

// --- Link Flow ---
export interface LinkRequestMessage {
  type: "link.request";
  desktopDeviceId: string;
  workspaceId?: string;
  windowId?: string;
  terminalId?: string;
  mode: LinkMode;
}

export interface LinkApprovalMessage {
  type: "link.approve";
  sessionId: string;
  approved: boolean;
}

export interface LinkApprovalRequest {
  type: "link.approval_request";
  sessionId: string;
  mobileDeviceName: string;
  mobileDeviceType: DeviceType;
  workspaceId?: string;
  windowId?: string;
  terminalId?: string;
  mode: LinkMode;
}

export interface LinkApproved {
  type: "link.approved";
  sessionId: string;
  linkToken: string;
}

export interface LinkRejected {
  type: "link.rejected";
  sessionId: string;
  reason: string;
}

// --- WebRTC Signaling ---
export interface WebRTCOffer {
  type: "webrtc.offer";
  sessionId: string;
  sdp: string;
}

export interface WebRTCAnswer {
  type: "webrtc.answer";
  sessionId: string;
  sdp: string;
}

export interface WebRTCIce {
  type: "webrtc.ice";
  sessionId: string;
  candidate: string;
}

// --- Heartbeat ---
export interface PingMessage {
  type: "ping";
  ts: number;
}

export interface PongMessage {
  type: "pong";
  ts: number;
}

// --- Terminal Protocol ---
export interface TerminalAttach {
  type: "terminal.attach";
  sessionId: string;
  workspaceId: string;
  windowId: string;
  terminalId: string;
  mode: LinkMode;
  viewport: { cols: number; rows: number };
}

export interface TerminalAttached {
  type: "terminal.attached";
  terminalId: string;
  status: string;
  title: string;
  cwd: string;
}

export interface TerminalOutput {
  type: "terminal.output";
  terminalId: string;
  seq: number;
  data: string;
}

export interface TerminalInput {
  type: "terminal.input";
  terminalId: string;
  data: string;
}

export interface TerminalResize {
  type: "terminal.resize";
  terminalId: string;
  cols: number;
  rows: number;
}

export interface TerminalDetach {
  type: "terminal.detach";
  terminalId: string;
}

// --- Workspace Snapshot ---
export interface WorkspaceSnapshot {
  type: "workspace.snapshot";
  snapshotVersion?: 2;
  workspaces: WorkspaceSnapshotNode[];
  browserSessions?: BrowserSessionSummary[];
  capabilities?: WorkspaceCapabilities;
}

// --- Union type ---
export type WsMessage =
  | DesktopHello
  | MobileHello
  | ChallengeMessage
  | ChallengeResponse
  | HelloAck
  | HelloReject
  | LinkRequestMessage
  | LinkApprovalMessage
  | LinkApprovalRequest
  | LinkApproved
  | LinkRejected
  | WebRTCOffer
  | WebRTCAnswer
  | WebRTCIce
  | PingMessage
  | PongMessage
  | TerminalAttach
  | TerminalAttached
  | TerminalOutput
  | TerminalInput
  | TerminalResize
  | TerminalDetach
  | WorkspaceSnapshot;
