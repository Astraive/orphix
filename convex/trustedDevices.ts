import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const trust = mutation({
  args: {
    desktopDeviceId: v.string(),
    mobileDeviceId: v.string(),
    trustLevel: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("trustedDevices")
      .withIndex("by_devices", (q) =>
        q.eq("desktopDeviceId", args.desktopDeviceId).eq("mobileDeviceId", args.mobileDeviceId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        trustLevel: args.trustLevel,
        revokedAt: undefined,
      });
      return await ctx.db.get(existing._id);
    }

    const id = await ctx.db.insert("trustedDevices", {
      userId: userId,
      desktopDeviceId: args.desktopDeviceId,
      mobileDeviceId: args.mobileDeviceId,
      trustLevel: args.trustLevel,
      createdAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

export const checkTrust = query({
  args: {
    mobileDeviceId: v.string(),
    desktopDeviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const trust = await ctx.db
      .query("trustedDevices")
      .withIndex("by_devices", (q) =>
        q.eq("desktopDeviceId", args.desktopDeviceId).eq("mobileDeviceId", args.mobileDeviceId)
      )
      .unique();

    if (!trust || trust.revokedAt) return { trusted: false, trustLevel: null };
    return { trusted: true, trustLevel: trust.trustLevel };
  },
});

export const revoke = mutation({
  args: {
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const trusts = await ctx.db
      .query("trustedDevices")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const trust of trusts) {
      if (trust.desktopDeviceId === args.deviceId || trust.mobileDeviceId === args.deviceId) {
        await ctx.db.patch(trust._id, { revokedAt: Date.now() });
      }
    }

    const device = await ctx.db
      .query("devices")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();
    if (device && device.userId === userId) {
      await ctx.db.patch(device._id, { status: "revoked" });
    }

    return { success: true };
  },
});

export const checkOwnership = query({
  args: {
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const device = await ctx.db
      .query("devices")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();
    return device?.userId === userId;
  },
});
