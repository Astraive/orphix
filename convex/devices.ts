import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const register = mutation({
  args: {
    deviceId: v.string(),
    deviceType: v.string(),
    deviceName: v.string(),
    publicKey: v.string(),
    platform: v.optional(v.string()),
    appVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("devices")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        deviceName: args.deviceName,
        publicKey: args.publicKey,
        platform: args.platform,
        appVersion: args.appVersion,
        lastSeenAt: Date.now(),
      });
      return await ctx.db.get(existing._id);
    }

    const id = await ctx.db.insert("devices", {
      userId: userId,
      deviceId: args.deviceId,
      deviceType: args.deviceType,
      deviceName: args.deviceName,
      publicKey: args.publicKey,
      platform: args.platform,
      appVersion: args.appVersion,
      status: "registered",
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

export const listByUser = query({
  args: {},
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db
      .query("devices")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getByDeviceId = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("devices")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();
  },
});

export const getPublicKey = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const device = await ctx.db
      .query("devices")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();
    return device?.publicKey ?? null;
  },
});

export const updateStatus = mutation({
  args: { deviceId: v.string(), status: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const device = await ctx.db
      .query("devices")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();
    if (!device || device.userId !== userId) throw new Error("Device not found");
    await ctx.db.patch(device._id, { status: args.status });
  },
});

export const touch = mutation({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const device = await ctx.db
      .query("devices")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();
    if (device && device.userId === userId) {
      await ctx.db.patch(device._id, { lastSeenAt: Date.now() });
    }
  },
});
