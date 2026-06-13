import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {
    category: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 100);
    const offset = args.offset ?? 0;

    const all = args.category
      ? await ctx.db.query("extensions").withIndex("by_category", (ix) => ix.eq("category", args.category!)).collect()
      : await ctx.db.query("extensions").withIndex("by_slug").collect();
    let filtered = all;

    if (args.search) {
      const search = args.search.toLowerCase();
      filtered = all.filter(
        (ext) =>
          ext.name.toLowerCase().includes(search) ||
          ext.slug.toLowerCase().includes(search) ||
          ext.description.toLowerCase().includes(search)
      );
    }

    return {
      extensions: filtered.slice(offset, offset + limit),
      total: filtered.length,
      limit,
      offset,
    };
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("extensions")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const create = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    authorId: v.string(),
    category: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
    homepageUrl: v.optional(v.string()),
    repositoryUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const id = await ctx.db.insert("extensions", {
      slug: args.slug,
      name: args.name,
      description: args.description ?? "",
      authorId: args.authorId,
      category: args.category ?? "general",
      iconUrl: args.iconUrl,
      homepageUrl: args.homepageUrl,
      repositoryUrl: args.repositoryUrl,
      latestVersion: "0.1.0",
      installCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

export const install = mutation({
  args: {
    extensionId: v.string(),
    deviceId: v.string(),
    installedVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("extensionInstallations")
      .withIndex("by_user_ext", (q) =>
        q.eq("userId", userId.toString()).eq("extensionId", args.extensionId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        installedVersion: args.installedVersion,
      });
      return await ctx.db.get(existing._id);
    }

    const id = await ctx.db.insert("extensionInstallations", {
      extensionId: args.extensionId,
      userId: userId.toString(),
      deviceId: args.deviceId,
      installedVersion: args.installedVersion,
      installedAt: Date.now(),
    });

    const ext = await ctx.db
      .query("extensions")
      .withIndex("by_slug", (q) => q.eq("slug", args.extensionId))
      .unique();
    if (ext) {
      await ctx.db.patch(ext._id, { installCount: ext.installCount + 1 });
    }

    return await ctx.db.get(id);
  },
});
