import type { WebSocket } from "ws";
import type { FastifyRequest, FastifyInstance } from "fastify";
import { setOnline, setOffline, mapDeviceSocket, removeSocketMapping, getSocketByDevice, refreshPresence, registerWs, unregisterWs, sendToDevice } from "../services/presence";
import { generateChallenge, verifyChallenge } from "../services/challenge";
import { updateSessionStatus, getLinkSession, generateLinkToken } from "../services/session";
import { addLinkedDevice, removeLinkedDevice, getLinkedDevices, clearLinkedDevices } from "../services/linked-devices";
import { sendJson, parseMessage, verifyJwt, verifyDeviceProof, getDevicePublicKey, checkDeviceOwnership } from "../lib/verify";

interface DesktopState {
  deviceId: string | null;
  userId: string | null;
  socketId: string;
  authenticated: boolean;
}

let socketCounter = 0;

function str(v: unknown): string { return String(v ?? ""); }
function num(v: unknown): number { return Number(v ?? 0); }
function bool(v: unknown): boolean { return Boolean(v); }

export function handleDesktopSocket(socket: WebSocket, req: FastifyRequest, app: FastifyInstance) {
  const socketId = `ds_${++socketCounter}_${Date.now()}`;
  const state: DesktopState = { deviceId: null, userId: null, socketId, authenticated: false };

  console.log(`[link] desktop socket connected: ${socketId}`);

  // Send challenge immediately
  generateChallenge(socketId).then((nonce) => {
    sendJson(socket, { type: "challenge", nonce, socketId });
  });

  socket.on("message", async (raw) => {
    const msg = parseMessage(raw as Buffer);
    if (!msg) return;

    const type = str(msg.type);

    switch (type) {
      case "challenge.response": {
        // Verify JWT first (support both camelCase and snake_case for compatibility)
        const accessToken = str(msg.accessToken || msg.access_token);
        const payload = await verifyJwt(accessToken);
        if (!payload) {
          sendJson(socket, { type: "hello.reject", reason: "Invalid token" });
          socket.close();
          return;
        }

        const deviceId = str(msg.deviceId || msg.device_id);

        // Verify device ownership (device must belong to the JWT user)
        const owned = await checkDeviceOwnership(payload.sub, deviceId);
        if (!owned) {
          sendJson(socket, { type: "hello.reject", reason: "Device not owned by user" });
          socket.close();
          return;
        }

        // Verify challenge nonce (prevents replay attacks)
        const nonce = str(msg.nonce);
        const challengeValid = await verifyChallenge(socketId, nonce);
        if (!challengeValid) {
          sendJson(socket, { type: "hello.reject", reason: "Invalid or expired challenge" });
          socket.close();
          return;
        }

        // Verify device proof (Ed25519 signature of nonce + socketId + timestamp)
        const signature = str(msg.signature);
        const timestamp = num(msg.timestamp);

        const proofValid = await verifyDeviceProof(deviceId, nonce, socketId, timestamp, signature);
        if (!proofValid) {
          sendJson(socket, { type: "hello.reject", reason: "Invalid device proof" });
          socket.close();
          return;
        }

        state.userId = payload.sub;
        state.deviceId = deviceId;
        state.authenticated = true;

        await setOnline("desktop", deviceId);
        await mapDeviceSocket(deviceId, socketId);
        registerWs(deviceId, socket);

        sendJson(socket, { type: "hello.ack", deviceId, socketId, status: "authenticated" });
        console.log(`[link] desktop authenticated: ${deviceId}`);
        break;
      }

      case "desktop.hello": {
        // JWT-only auth (for clients that can't do Ed25519 yet)
        const accessToken = str(msg.accessToken || msg.access_token);
        const deviceId = str(msg.deviceId || msg.device_id);

        const payload = await verifyJwt(accessToken);
        if (!payload) {
          sendJson(socket, { type: "hello.reject", reason: "Invalid token" });
          socket.close();
          return;
        }

        // Verify device ownership
        const owned = await checkDeviceOwnership(payload.sub, deviceId);
        if (!owned) {
          sendJson(socket, { type: "hello.reject", reason: "Device not owned by user" });
          socket.close();
          return;
        }

        const publicKey = await getDevicePublicKey(deviceId);
        if (!publicKey) {
          sendJson(socket, { type: "hello.reject", reason: "Device not registered" });
          socket.close();
          return;
        }

        state.userId = payload.sub;
        state.deviceId = deviceId;
        state.authenticated = true;

        await setOnline("desktop", deviceId);
        await mapDeviceSocket(deviceId, socketId);
        registerWs(deviceId, socket);

        sendJson(socket, { type: "hello.ack", deviceId, socketId, status: "authenticated" });
        console.log(`[link] desktop authenticated (JWT-only): ${deviceId}`);
        break;
      }

      case "link.approve": {
        if (!state.authenticated || !state.deviceId || !state.userId) return;

        const sessionId = str(msg.sessionId || msg.session_id);
        const approved = bool(msg.approved);

        // Verify this desktop owns the session
        const session = await getLinkSession(sessionId);
        if (!session || session.desktopDeviceId !== state.deviceId) {
          sendJson(socket, { type: "link.rejected", sessionId, reason: "Invalid session" });
          return;
        }

        if (approved) {
          await updateSessionStatus(sessionId, "approved");
          const linkToken = await generateLinkToken(sessionId);

          // Track linked device
          if (session.mobileDeviceId && state.deviceId) {
            addLinkedDevice(state.deviceId, String(session.mobileDeviceId));
          }

          // Store approval for mobile to pick up
          await app.redis.setex(`link:approved:${sessionId}`, 300, JSON.stringify({ sessionId, linkToken }));

          // Notify desktop
          sendJson(socket, { type: "link.approved", sessionId, linkToken });

          // Push approval directly to mobile via WebSocket
          if (session.mobileDeviceId) {
            sendToDevice(String(session.mobileDeviceId), {
              type: "link.approved",
              sessionId,
              linkToken,
              transportMode: str(msg.transportMode || msg.transport_mode || "auto"),
            });
          }
        } else {
          await updateSessionStatus(sessionId, "rejected");
          sendJson(socket, { type: "link.rejected", sessionId, reason: "Rejected by desktop" });
        }
        break;
      }

      case "webrtc.answer": {
        if (!state.authenticated || !state.deviceId) return;
        const sessionId = str(msg.sessionId);
        const session = await getLinkSession(sessionId);
        if (session && session.mobileDeviceId && session.desktopDeviceId === state.deviceId) {
          sendToDevice(String(session.mobileDeviceId), msg);
          console.log(`[link] webrtc.answer forwarded to ${session.mobileDeviceId}`);
        } else {
          console.log(`[link] webrtc.answer: session not found or sender mismatch (session=${sessionId})`);
        }
        break;
      }

      case "webrtc.ice": {
        if (!state.authenticated || !state.deviceId) return;
        const sessionId = str(msg.sessionId);
        const session = await getLinkSession(sessionId);
        if (session && session.mobileDeviceId && session.desktopDeviceId === state.deviceId) {
          sendToDevice(String(session.mobileDeviceId), msg);
        }
        break;
      }

      case "relay.message": {
        if (!state.authenticated || !state.deviceId) return;
        // Forward relay output directly to all linked clients
        const linked = getLinkedDevices(state.deviceId);
        for (const mobileId of linked) {
          sendToDevice(mobileId, { type: "relay.terminal.output", data: msg.data, terminalId: msg.terminalId });
        }
        break;
      }

      case "workspace.list": {
        if (!state.authenticated || !state.deviceId) return;
        const linked = getLinkedDevices(state.deviceId);
        console.log(`[link] workspace.list from desktop ${state.deviceId}, forwarding to ${linked.size} linked clients`);
        for (const mobileId of linked) {
          sendToDevice(mobileId, msg);
        }
        break;
      }

      case "ping": {
        sendJson(socket, { type: "pong", ts: Date.now() });
        if (state.deviceId) {
          await refreshPresence("desktop", state.deviceId);
        }
        break;
      }
    }
  });

  socket.on("close", async () => {
    console.log(`[link] desktop socket disconnected: ${socketId}`);
    if (state.deviceId) {
      unregisterWs(state.deviceId, socket);
      clearLinkedDevices(state.deviceId);
      await setOffline("desktop", state.deviceId);
      await removeSocketMapping(socketId);
    }
  });
}
