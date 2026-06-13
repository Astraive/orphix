import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@convex-dev/auth/server", () => ({
  getAuthUserId: vi.fn(),
}));

import { getAuthUserId } from "@convex-dev/auth/server";

const mockGetAuthUserId = vi.mocked(getAuthUserId);

function createMockDb() {
  const notesStore = new Map<string, Record<string, unknown>>();

  return {
    query: vi.fn().mockReturnValue({
      withIndex: vi.fn().mockReturnThis(),
      collect: vi.fn().mockResolvedValue([]),
    }),
    get: vi.fn().mockImplementation(async (id: string) => {
      return notesStore.get(id) ?? null;
    }),
    insert: vi.fn().mockImplementation(
      async (table: string, doc: Record<string, unknown>) => {
        const id = `notes:${notesStore.size + 1}`;
        notesStore.set(id, { _id: id, ...doc });
        return id;
      }
    ),
    patch: vi.fn().mockImplementation(
      async (id: string, updates: Record<string, unknown>) => {
        const existing = notesStore.get(id);
        if (existing) {
          notesStore.set(id, { ...existing, ...updates });
        }
      }
    ),
    delete: vi.fn().mockImplementation(async (id: string) => {
      notesStore.delete(id);
    }),
    _store: notesStore,
  };
}

function createMockCtx(db: ReturnType<typeof createMockDb>) {
  return { db: db as any } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("create", () => {
  it("creates a note for authenticated user", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);
    db.get.mockImplementation(async (id: string) => {
      return db._store.get(id) ?? null;
    });

    const { create } = await import("./notes");
    const result = await (create as any)._handler(createMockCtx(db), {
      title: "Test Note",
      content: "Hello",
    });

    expect(result).toBeTruthy();
    expect(result.title).toBe("Test Note");
    expect(result.content).toBe("Hello");
    expect(result.userId).toBe("user1");
    expect(result.syncEnabled).toBe(true);
    expect(db.insert).toHaveBeenCalledOnce();
    expect(db.insert).toHaveBeenCalledWith(
      "notes",
      expect.objectContaining({ userId: "user1" })
    );
  });

  it("throws for unauthenticated user", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue(null);

    const { create } = await import("./notes");
    await expect(
      (create as any)._handler(createMockCtx(db), { title: "Test" })
    ).rejects.toThrow("Not authenticated");
  });

  it("uses authenticated user's ID, not args", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue("real_user" as any);
    db.get.mockImplementation(async (id: string) => {
      return db._store.get(id) ?? null;
    });

    const { create } = await import("./notes");
    await (create as any)._handler(createMockCtx(db), { title: "Test" });

    expect(db.insert).toHaveBeenCalledWith(
      "notes",
      expect.objectContaining({ userId: "real_user" })
    );
  });
});

describe("update", () => {
  it("updates own note", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);

    db._store.set("notes:1", {
      _id: "notes:1",
      userId: "user1",
      title: "Original",
      content: "Old content",
    });

    const { update } = await import("./notes");
    const result = await (update as any)._handler(createMockCtx(db), {
      noteId: "notes:1",
      title: "Updated Title",
    });

    expect(result.title).toBe("Updated Title");
    expect(db.patch).toHaveBeenCalledOnce();
  });

  it("rejects updating another user's note", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);

    db._store.set("notes:1", {
      _id: "notes:1",
      userId: "user2",
      title: "Not mine",
    });

    const { update } = await import("./notes");
    await expect(
      (update as any)._handler(createMockCtx(db), {
        noteId: "notes:1",
        title: "Hacked",
      })
    ).rejects.toThrow("Note not found");

    expect(db.patch).not.toHaveBeenCalled();
  });

  it("throws for unauthenticated user", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue(null);

    const { update } = await import("./notes");
    await expect(
      (update as any)._handler(createMockCtx(db), {
        noteId: "notes:1",
        title: "Test",
      })
    ).rejects.toThrow("Not authenticated");
  });
});

describe("remove", () => {
  it("deletes own note", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);

    db._store.set("notes:1", {
      _id: "notes:1",
      userId: "user1",
    });

    const { remove } = await import("./notes");
    const result = await (remove as any)._handler(createMockCtx(db), {
      noteId: "notes:1",
    });

    expect(result).toEqual({ success: true });
    expect(db.delete).toHaveBeenCalledWith("notes:1");
    expect(db._store.has("notes:1")).toBe(false);
  });

  it("rejects deleting another user's note", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);

    db._store.set("notes:1", {
      _id: "notes:1",
      userId: "user2",
    });

    const { remove } = await import("./notes");
    await expect(
      (remove as any)._handler(createMockCtx(db), { noteId: "notes:1" })
    ).rejects.toThrow("Note not found");

    expect(db.delete).not.toHaveBeenCalled();
    expect(db._store.has("notes:1")).toBe(true);
  });

  it("throws for unauthenticated user", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue(null);

    const { remove } = await import("./notes");
    await expect(
      (remove as any)._handler(createMockCtx(db), { noteId: "notes:1" })
    ).rejects.toThrow("Not authenticated");
  });
});

describe("listByUser", () => {
  it("returns notes for authenticated user", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);

    db._store.set("notes:1", { _id: "notes:1", userId: "user1" });
    db._store.set("notes:2", { _id: "notes:2", userId: "user2" });

    db.query.mockReturnValue({
      withIndex: vi.fn().mockReturnValue({
        collect: vi.fn().mockImplementation(async () => {
          return Array.from(db._store.values()).filter(
            (n) => n.userId === "user1"
          );
        }),
      }),
    });

    const { listByUser } = await import("./notes");
    const result = await (listByUser as any)._handler(createMockCtx(db), {});

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe("user1");
  });

  it("throws for unauthenticated user", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue(null);

    const { listByUser } = await import("./notes");
    await expect(
      (listByUser as any)._handler(createMockCtx(db), {})
    ).rejects.toThrow("Not authenticated");
  });
});

describe("get", () => {
  it("returns note if it belongs to authenticated user", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);

    db._store.set("notes:1", {
      _id: "notes:1",
      userId: "user1",
      title: "My note",
    });

    const { get } = await import("./notes");
    const result = await (get as any)._handler(createMockCtx(db), {
      noteId: "notes:1",
    });

    expect(result).toBeTruthy();
    expect(result._id).toBe("notes:1");
    expect(result.title).toBe("My note");
  });

  it("returns null if note belongs to another user", async () => {
    const db = createMockDb();
    mockGetAuthUserId.mockResolvedValue("user1" as any);

    db._store.set("notes:1", {
      _id: "notes:1",
      userId: "user2",
      title: "Not mine",
    });

    const { get } = await import("./notes");
    const result = await (get as any)._handler(createMockCtx(db), {
      noteId: "notes:1",
    });

    expect(result).toBeNull();
  });
});
