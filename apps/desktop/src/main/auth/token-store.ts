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

function getJwtExpiresAt(accessToken: string): number | null {
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

export async function getValidAccessToken(controlUrl: string): Promise<string | null> {
  const tokens = loadTokens();
  if (!tokens?.accessToken) return null;

  const expiresAt = getJwtExpiresAt(tokens.accessToken);
  if (expiresAt && Date.now() < expiresAt - 60_000) {
    return tokens.accessToken;
  }

  if (!tokens.refreshToken) return null;

  try {
    const res = await fetch(`${controlUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as Partial<TokenData>;
    if (!data.accessToken || !data.refreshToken) return null;

    storeTokens({
      ...tokens,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });

    return data.accessToken;
  } catch {
    return null;
  }
}
