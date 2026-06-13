import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const storeToken = action({
  args: {
    tokenType: v.string(),
    token: v.string(),
    expiresInDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const encrypted = await ctx.runAction("cryptoActions:encryptData", {
      plaintext: args.token,
      context: `user:${userId}`,
    });

    const tokenHash = await ctx.runAction("cryptoActions:hashToken", {
      token: args.token,
    });

    const expiresAt = args.expiresInDays
      ? Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000
      : undefined;

    const id = await ctx.runMutation("tokens:insertToken", {
      tokenType: args.tokenType,
      encryptedValue: encrypted,
      tokenHash,
      expiresAt,
    });

    return { id, tokenHash };
  },
});

export const insertToken = mutation({
  args: {
    tokenType: v.string(),
    encryptedValue: v.string(),
    tokenHash: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("encryptedTokens", {
      userId: userId,
      tokenType: args.tokenType,
      encryptedValue: args.encryptedValue,
      tokenHash: args.tokenHash,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
    });
  },
});

export const verifyToken = query({
  args: { tokenHash: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("encryptedTokens")
      .withIndex("by_hash", (q) => q.eq("tokenHash", args.tokenHash))
      .unique();

    if (!record) return null;
    if (record.expiresAt && record.expiresAt < Date.now()) return null;

    return {
      userId: record.userId,
      tokenType: record.tokenType,
      encryptedValue: record.encryptedValue,
    };
  },
});

export const revokeTokens = mutation({
  args: {
    tokenType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const tokens = await ctx.db
      .query("encryptedTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let count = 0;
    for (const token of tokens) {
      if (args.tokenType && token.tokenType !== args.tokenType) continue;
      await ctx.db.delete(token._id);
      count++;
    }

    return { revoked: count };
  },
});
