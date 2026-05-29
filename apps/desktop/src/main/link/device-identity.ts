import { app } from "electron";
import { hostname } from "os";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { randomUUID, generateKeyPairSync } from "crypto";
import { safeStorage } from "electron";

export interface DeviceIdentityData {
  deviceId: string;
  publicKey: string;   // base64-encoded DER (SPKI) — safe to store in plaintext
  privateKey: string;  // base64-encoded DER (PKCS8) — encrypted at rest via safeStorage
}

function getIdentityDir(): string {
  const dir = join(app.getPath("userData"), "link");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function getIdentityPath(): string {
  return join(getIdentityDir(), "device-identity.enc.json");
}

function getLegacyPath(): string {
  return join(getIdentityDir(), "device-identity.json");
}

/**
 * Get or create the persisted device identity.
 * The private key is encrypted at rest using Electron's safeStorage.
 */
export function getOrCreateDeviceIdentity(): DeviceIdentityData {
  const identityPath = getIdentityPath();
  const legacyPath = getLegacyPath();

  // Try to read encrypted file first
  if (existsSync(identityPath)) {
    try {
      const raw = JSON.parse(readFileSync(identityPath, "utf-8"));
      if (raw.encrypted && safeStorage.isEncryptionAvailable()) {
        const decrypted = safeStorage.decryptString(Buffer.from(raw.privateKey, "base64"));
        return {
          deviceId: raw.deviceId,
          publicKey: raw.publicKey,
          privateKey: decrypted,
        };
      }
    } catch { /* corrupted — regenerate */ }
  }

  // Migrate from legacy plaintext file if it exists
  if (existsSync(legacyPath)) {
    try {
      const legacy = JSON.parse(readFileSync(legacyPath, "utf-8")) as DeviceIdentityData;
      if (legacy.deviceId && legacy.publicKey && legacy.privateKey) {
        // Re-encrypt and save
        writeEncryptedIdentity(legacy);
        // Delete legacy file
        try { require("fs").unlinkSync(legacyPath); } catch { /* ignore */ }
        return legacy;
      }
    } catch { /* corrupted — regenerate */ }
  }

  // Generate new Ed25519 keypair
  const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "der" },
  });

  const identity: DeviceIdentityData = {
    deviceId: `dev_${randomUUID().replace(/-/g, "").substring(0, 12)}`,
    publicKey: publicKey.toString("base64"),
    privateKey: privateKey.toString("base64"),
  };

  writeEncryptedIdentity(identity);
  return identity;
}

/**
 * Build a payload suitable for POST /devices/register.
 */
export function getDeviceRegistrationPayload(identity: DeviceIdentityData) {
  return {
    deviceId: identity.deviceId,
    deviceType: "desktop" as const,
    deviceName: hostname(),
    publicKey: identity.publicKey,
  };
}

function writeEncryptedIdentity(identity: DeviceIdentityData): void {
  const identityPath = getIdentityPath();

  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(identity.privateKey);
    writeFileSync(identityPath, JSON.stringify({
      deviceId: identity.deviceId,
      publicKey: identity.publicKey,
      privateKey: encrypted.toString("base64"),
      encrypted: true,
    }, null, 2));
  } else {
    // Fallback: plaintext if safeStorage unavailable (shouldn't happen in normal Electron)
    console.warn("[device-identity] safeStorage not available, storing key in plaintext");
    writeFileSync(identityPath, JSON.stringify({
      deviceId: identity.deviceId,
      publicKey: identity.publicKey,
      privateKey: identity.privateKey,
      encrypted: false,
    }, null, 2));
  }
}
