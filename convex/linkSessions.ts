import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    desktopDeviceId: v.string(),
    mobileDeviceId: v.string(),
    mode: v.string(),
    workspaceId: v.optional(v.string()),
    windowId: v.optional(v.string()),
    terminalId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const expiresAt = Date.now() + 3600 * 1000;

    const id = await ctx.db.insert("linkSessions", {
      userId: userId,
      desktopDeviceId: args.desktopDeviceId,
      mobileDeviceId: args.mobileDeviceId,
      mode: args.mode,
      status: "requested",
      transport: "pending",
      workspaceId: args.workspaceId,
      windowId: args.windowId,
      terminalId: args.terminalId,
      createdAt: Date.now(),
      expiresAt,
    });

    return await ctx.db.get(id);
  },
});

export const updateStatus = mutation({
  args: { sessionId: v.id("linkSessions"), status: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) throw new Error("Session not found");
    await ctx.db.patch(args.sessionId, { status: args.status });
  },
});

export const updateTransport = mutation({
  args: { sessionId: v.id("linkSessions"), transport: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) throw new Error("Session not found");
    await ctx.db.patch(args.sessionId, { transport: args.transport });
  },
});

export const get = query({
  args: { sessionId: v.id("linkSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) return null;
    return session;
  },
});

export const end = mutation({
  args: { sessionId: v.id("linkSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) throw new Error("Session not found");
    await ctx.db.patch(args.sessionId, {
      status: "ended",
      endedAt: Date.now(),
    });
  },
});
