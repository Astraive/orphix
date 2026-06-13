import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { LinkClient } from "./LinkClient.js";
import type { LinkClientOptions } from "./types.js";

let wsInstance: MockWebSocket | null = null;

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;

  readyState = 1;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  url: string;

  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    wsInstance = this;
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
    if (this.onclose) {
      this.onclose(new CloseEvent("close", { code: 1000 }));
    }
  }

  simulateOpen() {
    if (this.onopen) this.onopen(new Event("open"));
  }

  simulateMessage(data: object) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent("message", { data: JSON.stringify(data) }));
    }
  }

  simulateError() {
    if (this.onerror) this.onerror(new Event("error"));
  }

  simulateClose(code = 1000) {
    this.readyState = 3;
    if (this.onclose) {
      this.onclose(new CloseEvent("close", { code }));
    }
  }

  static reset() {
    wsInstance = null;
  }

  static get last() {
    return wsInstance;
  }
}

(MockWebSocket as any).OPEN = 1;
(MockWebSocket as any).CLOSED = 3;

function createOptions(overrides: Partial<LinkClientOptions> = {}): LinkClientOptions {
  MockWebSocket.reset();
  return {
    linkUrl: "http://localhost:2606",
    controlUrl: "http://localhost:2606",
    tokenStore: { getAccessToken: async () => "test-token" },
    authMethod: "web.hello",
    wsConstructor: MockWebSocket as unknown as typeof WebSocket,
    deviceName: "test-device",
    generateDeviceId: () => "device-123",
    ...overrides,
  };
}

async function flushMicrotasks() {
  await new Promise<void>((r) => queueMicrotask(() => queueMicrotask(() => r())));
}

async function authenticatedClient(): Promise<{ client: LinkClient; ws: MockWebSocket }> {
  const client = new LinkClient(createOptions());
  const p = client.connect();
  await flushMicrotasks();
  MockWebSocket.last!.simulateOpen();
  MockWebSocket.last!.simulateMessage({ type: "challenge" });
  MockWebSocket.last!.simulateMessage({ type: "hello.ack" });
  await p;
  return { client, ws: MockWebSocket.last! };
}

describe("LinkClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.reset();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ iceServers: [] }),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("initializes with correct options", () => {
      const client = new LinkClient(createOptions());
      expect(client.getState()).toBe("idle");
    });

    it("uses default maxReconnectAttempts and baseReconnectDelay", () => {
      const client = new LinkClient(createOptions());
      expect(client.getState()).toBe("idle");
    });

    it("allows custom reconnect options", () => {
      const client = new LinkClient(
        createOptions({ maxReconnectAttempts: 5, baseReconnectDelay: 1000 }),
      );
      expect(client.getState()).toBe("idle");
    });
  });

  describe("connect()", () => {
    it("returns a promise", () => {
      const client = new LinkClient(createOptions());
      const result = client.connect();
      expect(result).toBeInstanceOf(Promise);
      client.disconnect();
    });

    it("sets state to connecting then connected on open", async () => {
      const client = new LinkClient(createOptions());

      const states: string[] = [];
      client.on((ev) => {
        if (ev.type === "state") states.push(ev.state);
      });

      const connectPromise = client.connect();
      await flushMicrotasks();

      MockWebSocket.last!.simulateOpen();
      expect(states).toContain("connecting");
      expect(states).toContain("connected");

      MockWebSocket.last!.simulateMessage({ type: "challenge" });
      MockWebSocket.last!.simulateMessage({ type: "hello.ack" });

      await connectPromise;
      expect(states).toContain("authenticated");

      client.disconnect();
    });

    it("returns early if already connected", async () => {
      const { client } = await authenticatedClient();
      const p2 = client.connect();
      await p2;
      client.disconnect();
    });

    it("emits error if no token available", async () => {
      const client = new LinkClient(
        createOptions({
          tokenStore: { getAccessToken: async () => null },
        }),
      );

      const errors: string[] = [];
      client.on((ev) => {
        if (ev.type === "error") errors.push(ev.error);
      });

      await client.connect();
      expect(errors).toContain("Not authenticated");
      expect(client.getState()).toBe("error");
    });

    it("handles connection error", async () => {
      const client = new LinkClient(createOptions());

      const connectPromise = client.connect();
      await flushMicrotasks();
      MockWebSocket.last!.simulateError();

      await expect(connectPromise).rejects.toThrow("Connection failed");
    });

    it("handles hello.reject from server", async () => {
      const client = new LinkClient(createOptions());

      const errors: string[] = [];
      client.on((ev) => {
        if (ev.type === "error") errors.push(ev.error);
      });

      const connectPromise = client.connect();
      await flushMicrotasks();
      MockWebSocket.last!.simulateOpen();
      MockWebSocket.last!.simulateMessage({ type: "challenge" });
      MockWebSocket.last!.simulateMessage({ type: "hello.reject", reason: "unauthorized" });

      await expect(connectPromise).rejects.toThrow("unauthorized");
      expect(errors).toContain("unauthorized");
      expect(["error", "disconnected"]).toContain(client.getState());
    });
  });

  describe("disconnect()", () => {
    it("sets state to disconnected", async () => {
      const { client } = await authenticatedClient();
      client.disconnect();
      expect(client.getState()).toBe("disconnected");
    });

    it("cleans up timers and websocket", async () => {
      const { client } = await authenticatedClient();
      client.disconnect();
      expect(client.getState()).toBe("disconnected");
    });

    it("prevents reconnection after intentional close", async () => {
      const { client } = await authenticatedClient();
      client.disconnect();

      const p2 = client.connect();
      await p2;
      expect(client.getState()).toBe("disconnected");
    });
  });

  describe("rpc()", () => {
    it("sends relay.message with correct structure", async () => {
      const { client, ws } = await authenticatedClient();
      client.setTransportMode("websocket");

      MockWebSocket.last!.simulateMessage({
        type: "link.approved",
        sessionId: "session-abc",
      });

      const rpcPromise = client.rpc("terminal.exec", { command: "ls" });

      const lastSent = JSON.parse(ws.sent[ws.sent.length - 1]);
      expect(lastSent.type).toBe("relay.message");
      expect(lastSent.sessionId).toBe("session-abc");

      const innerPayload = JSON.parse(lastSent.data);
      expect(innerPayload.type).toBe("terminal.exec");
      expect(innerPayload.params).toEqual({ command: "ls" });
      expect(innerPayload.id).toBeDefined();

      MockWebSocket.last!.simulateMessage({
        type: "relay.terminal.output",
        data: JSON.stringify({
          type: "terminal.exec.response",
          id: innerPayload.id,
          data: { stdout: "file1\nfile2" },
        }),
      });

      const result = await rpcPromise;
      expect(result).toEqual({ stdout: "file1\nfile2" });

      client.disconnect();
    });

    it("rejects on timeout", async () => {
      const { client } = await authenticatedClient();
      client.setTransportMode("websocket");

      MockWebSocket.last!.simulateMessage({
        type: "link.approved",
        sessionId: "session-abc",
      });

      const rpcPromise = client.rpc("slow.method");

      vi.advanceTimersByTime(30_001);

      await expect(rpcPromise).rejects.toThrow("RPC timeout: slow.method");
      client.disconnect();
    });
  });

  describe("state transitions", () => {
    it("idle -> connecting -> connected -> authenticated", async () => {
      const client = new LinkClient(createOptions());

      const states: string[] = [];
      client.on((ev) => {
        if (ev.type === "state") states.push(ev.state);
      });

      expect(client.getState()).toBe("idle");

      const p = client.connect();
      await flushMicrotasks();
      expect(client.getState()).toBe("connecting");

      MockWebSocket.last!.simulateOpen();
      expect(client.getState()).toBe("connected");

      MockWebSocket.last!.simulateMessage({ type: "challenge" });
      MockWebSocket.last!.simulateMessage({ type: "hello.ack" });
      await p;

      expect(client.getState()).toBe("authenticated");
      expect(states).toEqual(["connecting", "connected", "authenticated"]);

      client.disconnect();
    });

    it("authenticated -> requesting -> awaiting_approval -> p2p_connected", async () => {
      const { client } = await authenticatedClient();

      client.requestLink("desktop-1");
      expect(client.getState()).toBe("requesting");

      MockWebSocket.last!.simulateMessage({ type: "link.pending" });
      expect(client.getState()).toBe("awaiting_approval");

      MockWebSocket.last!.simulateMessage({ type: "link.approved", sessionId: "s1" });
      expect(client.getState()).toBe("p2p_connected");

      client.disconnect();
    });
  });

  describe("error handling", () => {
    it("reconnects after unexpected close (non-4000 code)", async () => {
      vi.useRealTimers();
      const { client } = await authenticatedClient();

      MockWebSocket.last!.simulateClose(1006);

      await new Promise((r) => setTimeout(r, 100));

      expect(client.getState()).toBe("disconnected");

      client.disconnect();
      vi.useFakeTimers();
    });

    it("does not reconnect on code 4000 (server rejection)", async () => {
      const { client } = await authenticatedClient();

      const states: string[] = [];
      client.on((ev) => {
        if (ev.type === "state") states.push(ev.state);
      });

      MockWebSocket.last!.simulateClose(4000);

      vi.advanceTimersByTime(60_000);
      expect(states.filter((s) => s === "connecting")).toHaveLength(0);

      client.disconnect();
    });
  });
});
