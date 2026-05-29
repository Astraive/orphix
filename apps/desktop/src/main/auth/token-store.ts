import { app, safeStorage } from "electron";
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";

interface TokenData {
  accessToken: string;
  refreshToken: string;
  userId?: string;
  username?: string;
}

const TOKEN_DIR = join(app.getPath("userData"), "auth");
const TOKEN_FILE = join(TOKEN_DIR, "tokens.enc");

function ensureDir(): void {
  if (!existsSync(TOKEN_DIR)) mkdirSync(TOKEN_DIR, { recursive: true });
}

export function storeTokens(tokens: TokenData): void {
  ensureDir();
  const json = JSON.stringify(tokens);
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(json);
    writeFileSync(TOKEN_FILE, encrypted);
  } else {
    // Fallback: base64 encoding (not secure, but functional)
    writeFileSync(TOKEN_FILE, Buffer.from(json).toString("base64"));
  }
}

export function loadTokens(): TokenData | null {
  try {
    if (!existsSync(TOKEN_FILE)) return null;
    const data = readFileSync(TOKEN_FILE);
    let json: string;
    if (safeStorage.isEncryptionAvailable()) {
      json = safeStorage.decryptString(data);
    } else {
      json = Buffer.from(data.toString(), "base64").toString();
    }
    return JSON.parse(json) as TokenData;
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  try {
    if (existsSync(TOKEN_FILE)) unlinkSync(TOKEN_FILE);
  } catch {
    // ignore
  }
}
