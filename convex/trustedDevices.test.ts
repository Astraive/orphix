import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@convex-dev/auth/server", () => ({
  getAuthUserId: vi.fn(),
}));

import { getAuthUserId } from "@convex-dev/auth/server";

const mockGetAuthUserId = vi.mocked(getAuthUserId);

function createMockDb() {
  const trustedDevicesStore = new Map<string, Record<string, unknown>>();
  const devicesStore = new Map<string, Record<string, unknown>>();

  let trustedDevicesCount = 0;

  function queryTrustedDevices(indexName?: string, filterFn?: (q: any) => any) {
    let results = Array.from(trustedDevicesStore.values());

    if (filterFn) {
      const mockQ = {
        eq: (field: string, value: unknown) => {
          results = results.filter((doc) => doc[field] === value);
          return mockQ;
        },
      };
      filterFn(mockQ);
    }

    return {
      withIndex: (_name: string, filter?: (q: any) => any) => {
        if (filter) {
          const mockQ = {
            eq: (field: string, value: unknown) => {
              results = results.filter((doc) => doc[field] === value);
              return mockQ;
            },
          };
          filter(mockQ);
        }
        return {
          unique: () => Promise.resolve(results[0] ?? null),
          collect: () => Promise.resolve(results),
        };
      },
      collect: () => Promise.resolve(results),
    };
  }

  function queryDevices() {
    let results = Array.from(devicesStore.values());
    return {
      withIndex: (_name: string, filter?: (q: any) => any) => {
        if (filter) {
          const mockQ = {
            eq: (field: string, value: unknown) => {
              results = results.filter((doc) => doc[field] === value);
              return mockQ;
            },
          };
          filter(mockQ);
        }
        return {
          unique: () => Promise.resolve(results[0] ?? null),
          collect: () => Promise.resolve(results),
        };
      },
    };
  }

  return {
    db: {
      query: vi.fn().mockImplementation((table: string) => {
        if (table === "trustedDevices") return queryTrustedDevices();
        if (table === "devices") return queryDevices();
        return { withIndex: vi.fn().mockReturnThis(), collect: vi.fn().mockResolvedValue([]) };
      }),
      get: vi.fn().mockImplementation(async (id: string) => {
        const doc = trustedDevicesStore.get(id) ?? devicesStore.get(id);
        return doc ?? null;
      }),
      insert: vi.fn().mockImplementation(async (table: string, doc: Record<string, unknown>) => {
        trustedDevicesCount++;
        const id = `${table}:${trustedDevicesCount}`;
        const store = table === "trustedDevices" ? trustedDevicesStore : devicesStore;
        store.set(id, { _id: id, ...doc });
        return id;
      }),
      patch: vi.fn().mockImplementation(async (id: string, updates: Record<string, unknown>) => {
        const store = trustedDevicesStore.has(id) ? trustedDevicesStore : devicesStore;
        const existing = store.get(id);
        if (existing) {
          store.set(id, { ...existing, ...updates });
        }
      }),
    },
    _trustedDevicesStore: trustedDevicesStore,
    _devicesStore: devicesStore,
  };
}

function createMockCtx(db: ReturnType<typeof createMockDb>["db"]) {
  return { db: db as any } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("trust", () => {
  it("authenticated user can create trust relationship", async () => {
    const { db, _devicesStore } = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);

    _devicesStore.set("devices:1", {
      _id: "devices:1",
      userId: "user1",
      deviceId: "desktop-1",
      deviceType: "desktop",
    });
    _devicesStore.set("devices:2", {
      _id: "devices:2",
      userId: "user1",
      deviceId: "mobile-1",
      deviceType: "mobile",
    });

    const { trust } = await import("./trustedDevices");
    const result = await (trust as any).handler(createMockCtx(db), {
      desktopDeviceId: "desktop-1",
      mobileDeviceId: "mobile-1",
      trustLevel: "full",
    });

    expect(result).toBeTruthy();
    expect(result.userId).toBe("user1");
    expect(result.desktopDeviceId).toBe("desktop-1");
    expect(result.mobileDeviceId).toBe("mobile-1");
    expect(result.trustLevel).toBe("full");
    expect(result.createdAt).toBeTypeOf("number");
    expect(db.insert).toHaveBeenCalledOnce();
  });

  it("uses authenticated user's ID (not args.userId)", async () => {
    const { db, _devicesStore } = createMockDb();
    mockGetAuthUserId.mockResolvedValue("real_user" as any);

    _devicesStore.set("devices:1", {
      _id: "devices:1",
      userId: "real_user",
      deviceId: "desktop-1",
      deviceType: "desktop",
    });
    _devicesStore.set("devices:2", {
      _id: "devices:2",
      userId: "real_user",
      deviceId: "mobile-1",
      deviceType: "mobile",
    });

    const { trust } = await import("./trustedDevices");
    await (trust as any).handler(createMockCtx(db), {
      desktopDeviceId: "desktop-1",
      mobileDeviceId: "mobile-1",
      trustLevel: "full",
    });

    expect(db.insert).toHaveBeenCalledWith(
      "trustedDevices",
      expect.objectContaining({ userId: "real_user" })
    );
  });

  it("unauthenticated user gets error", async () => {
    const { db } = createMockDb();
    mockGetAuthUserId.mockResolvedValue(null);

    const { trust } = await import("./trustedDevices");
    await expect(
      (trust as any).handler(createMockCtx(db), {
        desktopDeviceId: "desktop-1",
        mobileDeviceId: "mobile-1",
        trustLevel: "full",
      })
    ).rejects.toThrow("Not authenticated");
  });

  it("rejects devices owned by another user", async () => {
    const { db, _devicesStore } = createMockDb();
    mockGetAuthUserId.mockResolvedValue("attacker" as any);
    _devicesStore.set("devices:1", {
      _id: "devices:1",
      userId: "victim",
      deviceId: "desktop-1",
      deviceType: "desktop",
    });
    _devicesStore.set("devices:2", {
      _id: "devices:2",
      userId: "victim",
      deviceId: "mobile-1",
      deviceType: "mobile",
    });

    const { trust } = await import("./trustedDevices");
    await expect(
      (trust as any).handler(createMockCtx(db), {
        desktopDeviceId: "desktop-1",
        mobileDeviceId: "mobile-1",
        trustLevel: "full",
      })
    ).rejects.toThrow("Devices must be an owned desktop and mobile pair");
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.patch).not.toHaveBeenCalled();
  });

  it("rejects devices with the wrong types", async () => {
    const { db, _devicesStore } = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);
    _devicesStore.set("devices:1", {
      _id: "devices:1",
      userId: "user1",
      deviceId: "desktop-1",
      deviceType: "mobile",
    });
    _devicesStore.set("devices:2", {
      _id: "devices:2",
      userId: "user1",
      deviceId: "mobile-1",
      deviceType: "desktop",
    });

    const { trust } = await import("./trustedDevices");
    await expect(
      (trust as any).handler(createMockCtx(db), {
        desktopDeviceId: "desktop-1",
        mobileDeviceId: "mobile-1",
        trustLevel: "full",
      })
    ).rejects.toThrow("Devices must be an owned desktop and mobile pair");
  });
});

describe("revoke", () => {
  it("authenticated user can revoke trust", async () => {
    const { db, _trustedDevicesStore } = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);

    _trustedDevicesStore.set("trustedDevices:1", {
      _id: "trustedDevices:1",
      userId: "user1",
      desktopDeviceId: "desktop-1",
      mobileDeviceId: "mobile-1",
      trustLevel: "full",
    });

    db.query.mockImplementation((table: string) => {
      if (table === "trustedDevices") {
        return {
          withIndex: (_name: string, filter?: (q: any) => any) => {
            const results = Array.from(_trustedDevicesStore.values()).filter(
              (d) => d.userId === "user1"
            );
            return {
              collect: () => Promise.resolve(results),
            };
          },
        };
      }
      if (table === "devices") {
        return {
          withIndex: () => ({
            unique: () => Promise.resolve(null),
          }),
        };
      }
      return { withIndex: vi.fn().mockReturnThis(), collect: vi.fn().mockResolvedValue([]) };
    });

    const { revoke } = await import("./trustedDevices");
    const result = await (revoke as any).handler(createMockCtx(db), {
      deviceId: "desktop-1",
    });

    expect(result).toEqual({ success: true });
    expect(db.patch).toHaveBeenCalledWith(
      "trustedDevices:1",
      expect.objectContaining({ revokedAt: expect.any(Number) })
    );
  });

  it("uses authenticated user's ID (not args.userId)", async () => {
    const { db, _trustedDevicesStore } = createMockDb();
    mockGetAuthUserId.mockResolvedValue("real_user" as any);

    _trustedDevicesStore.set("trustedDevices:1", {
      _id: "trustedDevices:1",
      userId: "real_user",
      desktopDeviceId: "desktop-1",
      mobileDeviceId: "mobile-1",
    });

    db.query.mockImplementation((table: string) => {
      if (table === "trustedDevices") {
        return {
          withIndex: () => ({
            collect: () =>
              Promise.resolve(
                Array.from(_trustedDevicesStore.values()).filter((d) => d.userId === "real_user")
              ),
          }),
        };
      }
      if (table === "devices") {
        return { withIndex: () => ({ unique: () => Promise.resolve(null) }) };
      }
      return { withIndex: vi.fn().mockReturnThis(), collect: vi.fn().mockResolvedValue([]) };
    });

    const { revoke } = await import("./trustedDevices");
    await (revoke as any).handler(createMockCtx(db), { deviceId: "desktop-1" });

    const patchedTrust = _trustedDevicesStore.get("trustedDevices:1");
    expect(patchedTrust?.revokedAt).toBeTypeOf("number");
  });

  it("unauthenticated user gets error", async () => {
    const { db } = createMockDb();
    mockGetAuthUserId.mockResolvedValue(null);

    const { revoke } = await import("./trustedDevices");
    await expect(
      (revoke as any).handler(createMockCtx(db), { deviceId: "desktop-1" })
    ).rejects.toThrow("Not authenticated");
  });
});

describe("checkOwnership", () => {
  it("authenticated user can check ownership of their own device", async () => {
    const { db, _devicesStore } = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);

    _devicesStore.set("devices:1", {
      _id: "devices:1",
      userId: "user1",
      deviceId: "device-abc",
    });

    db.query.mockImplementation(() => ({
      withIndex: () => ({
        unique: () =>
          Promise.resolve(
            Array.from(_devicesStore.values()).find((d) => d.deviceId === "device-abc") ?? null
          ),
      }),
    }));

    const { checkOwnership } = await import("./trustedDevices");
    const result = await (checkOwnership as any).handler(createMockCtx(db), {
      deviceId: "device-abc",
    });

    expect(result).toBe(true);
  });

  it("returns false for another user's device", async () => {
    const { db, _devicesStore } = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);

    _devicesStore.set("devices:1", {
      _id: "devices:1",
      userId: "user2",
      deviceId: "device-abc",
    });

    db.query.mockImplementation(() => ({
      withIndex: () => ({
        unique: () =>
          Promise.resolve(
            Array.from(_devicesStore.values()).find((d) => d.deviceId === "device-abc") ?? null
          ),
      }),
    }));

    const { checkOwnership } = await import("./trustedDevices");
    const result = await (checkOwnership as any).handler(createMockCtx(db), {
      deviceId: "device-abc",
    });

    expect(result).toBe(false);
  });
});

describe("checkTrust", () => {
  it("returns trust status for device pair", async () => {
    const { db, _trustedDevicesStore } = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);

    _trustedDevicesStore.set("trustedDevices:1", {
      _id: "trustedDevices:1",
      userId: "user1",
      desktopDeviceId: "desktop-1",
      mobileDeviceId: "mobile-1",
      trustLevel: "full",
    });

    db.query.mockImplementation((table: string) => {
      if (table === "trustedDevices") {
        return {
          withIndex: (_name: string, filter?: (q: any) => any) => {
            let results = Array.from(_trustedDevicesStore.values());
            if (filter) {
              const mockQ = {
                eq: (field: string, value: unknown) => {
                  results = results.filter((d) => d[field] === value);
                  return mockQ;
                },
              };
              filter(mockQ);
            }
            return {
              unique: () => Promise.resolve(results[0] ?? null),
            };
          },
        };
      }
      return { withIndex: vi.fn().mockReturnThis() };
    });

    const { checkTrust } = await import("./trustedDevices");
    const result = await (checkTrust as any).handler(createMockCtx(db), {
      desktopDeviceId: "desktop-1",
      mobileDeviceId: "mobile-1",
    });

    expect(result).toEqual({ trusted: true, trustLevel: "full" });
  });

  it("returns untrusted for unknown device pair", async () => {
    const { db } = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);

    db.query.mockImplementation(() => ({
      withIndex: () => ({
        unique: () => Promise.resolve(null),
      }),
    }));

    const { checkTrust } = await import("./trustedDevices");
    const result = await (checkTrust as any).handler(createMockCtx(db), {
      desktopDeviceId: "unknown-desktop",
      mobileDeviceId: "unknown-mobile",
    });

    expect(result).toEqual({ trusted: false, trustLevel: null });
  });

  it("requires authentication", async () => {
    const { db } = createMockDb();
    mockGetAuthUserId.mockResolvedValue(null);

    const { checkTrust } = await import("./trustedDevices");
    await expect(
      (checkTrust as any).handler(createMockCtx(db), {
        desktopDeviceId: "desktop-1",
        mobileDeviceId: "mobile-1",
      })
    ).rejects.toThrow("Not authenticated");
  });
});
