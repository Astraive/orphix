import * as crypto from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../plugins/drizzle";
import { getRedis } from "../plugins/redis";
import { linkSessions } from "@orphix/database";
import { REDIS_KEYS, REDIS_TTL } from "@orphix/config";
import type { ActiveTransport, LinkMode } from "@orphix/types";

export async function createLinkSession(userId: string, desktopDeviceId: string, mobileDeviceId: string, mode: LinkMode, workspaceId?: string, windowId?: string, terminalId?: string) {
  const db = getDb();
  const redis = getRedis();

  const expiresAt = new Date(Date.now() + REDIS_TTL.linkSession * 1000);

  const [session] = await db
    .insert(linkSessions)
    .values({
      userId,
      desktopDeviceId,
      mobileDeviceId,
      mode,
      workspaceId: workspaceId ?? null,
      windowId: windowId ?? null,
      terminalId: terminalId ?? null,
      expiresAt,
    })
    .returning();

  // Cache in Redis
  await redis.setex(
    REDIS_KEYS.linkSession(session.id),
    REDIS_TTL.linkSession,
    JSON.stringify({
      id: session.id,
      userId,
      desktopDeviceId,
      mobileDeviceId,
      mode,
      status: "requested",
      transport: "pending",
      workspaceId,
      windowId,
      terminalId,
    }),
  );

  return session;
}

export async function updateSessionStatus(sessionId: string, status: string): Promise<void> {
  const db = getDb();
  const redis = getRedis();

  await db.update(linkSessions).set({ status }).where(eq(linkSessions.id, sessionId));

  const cached = await redis.get(REDIS_KEYS.linkSession(sessionId));
  if (cached) {
    const parsed = JSON.parse(cached);
    parsed.status = status;
    await redis.setex(REDIS_KEYS.linkSession(sessionId), REDIS_TTL.linkSession, JSON.stringify(parsed));
  }
}

export async function updateSessionTransport(sessionId: string, transport: ActiveTransport): Promise<void> {
  const redis = getRedis();
  const cached = await redis.get(REDIS_KEYS.linkSession(sessionId));
  if (cached) {
    const parsed = JSON.parse(cached);
    parsed.transport = transport;
    await redis.setex(REDIS_KEYS.linkSession(sessionId), REDIS_TTL.linkSession, JSON.stringify(parsed));
  }
}

export async function getSessionFromCache(sessionId: string): Promise<Record<string, unknown> | null> {
  const redis = getRedis();
  const data = await redis.get(REDIS_KEYS.linkSession(sessionId));
  return data ? JSON.parse(data) : null;
}

export async function getLinkSession(sessionId: string): Promise<Record<string, unknown> | null> {
  const cached = await getSessionFromCache(sessionId);
  if (cached) return cached;

  const db = getDb();
  const [session] = await db
    .select()
    .from(linkSessions)
    .where(eq(linkSessions.id, sessionId))
    .limit(1);

  if (!session) return null;

  const data = {
    id: session.id,
    userId: session.userId,
    desktopDeviceId: session.desktopDeviceId,
    mobileDeviceId: session.mobileDeviceId,
    mode: session.mode,
    status: session.status,
    transport: session.transport,
    workspaceId: session.workspaceId,
    windowId: session.windowId,
    terminalId: session.terminalId,
  };

  if (!session.expiresAt || new Date(session.expiresAt) > new Date()) {
    const redis = getRedis();
    await redis.setex(REDIS_KEYS.linkSession(sessionId), REDIS_TTL.linkSession, JSON.stringify(data));
  }

  return data;
}

export async function generateLinkToken(sessionId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const redis = getRedis();
  await redis.setex(`link:token:${sessionId}`, REDIS_TTL.linkSession, token);
  return token;
}

export async function verifyLinkToken(sessionId: string, token: string): Promise<boolean> {
  const redis = getRedis();
  const stored = await redis.get(`link:token:${sessionId}`);
  if (!stored) return false;

  // Constant-time comparison to prevent timing attacks
  const storedBuf = Buffer.from(stored, "hex");
  const tokenBuf = Buffer.from(token, "hex");
  if (storedBuf.length !== tokenBuf.length) return false;
  return crypto.timingSafeEqual(storedBuf, tokenBuf);
}
