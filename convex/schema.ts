import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    githubId: v.optional(v.string()),
    githubUsername: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_githubId", ["githubId"])
    .index("by_email", ["email"]),

  devices: defineTable({
    userId: v.id("users"),
    deviceId: v.string(),
    deviceType: v.string(),
    deviceName: v.string(),
    platform: v.optional(v.string()),
    appVersion: v.optional(v.string()),
    publicKey: v.string(),
    status: v.string(),
    createdAt: v.number(),
    lastSeenAt: v.optional(v.number()),
  })
    .index("by_deviceId", ["deviceId"])
    .index("by_userId", ["userId"]),

  trustedDevices: defineTable({
    userId: v.id("users"),
    desktopDeviceId: v.string(),
    mobileDeviceId: v.string(),
    trustLevel: v.string(),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_user_devices", ["userId", "desktopDeviceId", "mobileDeviceId"]),

  linkSessions: defineTable({
    userId: v.id("users"),
    desktopDeviceId: v.string(),
    mobileDeviceId: v.string(),
    workspaceId: v.optional(v.string()),
    windowId: v.optional(v.string()),
    terminalId: v.optional(v.string()),
    mode: v.string(),
    status: v.string(),
    transport: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    endedAt: v.optional(v.number()),
  }).index("by_userId", ["userId"]),

  notes: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.string()),
    title: v.string(),
    content: v.string(),
    syncEnabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_workspace", ["userId", "workspaceId"]),

  auditLogs: defineTable({
    userId: v.optional(v.id("users")),
    deviceId: v.optional(v.string()),
    action: v.string(),
    resource: v.optional(v.string()),
    details: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  extensions: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    authorId: v.string(),
    category: v.string(),
    iconUrl: v.optional(v.string()),
    homepageUrl: v.optional(v.string()),
    repositoryUrl: v.optional(v.string()),
    latestVersion: v.string(),
    installCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["category"])
    .index("by_author", ["authorId"]),

  extensionVersions: defineTable({
    extensionId: v.string(),
    version: v.string(),
    changelog: v.string(),
    downloadUrl: v.string(),
    checksum: v.string(),
    publishedAt: v.number(),
  })
    .index("by_extension", ["extensionId"])
    .index("by_ext_version", ["extensionId", "version"]),

  extensionInstallations: defineTable({
    extensionId: v.string(),
    userId: v.string(),
    deviceId: v.string(),
    installedVersion: v.string(),
    installedAt: v.number(),
  })
    .index("by_user_ext", ["userId", "extensionId"])
    .index("by_device", ["deviceId"]),

  linkSettings: defineTable({
    userId: v.id("users"),
    autoApprove: v.boolean(),
    autoApproveSameUser: v.boolean(),
    approvalTimeout: v.number(),
    transport: v.any(),
    encryption: v.any(),
    webrtc: v.optional(v.any()),
    websocket: v.optional(v.any()),
  }).index("by_userId", ["userId"]),

  encryptedTokens: defineTable({
    userId: v.id("users"),
    tokenType: v.string(),
    encryptedValue: v.string(),
    tokenHash: v.string(),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  }).index("by_hash", ["tokenHash"])
    .index("by_user", ["userId"]),
});
