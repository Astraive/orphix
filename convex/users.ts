import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const getByGithubId = query({
  args: { githubId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_githubId", (q) => q.eq("githubId", args.githubId))
      .unique();
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    githubId: v.optional(v.string()),
    githubUsername: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(userId, {
      ...args,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(userId);
  },
});

export const upsertFromOAuth = mutation({
  args: {
    provider: v.string(),
    providerUserId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    githubId: v.optional(v.string()),
    githubUsername: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(userId);
    if (existing) {
      await ctx.db.patch(userId, {
        name: args.name ?? existing.name,
        email: args.email ?? existing.email,
        image: args.image ?? existing.image,
        githubId: args.githubId ?? existing.githubId,
        githubUsername: args.githubUsername ?? existing.githubUsername,
        updatedAt: Date.now(),
      });
      return await ctx.db.get(userId);
    }

    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      image: args.image,
      githubId: args.githubId,
      githubUsername: args.githubUsername,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
