import { getRedis } from "../plugins/redis";
import { REDIS_KEYS, REDIS_TTL } from "@orphix/config";
import { getDb } from "../plugins/drizzle";
import { devices } from "@orphix/database";
import { eq } from "drizzle-orm";
import type { WebSocket } from "ws";

// ── In-memory WebSocket registry (device → live socket) ──
const wsRegistry = new Map<string, WebSocket>();

async function touchDevicePresence(deviceId: string): Promise<void> {
  try {
    await getDb()
      .update(devices)
      .set({ lastSeenAt: new Date() })
      .where(eq(devices.deviceId, deviceId));
  } catch (error) {
    console.warn(`[presence] Failed to update lastSeenAt for ${deviceId}:`, error);
  }
}

export function registerWs(deviceId: string, ws: WebSocket): void {
  wsRegistry.set(deviceId, ws);
}

export function getWs(deviceId: string): WebSocket | undefined {
  return wsRegistry.get(deviceId);
}

export function unregisterWs(deviceId: string, ws?: WebSocket): void {
  // Only unregister if the caller's socket is still the registered one.
  // Prevents a stale close handler from unregistering a newer reconnection.
  if (!ws || wsRegistry.get(deviceId) === ws) {
    wsRegistry.delete(deviceId);
  }
}

export function sendToDevice(deviceId: string, msg: object): boolean {
  const ws = wsRegistry.get(deviceId);
  const type = (msg as any).type ?? "unknown";
  if (ws && ws.readyState === 1 /* WebSocket.OPEN */) {
    ws.send(JSON.stringify(msg));
    console.log(`[relay] sendToDevice(${deviceId}): ${type} OK`);
    return true;
  }
  console.log(`[relay] sendToDevice(${deviceId}): ${type} FAILED (ws=${ws ? "found" : "missing"}, state=${ws?.readyState})`);
  return false;
}

export async function setOnline(deviceType: "desktop" | "mobile", deviceId: string): Promise<void> {
  const redis = getRedis();
  const key = deviceType === "desktop" ? REDIS_KEYS.presenceDesktop(deviceId) : REDIS_KEYS.presenceMobile(deviceId);
  await redis.setex(key, REDIS_TTL.presence, "online");
  await touchDevicePresence(deviceId);
}

export async function isOnline(deviceType: "desktop" | "mobile", deviceId: string): Promise<boolean> {
  const redis = getRedis();
  const key = deviceType === "desktop" ? REDIS_KEYS.presenceDesktop(deviceId) : REDIS_KEYS.presenceMobile(deviceId);
  return (await redis.exists(key)) === 1;
}

export async function setOffline(deviceType: "desktop" | "mobile", deviceId: string): Promise<void> {
  const redis = getRedis();
  const key = deviceType === "desktop" ? REDIS_KEYS.presenceDesktop(deviceId) : REDIS_KEYS.presenceMobile(deviceId);
  await redis.del(key);
}

export async function refreshPresence(deviceType: "desktop" | "mobile", deviceId: string): Promise<void> {
  const redis = getRedis();
  const key = deviceType === "desktop" ? REDIS_KEYS.presenceDesktop(deviceId) : REDIS_KEYS.presenceMobile(deviceId);
  await redis.expire(key, REDIS_TTL.presence);
  await touchDevicePresence(deviceId);
}

export async function mapDeviceSocket(deviceId: string, socketId: string): Promise<void> {
  const redis = getRedis();
  await redis.setex(REDIS_KEYS.deviceSocket(deviceId), REDIS_TTL.presence, socketId);
  await redis.setex(REDIS_KEYS.socketDevice(socketId), REDIS_TTL.presence, deviceId);
}

export async function getSocketByDevice(deviceId: string): Promise<string | null> {
  const redis = getRedis();
  return redis.get(REDIS_KEYS.deviceSocket(deviceId));
}

export async function getDeviceBySocket(socketId: string): Promise<string | null> {
  const redis = getRedis();
  return redis.get(REDIS_KEYS.socketDevice(socketId));
}

export async function removeSocketMapping(socketId: string): Promise<void> {
  const redis = getRedis();
  const deviceId = await redis.get(REDIS_KEYS.socketDevice(socketId));
  if (deviceId) {
    await redis.del(REDIS_KEYS.deviceSocket(deviceId));
  }
  await redis.del(REDIS_KEYS.socketDevice(socketId));
}
