import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

let masterKey: Buffer | null = null;

function deriveKey(master: Buffer, salt: Buffer): Buffer {
  return createHash("sha256").update(master).update(salt).digest();
}

export function setMasterKey(key: string): void {
  masterKey = createHash("sha256").update(key).digest();
}

export function getMasterKey(): Buffer {
  if (!masterKey) {
    throw new Error("Master key not set. Call setMasterKey() first or set ENCRYPTION_MASTER_KEY env var.");
  }
  return masterKey;
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns base64-encoded string: base64(salt + iv + tag + ciphertext)
 */
export function encrypt(plaintext: string, context?: string): string {
  const key = getMasterKey();
  const salt = context ? createHash("sha256").update(context).digest().subarray(0, 16) : randomBytes(16);
  const derivedKey = deriveKey(key, salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, derivedKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, tag, encrypted]).toString("base64");
}

/**
 * Decrypt ciphertext produced by encrypt().
 */
export function decrypt(encoded: string, context?: string): string {
  const key = getMasterKey();
  const data = Buffer.from(encoded, "base64");

  if (data.length < 16 + IV_LENGTH + TAG_LENGTH) {
    throw new Error("Invalid ciphertext: too short");
  }

  const salt = data.subarray(0, 16);
  const iv = data.subarray(16, 16 + IV_LENGTH);
  const tag = data.subarray(16 + IV_LENGTH, 16 + IV_LENGTH + TAG_LENGTH);
  const ciphertext = data.subarray(16 + IV_LENGTH + TAG_LENGTH);

  const derivedKey = deriveKey(key, salt);
  const decipher = createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(tag);

  return decipher.update(ciphertext) + decipher.final("utf8");
}

/**
 * Hash a token for storage (SHA-256, non-reversible).
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Constant-time comparison to prevent timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  const len = Math.max(bufA.length, bufB.length);
  let result = 0;
  for (let i = 0; i < len; i++) {
    result |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  result |= bufA.length ^ bufB.length;
  return result === 0;
}

/**
 * Generate a cryptographically secure random token.
 */
export function generateToken(bytes: number = 32): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * Get JWT expiration time in milliseconds from now.
 * Returns null if token is invalid or has no exp claim.
 */
export function getJwtExpiresAt(accessToken: string): number | null {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(Buffer.from(normalized, "base64").toString("utf-8")) as { exp?: number };
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Decode JWT payload without verification (for trusted tokens only).
 */
export function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(normalized, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}
