import type { WebSocket } from "ws";
import type { FastifyInstance } from "fastify";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { getConvex } from "./plugins/convex";
import { getRedis } from "./plugins/redis";
import { config } from "./config";
import { timingSafeEqual } from "@orphix/encryption";

const CONVEX_AUTH_ISSUER = "https://auth.convex.cloud";
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(convexUrl: string) {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${convexUrl}/api/auth/.well-known/jwks.json`));
  }
  return jwks;
}

async function verifyToken(token: string, convexUrl: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwks(convexUrl), {
      issuer: CONVEX_AUTH_ISSUER,
    });
    return { sub: payload.sub as string };
  } catch {
    return null;
  }
}

function sendJson(ws: WebSocket, data: object) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

interface Client {
  socket: WebSocket;
  userId: string;
  deviceId: string;
  role: "desktop" | "mobile";
  sessionId: string;
}

const sessions = new Map<string, { desktop: Client | null; mobile: Client | null }>();

export function handleRelaySocket(socket: WebSocket, app: FastifyInstance) {
  let authenticated = false;
  let client: Client | null = null;

  socket.on("message", async (raw) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (!authenticated) {
      if (msg.type !== "relay.auth") {
        sendJson(socket, { type: "relay.reject", reason: "Not authenticated" });
        return;
      }

      const token = String(msg.accessToken || "");
      const payload = await verifyToken(token, config.convexUrl);
      if (!payload) {
        sendJson(socket, { type: "relay.reject", reason: "Invalid token" });
        socket.close();
        return;
      }

      const sessionId = String(msg.sessionId || "");
      const deviceId = String(msg.deviceId || "");
      const role = msg.role === "desktop" ? "desktop" : "mobile";

      if (!sessionId || !deviceId) {
        sendJson(socket, { type: "relay.reject", reason: "Missing sessionId or deviceId" });
        socket.close();
        return;
      }

      // Verify session exists and user owns it
      const convex = getConvex();
      const session = await convex.query("linkSessions:get" as any, { sessionId });
      if (!session || session.userId !== payload.sub) {
        sendJson(socket, { type: "relay.reject", reason: "Not a session participant" });
        socket.close();
        return;
      }

      if (session.status !== "approved") {
        sendJson(socket, { type: "relay.reject", reason: "Session not approved" });
        socket.close();
        return;
      }

      // Verify deviceId matches session participants
      if (role === "desktop" && session.desktopDeviceId !== deviceId) {
        sendJson(socket, { type: "relay.reject", reason: "deviceId mismatch" });
        socket.close();
        return;
      }
      if (role === "mobile" && session.mobileDeviceId !== deviceId) {
        sendJson(socket, { type: "relay.reject", reason: "deviceId mismatch" });
        socket.close();
        return;
      }

      console.log(`[relay] ${role} authenticated for session ${sessionId}, device ${deviceId}`);

      client = { socket, userId: payload.sub, deviceId, role, sessionId };
      authenticated = true;

      // Register in session
      let sess = sessions.get(sessionId);
      if (!sess) {
        sess = { desktop: null, mobile: null };
        sessions.set(sessionId, sess);
      }
      if (role === "desktop") sess.desktop = client;
      else sess.mobile = client;

      // Set presence
      const redis = getRedis();
      const presenceKey = role === "desktop" ? `presence:desktop:${deviceId}` : `presence:mobile:${deviceId}`;
      await redis.setex(presenceKey, 60, "online");

      sendJson(socket, { type: "relay.ready", sessionId, role });
      console.log(`[relay] ${role} connected to session ${sessionId}`);
      return;
    }

    // Forward messages to the other peer
    if (client) {
      const sess = sessions.get(client.sessionId);
      if (!sess) return;

      const target = client.role === "desktop" ? sess.mobile : sess.desktop;
      if (target && target.socket.readyState === 1) {
        target.socket.send(raw);
      }
    }
  });

  socket.on("close", async () => {
    if (!client) return;

    const sess = sessions.get(client.sessionId);
    if (sess) {
      if (client.role === "desktop") sess.desktop = null;
      else sess.mobile = null;

      // Notify the other peer
      const other = client.role === "desktop" ? sess.mobile : sess.desktop;
      if (other && other.socket.readyState === 1) {
        sendJson(other.socket, { type: "relay.peer_disconnected", role: client.role });
      }

      // Clean up empty sessions
      if (!sess.desktop && !sess.mobile) {
        sessions.delete(client.sessionId);
      }
    }

    // Clear presence
    const redis = getRedis();
    const presenceKey = client.role === "desktop" ? `presence:desktop:${client.deviceId}` : `presence:mobile:${client.deviceId}`;
    await redis.del(presenceKey);

    console.log(`[relay] ${client.role} disconnected from session ${client.sessionId}`);
  });
}
