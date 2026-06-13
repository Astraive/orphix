import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@convex-dev/auth/server", () => ({
  getAuthUserId: vi.fn(),
}));

import { get, update } from "./linkSettings";
import { getAuthUserId } from "@convex-dev/auth/server";

const userId = "user1" as any;

function makeCtx(authUserId: string | null = userId) {
  const dbStore = new Map<string, any>();
  const settingsStore = new Map<string, any>();

  vi.mocked(getAuthUserId).mockResolvedValue(authUserId);

  return {
    db: {
      insert: vi.fn(async (table: string, doc: any) => {
        const id = `${table}:${dbStore.size + 1}` as any;
        dbStore.set(id, { ...doc, _id: id });
        if (table === "linkSettings") settingsStore.set(id, { ...doc, _id: id });
        return id;
      }),
      get: vi.fn(async (id: any) => dbStore.get(id) ?? settingsStore.get(id) ?? null),
      patch: vi.fn(async (id: any, fields: any) => {
        const doc = dbStore.get(id) ?? settingsStore.get(id);
        if (doc) Object.assign(doc, fields);
      }),
      query: vi.fn((table: string) => ({
        withIndex: vi.fn((indexName: string, filterFn: any) => {
          const results = Array.from(settingsStore.values()).filter((doc) => {
            if (table === "linkSettings" && indexName === "by_userId") {
              return doc.userId === authUserId;
            }
            return true;
          });
          return {
            unique: vi.fn(async () => results[0] ?? null),
          };
        }),
      })),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("get", () => {
  it("returns settings for authenticated user", async () => {
    const ctx = makeCtx(userId);
    const result = await (get as any).handler(ctx, {});

    expect(result).toBeDefined();
    expect(result.autoApprove).toBe(false);
    expect(result.autoApproveSameUser).toBe(true);
    expect(result.approvalTimeout).toBe(30);
    expect(result.encryption.e2ee).toBe(true);
  });

  it("unauthenticated user gets error", async () => {
    const ctx = makeCtx(null);
    await expect((get as any).handler(ctx, {})).rejects.toThrow("Not authenticated");
  });
});

describe("update", () => {
  it("can update own settings", async () => {
    const ctx = makeCtx(userId);
    const result = await (update as any).handler(ctx, {
      settings: { autoApprove: true },
    });

    expect(result).toBeDefined();
    expect(result.autoApprove).toBe(true);
    expect(result.userId).toBe(userId);
  });

  it("uses authenticated user's ID (not args.userId)", async () => {
    const ctx = makeCtx(userId);
    const result = await (update as any).handler(ctx, {
      settings: { autoApprove: true, userId: "hacked" },
    });

    expect(result.userId).toBe(userId);
    expect(result.userId).not.toBe("hacked");
  });

  it("unauthenticated user gets error", async () => {
    const ctx = makeCtx(null);
    await expect(
      (update as any).handler(ctx, { settings: { autoApprove: true } })
    ).rejects.toThrow("Not authenticated");
  });
});
