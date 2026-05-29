import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deviceId: text("device_id").unique().notNull(),
  deviceType: text("device_type").notNull(),
  deviceName: text("device_name").notNull(),
  platform: text("platform"),
  appVersion: text("app_version"),
  publicKey: text("public_key").notNull(),
  status: text("status").notNull().default("registered"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

export const trustedDevices = pgTable("trusted_devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  desktopDeviceId: text("desktop_device_id").notNull().references(() => devices.deviceId),
  mobileDeviceId: text("mobile_device_id").notNull().references(() => devices.deviceId),
  trustLevel: text("trust_level").notNull().default("view_only"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
