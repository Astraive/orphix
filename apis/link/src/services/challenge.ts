import * as crypto from "crypto";
import { getRedis } from "../plugins/redis";
import { REDIS_KEYS, REDIS_TTL } from "@orphix/config";

export async function generateChallenge(socketId: string): Promise<string> {
  const nonce = crypto.randomBytes(32).toString("hex");
  const redis = getRedis();
  await redis.setex(REDIS_KEYS.challengeNonce(socketId), REDIS_TTL.challenge, nonce);
  return nonce;
}

export async function verifyChallenge(socketId: string, nonce: string): Promise<boolean> {
  const redis = getRedis();
  const stored = await redis.get(REDIS_KEYS.challengeNonce(socketId));
  if (!stored) return false;

  // Constant-time comparison to prevent timing attacks
  const storedBuf = Buffer.from(stored, "hex");
  const nonceBuf = Buffer.from(nonce, "hex");

  if (storedBuf.length !== nonceBuf.length) {
    await redis.del(REDIS_KEYS.challengeNonce(socketId));
    return false;
  }

  const valid = crypto.timingSafeEqual(storedBuf, nonceBuf);

  // Delete after verification (one-time use)
  await redis.del(REDIS_KEYS.challengeNonce(socketId));

  return valid;
}
