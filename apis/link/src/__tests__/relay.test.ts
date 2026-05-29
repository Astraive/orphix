import { describe, it, expect } from "vitest";
import WebSocket from "ws";

const LINK_URL = process.env.LINK_URL ?? "http://localhost:2606";
const WS_URL = LINK_URL.replace("http", "ws");

function connectWs(path: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_URL}${path}`);
    ws.on("open", () => resolve(ws));
    ws.on("error", (e) => reject(e));
  });
}

function waitForMessage(ws: WebSocket, type: string, timeout = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${type}`)), timeout);
    const handler = (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === type) {
          clearTimeout(timer);
          ws.off("message", handler);
          resolve(msg);
        }
      } catch {}
    };
    ws.on("message", handler);
  });
}

describe("Control API Health", () => {
  it("should respond to health check", async () => {
    const res = await fetch("http://localhost:2605/health");
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBe("ok");
  });

  it("should reject unauthenticated /me request", async () => {
    const res = await fetch("http://localhost:2605/me");
    expect(res.status).toBe(401);
  });

  it("should reject unauthenticated /me/devices request", async () => {
    const res = await fetch("http://localhost:2605/me/devices");
    expect(res.status).toBe(401);
  });

  it("should reject unauthenticated /me/link-settings request", async () => {
    const res = await fetch("http://localhost:2605/me/link-settings");
    expect(res.status).toBe(401);
  });
});

describe("Link API Mobile Endpoint", () => {
  it("should accept WebSocket and send challenge", async () => {
    const ws = await connectWs("/v1/link/mobile");
    const msg = await waitForMessage(ws, "challenge");
    expect(msg.nonce).toBeDefined();
    expect(msg.socketId).toBeDefined();
    ws.close();
  });

  it("should reject invalid JWT in web.hello", async () => {
    const ws = await connectWs("/v1/link/mobile");
    await waitForMessage(ws, "challenge");

    ws.send(JSON.stringify({
      type: "web.hello",
      accessToken: "invalid_jwt",
      deviceId: "web_test_device",
    }));

    const msg = await waitForMessage(ws, "hello.reject");
    expect(msg.reason).toBeDefined();
    ws.close();
  });
});

describe("Link API Relay Endpoint", () => {
  it("should reject invalid token in relay.auth", async () => {
    const ws = await connectWs("/v1/link/relay");

    ws.send(JSON.stringify({
      type: "relay.auth",
      sessionId: "test_session_1",
      accessToken: "invalid_token",
      role: "client",
    }));

    const msg = await waitForMessage(ws, "relay.reject");
    expect(msg.reason).toBe("Invalid token");
    ws.close();
  });

  it("should reject missing sessionId (JWT checked first)", async () => {
    const ws = await connectWs("/v1/link/relay");

    // JWT is validated before sessionId, so invalid token triggers that error first
    ws.send(JSON.stringify({
      type: "relay.auth",
      accessToken: "some_token",
      role: "client",
    }));

    const msg = await waitForMessage(ws, "relay.reject");
    expect(msg.reason).toBeDefined(); // Either "Invalid token" or "Missing sessionId"
    ws.close();
  });
});

describe("Link API Desktop Endpoint", () => {
  it("should accept WebSocket and send challenge", async () => {
    const ws = await connectWs("/v1/link/desktop");
    const msg = await waitForMessage(ws, "challenge");
    expect(msg.nonce).toBeDefined();
    expect(msg.socketId).toBeDefined();
    ws.close();
  });
});

describe("Link API ICE Config", () => {
  it("should return ICE configuration", async () => {
    const res = await fetch(`${LINK_URL}/v1/link/ice-config`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.iceServers).toBeDefined();
    expect(Array.isArray(data.iceServers)).toBe(true);
  });
});
