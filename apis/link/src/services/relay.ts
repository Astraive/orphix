import { getRedis } from "../plugins/redis";
import { REDIS_TTL } from "@orphix/config";
import { sendToDevice } from "./presence";

interface RelaySession {
  sessionId: string;
  mobileDeviceId: string;
  desktopDeviceId: string;
  terminalId: string;
  startedAt: number;
  messageCount: number;
  lastMessageAt: number;
}

const relaySessions = new Map<string, RelaySession>();

const RELAY_MAX_MESSAGE_SIZE = 65536; // 64KB per message
const RELAY_SESSION_TTL = REDIS_TTL.linkSession; // Use same TTL as link session
const RELAY_MAX_MESSAGES_PER_SEC = 1000;
const RELAY_MAX_SESSION_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

// Cleanup expired relay sessions every 60 seconds
setInterval(() => {
  cleanupExpiredRelays();
}, 60_000);

export function startRelay(
  sessionId: string,
  mobileDeviceId: string,
  desktopDeviceId: string,
  terminalId: string,
): void {
  relaySessions.set(sessionId, {
    sessionId,
    mobileDeviceId,
    desktopDeviceId,
    terminalId,
    startedAt: Date.now(),
    messageCount: 0,
    lastMessageAt: Date.now(),
  });
}

export function stopRelay(sessionId: string): void {
  relaySessions.delete(sessionId);
}

export function getRelaySession(sessionId: string): RelaySession | undefined {
  return relaySessions.get(sessionId);
}

function isRateLimited(session: RelaySession): boolean {
  const now = Date.now();
  const elapsed = (now - session.lastMessageAt) / 1000;

  // Reset counter if more than 1 second has passed
  if (elapsed >= 1) {
    session.messageCount = 0;
    session.lastMessageAt = now;
  }

  session.messageCount++;
  return session.messageCount > RELAY_MAX_MESSAGES_PER_SEC;
}

function isExpired(session: RelaySession): boolean {
  const now = Date.now();
  return now - session.startedAt > RELAY_MAX_SESSION_DURATION_MS;
}

/**
 * Forward a relay message from one peer to the other.
 * Returns true if forwarded, false if invalid.
 */
export function forwardRelayMessage(
  sessionId: string,
  terminalId: string,
  data: string,
  direction: "input" | "output",
  senderDeviceId: string,
): boolean {
  const session = relaySessions.get(sessionId);
  if (!session) return false;

  // Validate message size
  if (data.length > RELAY_MAX_MESSAGE_SIZE) {
    console.warn(`[relay] Message too large: ${data.length} bytes (max ${RELAY_MAX_MESSAGE_SIZE})`);
    return false;
  }

  // Check rate limit
  if (isRateLimited(session)) {
    console.warn(`[relay] Rate limit exceeded for session ${sessionId}`);
    return false;
  }

  // Check session duration
  if (isExpired(session)) {
    console.warn(`[relay] Session ${sessionId} expired (max ${RELAY_MAX_SESSION_DURATION_MS / 60000} minutes)`);
    stopRelay(sessionId);
    return false;
  }

  // Validate terminalId matches session
  if (session.terminalId !== terminalId) {
    console.warn(`[relay] Terminal ID mismatch: expected ${session.terminalId}, got ${terminalId}`);
    return false;
  }

  // Determine target device
  const targetDeviceId =
    senderDeviceId === session.mobileDeviceId
      ? session.desktopDeviceId
      : session.mobileDeviceId;

  // Forward the message — use type that matches client expectations
  const msgType = direction === "output" ? "relay.terminal.output" : "relay.message";
  const msg = {
    type: msgType,
    sessionId,
    terminalId,
    data,
    direction,
  };

  return sendToDevice(targetDeviceId, msg);
}

/**
 * Forward relay.terminal.output from desktop to mobile.
 * This is used when the desktop sends terminal output via relay.
 */
export function forwardTerminalOutput(
  sessionId: string,
  terminalId: string,
  data: string,
): boolean {
  const session = relaySessions.get(sessionId);
  if (!session) return false;

  // Validate message size
  if (data.length > RELAY_MAX_MESSAGE_SIZE) {
    console.warn(`[relay] Terminal output too large: ${data.length} bytes (max ${RELAY_MAX_MESSAGE_SIZE})`);
    return false;
  }

  // Check rate limit
  if (isRateLimited(session)) {
    console.warn(`[relay] Rate limit exceeded for session ${sessionId}`);
    return false;
  }

  // Check session duration
  if (isExpired(session)) {
    stopRelay(sessionId);
    return false;
  }

  return sendToDevice(session.mobileDeviceId, {
    type: "relay.terminal.output",
    sessionId,
    terminalId,
    data,
  });
}

/**
 * Check if a relay session has expired and clean it up.
 */
export function cleanupExpiredRelays(): void {
  const now = Date.now();
  for (const [id, session] of relaySessions.entries()) {
    if (now - session.startedAt > RELAY_MAX_SESSION_DURATION_MS) {
      console.log(`[relay] Cleaning up expired session ${id}`);
      relaySessions.delete(id);
    }
  }
}
