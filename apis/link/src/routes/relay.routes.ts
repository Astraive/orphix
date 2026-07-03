import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import { verifyJwt } from "../lib/verify";
import { getLinkSession } from "../services/session";

/**
 * Relay endpoint: dumb pipe that forwards frames by session_id.
 * Link API does NOT read frame payloads (they're E2EE).
 *
 * Protocol:
 * 1. Client/desktop connects to WSS /v1/link/relay
 * 2. Sends: { type: "relay.auth", sessionId, accessToken, role: "client"|"desktop" }
 * 3. Server verifies JWT, checks session ownership, registers socket
 * 4. All subsequent messages are forwarded to the other peer in the session
 */

interface RelaySession {
  sessionId: string;
  clientSocket: WebSocket | null;
  desktopSocket: WebSocket | null;
  createdAt: number;
  requireE2ee: boolean;
  allowPlainRelay: boolean;
}

const relaySessions = new Map<string, RelaySession>();

function getOrCreateSession(sessionId: string): RelaySession {
  let session = relaySessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      clientSocket: null,
      desktopSocket: null,
      createdAt: Date.now(),
      requireE2ee: true,
      allowPlainRelay: false,
    };
    relaySessions.set(sessionId, session);
  }
  return session;
}

function sendJson(ws: WebSocket, data: object) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

function rawSize(raw: WebSocket.RawData): number {
  if (typeof raw === "string") return Buffer.byteLength(raw);
  if (Buffer.isBuffer(raw)) return raw.length;
  if (raw instanceof ArrayBuffer) return raw.byteLength;
  return raw.reduce((sum, part) => sum + part.length, 0);
}

function rawText(raw: WebSocket.RawData): string {
  if (typeof raw === "string") return raw;
  if (Buffer.isBuffer(raw)) return raw.toString();
  if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString();
  return Buffer.concat(raw).toString();
}

export async function relayRoutes(app: FastifyInstance) {
  app.get("/v1/link/relay", { websocket: true }, (socket: WebSocket) => {
    let sessionId: string | null = null;
    let role: "client" | "desktop" | null = null;
    let authenticated = false;

    socket.on("message", async (raw) => {
      if (authenticated && sessionId && role) {
        if (rawSize(raw) > 256 * 1024) {
          sendJson(socket, { type: "relay.reject", reason: "Frame too large" });
          return;
        }

        const session = relaySessions.get(sessionId);
        if (!session) return;

        const text = rawText(raw);
        if (text.startsWith("{")) {
          try {
            const frame = JSON.parse(text) as any;
            if (frame.type === "relay.auth") {
              sendJson(socket, { type: "relay.reject", reason: "Already authenticated" });
              return;
            }
            if (
              frame.v === 1 &&
              session.requireE2ee &&
              !session.allowPlainRelay &&
              frame.flags?.encrypted !== true
            ) {
              sendJson(socket, { type: "relay.reject", reason: "E2EE required" });
              return;
            }
          } catch {
            // Opaque bytes are allowed after auth; relay remains a dumb pipe.
          }
        }

        const target = role === "client" ? session.desktopSocket : session.clientSocket;
        if (target && target.readyState === 1) {
          target.send(raw);
        }
        return;
      }

      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      // First message must be relay.auth
      if (msg.type === "relay.auth") {
        // Reject re-authentication
        if (authenticated) {
          sendJson(socket, { type: "relay.reject", reason: "Already authenticated" });
          socket.close();
          return;
        }

        const token = String(msg.accessToken || "");
        const payload = await verifyJwt(token);
        if (!payload) {
          sendJson(socket, { type: "relay.reject", reason: "Invalid token" });
          socket.close();
          return;
        }

        const requestedSessionId = String(msg.sessionId || "");
        role = msg.role === "desktop" ? "desktop" : "client";

        if (!requestedSessionId) {
          sendJson(socket, { type: "relay.reject", reason: "Missing sessionId" });
          socket.close();
          return;
        }

        // Verify session ownership: user must own the session
        const sessionData = await getLinkSession(requestedSessionId);
        if (!sessionData || sessionData.userId !== payload.sub) {
          sendJson(socket, { type: "relay.reject", reason: "Not a session participant" });
          socket.close();
          return;
        }

        sessionId = requestedSessionId;
        authenticated = true;

        const session = getOrCreateSession(sessionId);
        session.requireE2ee = msg.requireE2ee !== false;
        session.allowPlainRelay = msg.allowPlainRelay === true;

        // If role slot is already taken by another socket, close the old one
        if (role === "desktop" && session.desktopSocket && session.desktopSocket !== socket) {
          session.desktopSocket.close();
        } else if (role === "client" && session.clientSocket && session.clientSocket !== socket) {
          session.clientSocket.close();
        }

        if (role === "desktop") {
          session.desktopSocket = socket;
        } else {
          session.clientSocket = socket;
        }

        sendJson(socket, { type: "relay.ready", sessionId, role });
        console.log(`[relay] ${role} connected to session ${sessionId}`);
        return;
      }

      // No unauthenticated payload traffic.
    });

    socket.on("close", () => {
      if (!sessionId || !role) return;

      const session = relaySessions.get(sessionId);
      if (!session) return;

      if (role === "desktop") {
        session.desktopSocket = null;
      } else {
        session.clientSocket = null;
      }

      // Notify the other peer
      const other = role === "desktop" ? session.clientSocket : session.desktopSocket;
      if (other && other.readyState === 1) {
        sendJson(other, { type: "relay.peer_disconnected", role });
      }

      // Clean up empty sessions
      if (!session.clientSocket && !session.desktopSocket) {
        relaySessions.delete(sessionId);
      }

      console.log(`[relay] ${role} disconnected from session ${sessionId}`);
    });
  });
}
