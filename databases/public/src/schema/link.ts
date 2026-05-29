import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const linkSessions = pgTable("link_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  desktopDeviceId: text("desktop_device_id").notNull(),
  mobileDeviceId: text("mobile_device_id").notNull(),
  workspaceId: text("workspace_id"),
  windowId: text("window_id"),
  terminalId: text("terminal_id"),
  mode: text("mode").notNull().default("full_control"),
  status: text("status").notNull().default("requested"),
  transport: text("transport").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});
