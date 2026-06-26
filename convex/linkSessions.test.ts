import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@convex-dev/auth/server", () => ({
  getAuthUserId: vi.fn(),
}));

import { create, updateStatus, end, get } from "./linkSessions";
import { getAuthUserId } from "@convex-dev/auth/server";

const userId = "user1" as any;
const otherUserId = "user2" as any;

function makeCtx(authUserId: string | null = userId) {
  const dbStore = new Map<string, any>();

  vi.mocked(getAuthUserId).mockResolvedValue(authUserId);

  return {
    db: {
      insert: vi.fn(async (table: string, doc: any) => {
        const id = `${table}:${dbStore.size + 1}` as any;
        dbStore.set(id, { ...doc, _id: id });
        return id;
      }),
      get: vi.fn(async (id: any) => dbStore.get(id) ?? null),
      patch: vi.fn(async (id: any, fields: any) => {
        const doc = dbStore.get(id);
        if (doc) Object.assign(doc, fields);
      }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("create", () => {
  it("authenticated user can create session", async () => {
    const ctx = makeCtx(userId);
    const result = await (create as any).handler(ctx, {
      desktopDeviceId: "d1",
      mobileDeviceId: "m1",
      mode: "mirror",
    });

    expect(result).toBeDefined();
    expect(result.userId).toBe(userId);
    expect(result.status).toBe("requested");
    expect(result.transport).toBe("pending");
    expect(result.desktopDeviceId).toBe("d1");
    expect(result.mobileDeviceId).toBe("m1");
    expect(result.mode).toBe("mirror");
  });

  it("unauthenticated user gets error", async () => {
    const ctx = makeCtx(null);
    await expect(
      (create as any).handler(ctx, {
        desktopDeviceId: "d1",
        mobileDeviceId: "m1",
        mode: "mirror",
      })
    ).rejects.toThrow("Not authenticated");
  });
});

describe("updateStatus", () => {
  it("can update own session", async () => {
    const ctx = makeCtx(userId);
    const id = await ctx.db.insert("linkSessions", {
      userId,
      desktopDeviceId: "d1",
      mobileDeviceId: "m1",
      mode: "mirror",
      status: "requested",
      transport: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });

    await (updateStatus as any).handler(ctx, { sessionId: id, status: "accepted" });

    const doc = await ctx.db.get(id);
    expect(doc.status).toBe("accepted");
  });

  it("CANNOT update another user's session", async () => {
    const ctx = makeCtx(userId);
    const otherCtx = makeCtx(otherUserId);
    const id = await ctx.db.insert("linkSessions", {
      userId,
      desktopDeviceId: "d1",
      mobileDeviceId: "m1",
      mode: "mirror",
      status: "requested",
      transport: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });

    await expect(
      (updateStatus as any).handler(otherCtx, { sessionId: id, status: "accepted" })
    ).rejects.toThrow("Session not found");
  });
});

describe("end", () => {
  it("can end own session", async () => {
    const ctx = makeCtx(userId);
    const id = await ctx.db.insert("linkSessions", {
      userId,
      desktopDeviceId: "d1",
      mobileDeviceId: "m1",
      mode: "mirror",
      status: "accepted",
      transport: "webrtc",
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });

    await (end as any).handler(ctx, { sessionId: id });

    const doc = await ctx.db.get(id);
    expect(doc.status).toBe("ended");
    expect(doc.endedAt).toBeDefined();
  });

  it("CANNOT end another user's session", async () => {
    const ctx = makeCtx(userId);
    const otherCtx = makeCtx(otherUserId);
    const id = await ctx.db.insert("linkSessions", {
      userId,
      desktopDeviceId: "d1",
      mobileDeviceId: "m1",
      mode: "mirror",
      status: "accepted",
      transport: "webrtc",
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });

    await expect(
      (end as any).handler(otherCtx, { sessionId: id })
    ).rejects.toThrow("Session not found");
  });
});

describe("get", () => {
  it("can get own session", async () => {
    const ctx = makeCtx(userId);
    const id = await ctx.db.insert("linkSessions", {
      userId,
      desktopDeviceId: "d1",
      mobileDeviceId: "m1",
      mode: "mirror",
      status: "requested",
      transport: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });

    const result = await (get as any).handler(ctx, { sessionId: id });

    expect(result).toBeDefined();
    expect(result.userId).toBe(userId);
  });

  it("CANNOT get another user's session", async () => {
    const ctx = makeCtx(userId);
    const otherCtx = makeCtx(otherUserId);
    const id = await ctx.db.insert("linkSessions", {
      userId,
      desktopDeviceId: "d1",
      mobileDeviceId: "m1",
      mode: "mirror",
      status: "requested",
      transport: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });

    const result = await (get as any).handler(otherCtx, { sessionId: id });

    expect(result).toBeNull();
  });

  it("does not return expired sessions", async () => {
    const ctx = makeCtx(userId);
    const id = await ctx.db.insert("linkSessions", {
      userId,
      desktopDeviceId: "d1",
      mobileDeviceId: "m1",
      mode: "mirror",
      status: "approved",
      transport: "websocket",
      createdAt: Date.now() - 7200000,
      expiresAt: Date.now() - 3600000,
    });

    const result = await (get as any).handler(ctx, { sessionId: id });

    expect(result).toBeNull();
  });

});
