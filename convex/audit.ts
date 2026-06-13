import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const log = mutation({
  args: {
    deviceId: v.optional(v.string()),
    action: v.string(),
    resource: v.optional(v.string()),
    details: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("auditLogs", {
      ...args,
      userId: userId,
      createdAt: Date.now(),
    });
  },
});
