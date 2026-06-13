import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@convex-dev/auth/server", () => ({
  getAuthUserId: vi.fn(),
}));

import { getAuthUserId } from "@convex-dev/auth/server";

const mockGetAuthUserId = vi.mocked(getAuthUserId);

function createMockDb() {
  const devicesStore = new Map<string, Record<string, unknown>>();

  function makeQueryChain() {
    const chain: any = {
      withIndex: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      unique: vi.fn().mockImplementation(async () => {
        const deviceId = chain._targetDeviceId;
        if (!deviceId) return null;
        for (const doc of devicesStore.values()) {
          if (doc.deviceId === deviceId) return doc;
        }
        return null;
      }),
      collect: vi.fn().mockImplementation(async () => {
        const targetUserId = chain._targetUserId;
        if (!targetUserId) return [];
        return Array.from(devicesStore.values()).filter(
          (d) => d.userId === targetUserId
        );
      }),
      _targetDeviceId: null as string | null,
      _targetUserId: null as string | null,
    };

    const originalWithIndex = chain.withIndex;
    chain.withIndex = vi.fn().mockImplementation((indexFn: any) => {
      const fakeQ = {
        eq: vi.fn().mockImplementation((_field: string, value: string) => {
          if (_field === "deviceId") chain._targetDeviceId = value;
          if (_field === "userId") chain._targetUserId = value;
          return chain;
        }),
      };
      indexFn(fakeQ);
      return chain;
    });

    return chain;
  }

  return {
    query: vi.fn(() => makeQueryChain()),
    get: vi.fn().mockImplementation(async (id: string) => {
      return devicesStore.get(id) ?? null;
    }),
    insert: vi.fn().mockImplementation(
      async (table: string, doc: Record<string, unknown>) => {
        const id = `devices:${devicesStore.size + 1}`;
        devicesStore.set(id, { _id: id, ...doc });
        return id;
      }
    ),
    patch: vi.fn().mockImplementation(
      async (id: string, updates: Record<string, unknown>) => {
        const existing = devicesStore.get(id);
        if (existing) {
          devicesStore.set(id, { ...existing, ...updates });
        }
      }
    ),
    _store: devicesStore,
  };
}

function createMockCtx(db: ReturnType<typeof createMockDb>) {
  return { db: db as any } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("register", () => {
  it("creates a device for authenticated user", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);
    db.get.mockImplementation(async (id: string) => {
      return db._store.get(id) ?? null;
    });

    const { register } = await import("./devices");
    const result = await (register as any).handler(createMockCtx(db), {
      deviceId: "dev-abc",
      deviceType: "phone",
      deviceName: "My Phone",
      publicKey: "pub-key-123",
      platform: "ios",
      appVersion: "1.0.0",
    });

    expect(result).toBeTruthy();
    expect(result.deviceId).toBe("dev-abc");
    expect(result.userId).toBe("user1");
    expect(result.status).toBe("registered");
    expect(db.insert).toHaveBeenCalledOnce();
    expect(db.insert).toHaveBeenCalledWith(
      "devices",
      expect.objectContaining({ userId: "user1", deviceId: "dev-abc" })
    );
  });

  it("throws for unauthenticated user", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue(null);

    const { register } = await import("./devices");
    await expect(
      (register as any).handler(createMockCtx(db), {
        deviceId: "dev-abc",
        deviceType: "phone",
        deviceName: "My Phone",
        publicKey: "pub-key-123",
      })
    ).rejects.toThrow("Not authenticated");
  });

  it("creates device with authenticated user's ID", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue("real_user" as any);
    db.get.mockImplementation(async (id: string) => {
      return db._store.get(id) ?? null;
    });

    const { register } = await import("./devices");
    await (register as any).handler(createMockCtx(db), {
      deviceId: "dev-abc",
      deviceType: "phone",
      deviceName: "My Phone",
      publicKey: "pub-key-123",
    });

    expect(db.insert).toHaveBeenCalledWith(
      "devices",
      expect.objectContaining({ userId: "real_user" })
    );
  });
});

describe("updateStatus", () => {
  it("updates own device status", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);

    db._store.set("devices:1", {
      _id: "devices:1",
      userId: "user1",
      deviceId: "dev-abc",
      status: "registered",
    });

    const { updateStatus } = await import("./devices");
    await (updateStatus as any).handler(createMockCtx(db), {
      deviceId: "dev-abc",
      status: "active",
    });

    expect(db.patch).toHaveBeenCalledOnce();
    expect(db.patch).toHaveBeenCalledWith("devices:1", { status: "active" });
  });

  it("rejects updating another user's device", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);

    db._store.set("devices:1", {
      _id: "devices:1",
      userId: "user2",
      deviceId: "dev-abc",
      status: "registered",
    });

    const { updateStatus } = await import("./devices");
    await expect(
      (updateStatus as any).handler(createMockCtx(db), {
        deviceId: "dev-abc",
        status: "active",
      })
    ).rejects.toThrow("Device not found");

    expect(db.patch).not.toHaveBeenCalled();
  });

  it("throws for unauthenticated user", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue(null);

    const { updateStatus } = await import("./devices");
    await expect(
      (updateStatus as any).handler(createMockCtx(db), {
        deviceId: "dev-abc",
        status: "active",
      })
    ).rejects.toThrow("Not authenticated");
  });
});

describe("touch", () => {
  it("touches own device", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);

    db._store.set("devices:1", {
      _id: "devices:1",
      userId: "user1",
      deviceId: "dev-abc",
      lastSeenAt: 0,
    });

    const { touch } = await import("./devices");
    await (touch as any).handler(createMockCtx(db), {
      deviceId: "dev-abc",
    });

    expect(db.patch).toHaveBeenCalledOnce();
    expect(db.patch).toHaveBeenCalledWith(
      "devices:1",
      expect.objectContaining({ lastSeenAt: expect.any(Number) })
    );
  });

  it("does not touch another user's device", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);

    db._store.set("devices:1", {
      _id: "devices:1",
      userId: "user2",
      deviceId: "dev-abc",
      lastSeenAt: 0,
    });

    const { touch } = await import("./devices");
    await (touch as any).handler(createMockCtx(db), {
      deviceId: "dev-abc",
    });

    expect(db.patch).not.toHaveBeenCalled();
  });

  it("throws for unauthenticated user", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue(null);

    const { touch } = await import("./devices");
    await expect(
      (touch as any).handler(createMockCtx(db), { deviceId: "dev-abc" })
    ).rejects.toThrow("Not authenticated");
  });
});

describe("listByUser", () => {
  it("returns devices for authenticated user", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);

    db._store.set("devices:1", { _id: "devices:1", userId: "user1" });
    db._store.set("devices:2", { _id: "devices:2", userId: "user2" });

    const { listByUser } = await import("./devices");
    const result = await (listByUser as any).handler(createMockCtx(db), {});

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe("user1");
  });

  it("throws for unauthenticated user", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue(null);

    const { listByUser } = await import("./devices");
    await expect(
      (listByUser as any).handler(createMockCtx(db), {})
    ).rejects.toThrow("Not authenticated");
  });
});
