import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (process.env.NODE_ENV === 'production') throw new Error('Cannot seed in production');
    const existing = await ctx.db.query("users").first();
    if (existing) return { userId: existing._id, message: "already seeded" };

    const userId = await ctx.db.insert("users", {
      name: "Test User",
      email: "test@orphix.dev",
      githubId: "99999",
      githubUsername: "testuser",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const desktopId = await ctx.db.insert("devices", {
      userId,
      deviceId: "dev_desktop_01",
      deviceType: "desktop",
      deviceName: "Test Desktop",
      platform: "windows",
      publicKey: "dGVzdA==",
      status: "registered",
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    });

    const mobileId = await ctx.db.insert("devices", {
      userId,
      deviceId: "dev_mobile_01",
      deviceType: "mobile",
      deviceName: "Test Phone",
      platform: "android",
      publicKey: "bW9iaWxl",
      status: "registered",
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    });

    await ctx.db.insert("notes", {
      userId,
      title: "Welcome Note",
      content: "# Hello Orphix\nThis is a test note.",
      syncEnabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("trustedDevices", {
      userId,
      desktopDeviceId: "dev_desktop_01",
      mobileDeviceId: "dev_mobile_01",
      trustLevel: "full_control",
      createdAt: Date.now(),
    });

    return { userId, desktopId, mobileId, message: "seeded" };
  },
});
