import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const DEFAULT_SETTINGS = {
  autoApprove: false,
  autoApproveSameUser: true,
  approvalTimeout: 30,
  transport: { mode: "auto" },
  encryption: {
    e2ee: true,
    allowPlainRelay: false,
    securityMode: "E2EE_REQUIRED",
  },
  webrtc: {
    enabled: true,
    stun: ["stun:stun.l.google.com:19302"],
    turn: { enabled: false, servers: [] },
  },
  websocket: {
    relayEnabled: true,
    requireE2ee: true,
  },
};

export const get = query({
  args: {},
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("linkSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!existing) return DEFAULT_SETTINGS;

    return {
      autoApprove: existing.autoApprove,
      autoApproveSameUser: existing.autoApproveSameUser,
      approvalTimeout: existing.approvalTimeout,
      transport: existing.transport,
      encryption: existing.encryption,
      webrtc: existing.webrtc ?? DEFAULT_SETTINGS.webrtc,
      websocket: existing.websocket ?? DEFAULT_SETTINGS.websocket,
    };
  },
});

export const update = mutation({
  args: {
    settings: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("linkSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    const s = args.settings;

    if (existing) {
      await ctx.db.patch(existing._id, {
        autoApprove: s.autoApprove ?? existing.autoApprove,
        autoApproveSameUser: s.autoApproveSameUser ?? existing.autoApproveSameUser,
        approvalTimeout: s.approvalTimeout ?? existing.approvalTimeout,
        transport: s.transport ?? existing.transport,
        encryption: s.encryption ?? existing.encryption,
        webrtc: s.webrtc ?? existing.webrtc,
        websocket: s.websocket ?? existing.websocket,
      });
      return await ctx.db.get(existing._id);
    }

    const id = await ctx.db.insert("linkSettings", {
      userId: userId,
      autoApprove: s.autoApprove ?? DEFAULT_SETTINGS.autoApprove,
      autoApproveSameUser: s.autoApproveSameUser ?? DEFAULT_SETTINGS.autoApproveSameUser,
      approvalTimeout: s.approvalTimeout ?? DEFAULT_SETTINGS.approvalTimeout,
      transport: s.transport ?? DEFAULT_SETTINGS.transport,
      encryption: s.encryption ?? DEFAULT_SETTINGS.encryption,
      webrtc: s.webrtc ?? DEFAULT_SETTINGS.webrtc,
      websocket: s.websocket ?? DEFAULT_SETTINGS.websocket,
    });

    return await ctx.db.get(id);
  },
});
