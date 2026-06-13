"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

const crypto = require("crypto") as typeof import("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getMasterKey(): Buffer {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) throw new Error("ENCRYPTION_MASTER_KEY not set");
  return crypto.createHash("sha256").update(key).digest();
}

function deriveKey(master: Buffer, salt: Buffer): Buffer {
  return crypto.createHash("sha256").update(master).update(salt).digest();
}

export const encryptData = action({
  args: { plaintext: v.string(), context: v.optional(v.string()) },
  handler: async (_ctx, args) => {
    const master = getMasterKey();
    const salt = args.context
      ? crypto.createHash("sha256").update(args.context).digest().subarray(0, 16)
      : crypto.randomBytes(16);
    const derived = deriveKey(master, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, derived, iv);
    const encrypted = Buffer.concat([cipher.update(args.plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([salt, iv, tag, encrypted]).toString("base64");
  },
});

export const decryptData = action({
  args: { encoded: v.string(), context: v.optional(v.string()) },
  handler: async (_ctx, args) => {
    const master = getMasterKey();
    const data = Buffer.from(args.encoded, "base64");
    const salt = data.subarray(0, 16);
    const iv = data.subarray(16, 16 + IV_LENGTH);
    const tag = data.subarray(16 + IV_LENGTH, 16 + IV_LENGTH + 16);
    const ciphertext = data.subarray(16 + IV_LENGTH + 16);
    const derived = deriveKey(master, salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, derived, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext) + decipher.final("utf8");
  },
});

export const hashToken = action({
  args: { token: v.string() },
  handler: async (_ctx, args) => {
    return crypto.createHash("sha256").update(args.token).digest("hex");
  },
});

export const generateToken = action({
  args: { bytes: v.optional(v.number()) },
  handler: async (_ctx, args) => {
    return crypto.randomBytes(args.bytes ?? 32).toString("hex");
  },
});
