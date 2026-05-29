import type { WebSocket } from "ws";
import type { FastifyRequest, FastifyInstance } from "fastify";
import { setOnline, setOffline, mapDeviceSocket, removeSocketMapping, isOnline, getSocketByDevice, refreshPresence, registerWs, unregisterWs, sendToDevice } from "../services/presence";
import { generateChallenge, verifyChallenge } from "../services/challenge";
import { createLinkSession, getSessionFromCache, updateSessionTransport, updateSessionStatus, generateLinkToken } from "../services/session";
import { getLinkSettings } from "../services/link-settings";
import { addLinkedDevice } from "../services/linked-devices";
import { sendJson, parseMessage, verifyJwt, verifyDeviceProof, getDevicePublicKey, checkDeviceTrust, checkDeviceOwnership } from "../lib/verify";
import type { LinkMode } from "@orphix/types";

interface MobileState {
  deviceId: string | null;
  userId: string | null;
  socketId: string;
  authenticated: boolean;
}

let socketCounter = 0;

function str(v: unknown): string { return String(v ?? ""); }
function num(v: unknown): number { return Number(v ?? 0); }

export function handleMobileSocket(socket: WebSocket, req: FastifyRequest, app: FastifyInstance) {
  const socketId = `ms_${++socketCounter}_${Date.now()}`;
  const state: MobileState = { deviceId: null, userId: null, socketId, authenticated: false };

  console.log(`[link] mobile socket connected: ${socketId}`);

  // Send challenge
  generateChallenge(socketId).then((nonce) => {
    sendJson(socket, { type: "challenge", nonce, socketId });
  });

  socket.on("message", async (raw) => {
    const msg = parseMessage(raw as Buffer);
    if (!msg) return;

    const type = str(msg.type);
    console.log(`[link] mobile ${socketId} received: ${type}`);

    switch (type) {
      case "challenge.response": {
        // Verify JWT (support both camelCase and snake_case)
        const accessToken = str(msg.accessToken || msg.access_token);
        const payload = await verifyJwt(accessToken);
        if (!payload) {
          sendJson(socket, { type: "hello.reject", reason: "Invalid token" });
          socket.close();
          return;
        }

        const deviceId = str(msg.deviceId || msg.device_id);

        // Verify device ownership
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

        // Verify device proof
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

        await setOnline("mobile", deviceId);
        await mapDeviceSocket(deviceId, socketId);
        registerWs(deviceId, socket);

        sendJson(socket, { type: "hello.ack", deviceId, socketId, status: "authenticated" });
        console.log(`[link] mobile authenticated: ${deviceId}`);
        break;
      }

      case "mobile.hello": {
        // JWT-only auth — valid JWT is sufficient for identity.
        // Validate that the claimed deviceId isn't already owned by another user.
        const accessToken = str(msg.accessToken || msg.access_token);
        const deviceId = str(msg.deviceId || msg.device_id);

        const payload = await verifyJwt(accessToken);
        if (!payload) {
          sendJson(socket, { type: "hello.reject", reason: "Invalid token" });
          socket.close();
          return;
        }

        // Check: if this deviceId is registered, it must belong to the same user
        const owned = await checkDeviceOwnership(payload.sub, deviceId);
        if (!owned) {
          // Device registered to a different user — reject to prevent spoofing
          sendJson(socket, { type: "hello.reject", reason: "Device belongs to another user" });
          socket.close();
          return;
        }

        state.userId = payload.sub;
        state.deviceId = deviceId;
        state.authenticated = true;

        await setOnline("mobile", deviceId);
        await mapDeviceSocket(deviceId, socketId);
        registerWs(deviceId, socket);

        sendJson(socket, { type: "hello.ack", deviceId, socketId, status: "authenticated" });
        console.log(`[link] mobile authenticated (JWT-only): ${deviceId}`);
        break;
      }

      case "web.hello": {
        // Web client auth — JWT-only, no Ed25519 or pre-registration needed
        const accessToken = str(msg.accessToken || msg.access_token);
        const deviceId = str(msg.deviceId || msg.device_id);

        console.log(`[link] mobile ${socketId} web.hello: token=${accessToken ? accessToken.substring(0, 20) + "..." : "EMPTY"}, deviceId=${deviceId}`);

        if (!accessToken || accessToken === "undefined") {
          sendJson(socket, { type: "hello.reject", reason: "Missing access token" });
          socket.close();
          return;
        }

        const payload = await verifyJwt(accessToken);
        if (!payload) {
          console.log(`[link] mobile ${socketId} web.hello: JWT verification FAILED`);
          sendJson(socket, { type: "hello.reject", reason: "Invalid token" });
          socket.close();
          return;
        }
        console.log(`[link] mobile ${socketId} web.hello: JWT OK, user=${payload.sub}`);

        state.userId = payload.sub;
        state.deviceId = deviceId;
        state.authenticated = true;

        await setOnline("mobile", deviceId);
        await mapDeviceSocket(deviceId, socketId);
        registerWs(deviceId, socket);

        sendJson(socket, { type: "hello.ack", deviceId, socketId, status: "authenticated" });
        console.log(`[link] web authenticated: ${deviceId}`);
        break;
      }

      case "link.request": {
        if (!state.authenticated || !state.deviceId || !state.userId) return;

        const desktopDeviceId = str(msg.desktopDeviceId || msg.desktop_device_id);
        const mode = str(msg.mode) as LinkMode;
        const transportMode = str(msg.transportMode || msg.transport_mode || "auto");
        const workspaceId = msg.workspaceId || msg.workspace_id ? str(msg.workspaceId || msg.workspace_id) : undefined;
        const windowId = msg.windowId || msg.window_id ? str(msg.windowId || msg.window_id) : undefined;
        const terminalId = msg.terminalId || msg.terminal_id ? str(msg.terminalId || msg.terminal_id) : undefined;

        // 1. Check desktop is online
        const desktopOnline = await isOnline("desktop", desktopDeviceId);
        if (!desktopOnline) {
          sendJson(socket, { type: "link.rejected", sessionId: "", reason: "Desktop offline" });
          return;
        }

        // 2. Verify desktop ownership
        const desktopOwned = await checkDeviceOwnership(state.userId, desktopDeviceId);
        if (!desktopOwned) {
          sendJson(socket, { type: "link.rejected", sessionId: "", reason: "Desktop not owned by user" });
          return;
        }

        // 3. Check trust relationship
        let trustLevel: string | null = "full_control";
        try {
          const trust = await checkDeviceTrust(state.deviceId, desktopDeviceId);
          trustLevel = trust.trustLevel;
        } catch {
          // Same-user auto-trust
        }

        // 4. Create link session
        const session = await createLinkSession(
          state.userId,
          desktopDeviceId,
          state.deviceId,
          mode,
          workspaceId,
          windowId,
          terminalId,
        );

        // 5. Determine device name
        const isWeb = state.deviceId.startsWith("web_");
        const deviceName = isWeb ? "Web Dashboard" : str(msg.deviceName || "Mobile App");

        // 6. Check auto-approve settings
        const settings = await getLinkSettings(state.userId);
        const shouldAutoApprove = settings.autoApprove || settings.autoApproveSameUser;

        if (shouldAutoApprove) {
          // Auto-approve: generate link token and send directly
          const linkToken = await generateLinkToken(session.id);

          await updateSessionStatus(session.id, "approved");

          // Notify web client
          sendJson(socket, { type: "link.approved", sessionId: session.id, linkToken });

          // Notify desktop
          sendToDevice(desktopDeviceId, { type: "link.approved", sessionId: session.id, linkToken, transportMode });

          // Track linked device
          addLinkedDevice(desktopDeviceId, state.deviceId);

          console.log(`[link] auto-approved: session=${session.id}, web=${state.deviceId}, desktop=${desktopDeviceId}`);
        } else {
          // Manual approval: forward to desktop
          const approvalRequest = {
            type: "link.approval_request",
            sessionId: session.id,
            mobileDeviceName: deviceName,
            mobileDeviceType: isWeb ? "web" : "mobile",
            workspaceId,
            windowId,
            terminalId,
            mode,
            transportMode,
            requireE2ee: settings.websocket.requireE2ee,
            expiresIn: settings.approvalTimeout,
          };

          await app.redis.setex(
            `link:approval:${session.id}`,
            settings.approvalTimeout,
            JSON.stringify(approvalRequest),
          );

          sendToDevice(desktopDeviceId, approvalRequest);
          sendJson(socket, { type: "link.pending", sessionId: session.id });
        }
        break;
      }

      case "webrtc.offer": {
        if (!state.authenticated || !state.deviceId) return;
        const sessionId = str(msg.sessionId);
        const session = await getSessionFromCache(sessionId);
        // Verify sender is the session's mobile participant
        if (session && session.desktopDeviceId && session.mobileDeviceId === state.deviceId) {
          sendToDevice(String(session.desktopDeviceId), msg);
        }
        break;
      }

      case "webrtc.ice": {
        if (!state.authenticated || !state.deviceId) return;
        const sessionId = str(msg.sessionId);
        const session = await getSessionFromCache(sessionId);
        // Verify sender is the session's mobile participant
        if (session && session.desktopDeviceId && session.mobileDeviceId === state.deviceId) {
          sendToDevice(String(session.desktopDeviceId), msg);
        }
        break;
      }

      case "relay.start": {
        if (!state.authenticated) return;
        const sessionId = str(msg.sessionId);
        const terminalId = str(msg.terminalId);
        const session = await getSessionFromCache(sessionId);
        if (!session || session.mobileDeviceId !== state.deviceId) return;

        // Session must be approved before relay can start
        if (session.status !== "approved") {
          sendJson(socket, { type: "link.rejected", sessionId, reason: "Session not approved" });
          return;
        }

        // Import relay service dynamically to avoid circular deps
        const { startRelay } = await import("../services/relay");
        startRelay(
          sessionId,
          String(session.mobileDeviceId),
          String(session.desktopDeviceId),
          terminalId,
        );

        // Track transport mode on session
        await updateSessionTransport(sessionId, "websocket");

        // Notify desktop that relay is starting
        sendToDevice(String(session.desktopDeviceId), {
          type: "relay.start",
          sessionId,
          terminalId,
          mode: session.mode,
          transportMode: str(msg.transportMode || msg.transport_mode || "websocket"),
        });

        sendJson(socket, { type: "relay.ready", sessionId });
        break;
      }

      case "relay.message": {
        if (!state.authenticated || !state.deviceId) return;
        const sessionId = str(msg.sessionId);
        const terminalId = str(msg.terminalId);
        const data = str(msg.data);

        const { forwardRelayMessage } = await import("../services/relay");
        forwardRelayMessage(sessionId, terminalId, data, "input", state.deviceId);
        break;
      }

      case "relay.stop": {
        if (!state.authenticated) return;
        const sessionId = str(msg.sessionId);
        const { stopRelay } = await import("../services/relay");
        stopRelay(sessionId);
        break;
      }

      case "terminal.create": {
        if (!state.authenticated || !state.deviceId) return;
        // Forward terminal.create to the desktop
        // The web client includes desktopDeviceId in the message
        const desktopDeviceId = str(msg.desktopDeviceId || msg.desktop_device_id);
        if (desktopDeviceId) {
          sendToDevice(desktopDeviceId, msg);
        }
        break;
      }

      case "ping": {
        sendJson(socket, { type: "pong", ts: Date.now() });
        if (state.deviceId) {
          await refreshPresence("mobile", state.deviceId);
        }
        break;
      }
    }
  });

  socket.on("close", async (code, reason) => {
    console.log(`[link] mobile socket disconnected: ${socketId}, code=${code}, reason=${reason?.toString() ?? "none"}`);
    if (state.deviceId) {
      unregisterWs(state.deviceId, socket);
      await setOffline("mobile", state.deviceId);
      await removeSocketMapping(socketId);
    }
  });
}
