import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listByUser = query({
  args: {
    workspaceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (args.workspaceId) {
      return await ctx.db
        .query("notes")
        .withIndex("by_workspace", (q) =>
          q.eq("userId", userId).eq("workspaceId", args.workspaceId!)
        )
        .collect();
    }
    return await ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const get = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) return null;
    return note;
  },
});

export const create = mutation({
  args: {
    workspaceId: v.optional(v.string()),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    syncEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const id = await ctx.db.insert("notes", {
      userId: userId,
      workspaceId: args.workspaceId,
      title: args.title ?? "Untitled",
      content: args.content ?? "",
      syncEnabled: args.syncEnabled ?? true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

export const update = mutation({
  args: {
    noteId: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    syncEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) throw new Error("Note not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;
    if (args.syncEnabled !== undefined) updates.syncEnabled = args.syncEnabled;

    await ctx.db.patch(args.noteId, updates);
    return await ctx.db.get(args.noteId);
  },
});

export const remove = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) throw new Error("Note not found");
    await ctx.db.delete(args.noteId);
    return { success: true };
  },
});
