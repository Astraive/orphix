import type { WebSocket } from "ws";
import * as crypto from "crypto";
import { jwtVerify } from "jose";
import { config } from "../config";
import { getDb } from "../plugins/drizzle";
import { devices, trustedDevices } from "@orphix/database";
import { eq, and } from "drizzle-orm";

export function sendJson(socket: WebSocket, data: Record<string, unknown>): void {
  try {
    socket.send(JSON.stringify(data));
  } catch (err) {
    console.warn("[link] sendJson failed:", err);
  }
}

export function parseMessage(raw: unknown): Record<string, unknown> | null {
  try {
    const str = typeof raw === "string" ? raw : raw instanceof Buffer ? raw.toString() : String(raw);
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export async function verifyJwt(token: string): Promise<{ sub: string; sid: string } | null> {
  try {
    const secret = new TextEncoder().encode(config.jwtSecret);
    const { payload } = await jwtVerify(token, secret, {
      issuer: "orphix",
      audience: "orphix-api",
    });
    return { sub: payload.sub as string, sid: payload.sid as string };
  } catch {
    return null;
  }
}

export async function getDevicePublicKey(deviceId: string): Promise<string | null> {
  try {
    const db = getDb();
    const [device] = await db
      .select({ publicKey: devices.publicKey })
      .from(devices)
      .where(eq(devices.deviceId, deviceId))
      .limit(1);
    return device?.publicKey ?? null;
  } catch {
    return null;
  }
}

export async function verifyDeviceProof(
  deviceId: string,
  nonce: string,
  socketId: string,
  timestamp: number,
  signature: string,
): Promise<boolean> {
  try {
    const publicKeyB64 = await getDevicePublicKey(deviceId);
    if (!publicKeyB64) return false;

    // Verify timestamp is recent (within 60 seconds, allows for clock skew)
    const now = Date.now();
    if (Math.abs(now - timestamp) > 60_000) return false;

    // Verify signature: sign(device_private_key, nonce + socketId + timestamp)
    const message = `${nonce}${socketId}${timestamp}`;
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(publicKeyB64, "base64"),
      format: "der",
      type: "spki",
    });

    const isValid = crypto.verify(
      null,
      Buffer.from(message),
      publicKey,
      Buffer.from(signature, "base64"),
    );

    return isValid;
  } catch {
    return false;
  }
}

export async function checkDeviceTrust(
  mobileDeviceId: string,
  desktopDeviceId: string,
): Promise<{ trusted: boolean; trustLevel: string | null }> {
  try {
    const db = getDb();
    const [trust] = await db
      .select()
      .from(trustedDevices)
      .where(
        and(
          eq(trustedDevices.mobileDeviceId, mobileDeviceId),
          eq(trustedDevices.desktopDeviceId, desktopDeviceId),
        ),
      )
      .limit(1);

    if (!trust || trust.revokedAt) return { trusted: false, trustLevel: null };
    return { trusted: true, trustLevel: trust.trustLevel };
  } catch {
    return { trusted: false, trustLevel: null };
  }
}

export async function checkDeviceOwnership(
  userId: string,
  deviceId: string,
): Promise<boolean> {
  try {
    const db = getDb();
    const [device] = await db
      .select({ id: devices.id })
      .from(devices)
      .where(and(eq(devices.userId, userId), eq(devices.deviceId, deviceId)))
      .limit(1);
    return !!device;
  } catch {
    return false;
  }
}
