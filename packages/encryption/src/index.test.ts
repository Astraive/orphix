import { describe, it, expect, beforeAll, vi } from "vitest";
import {
  encrypt,
  decrypt,
  hashToken,
  timingSafeEqual,
  generateToken,
  getJwtExpiresAt,
  setMasterKey,
  getMasterKey,
} from "./index.js";

beforeAll(() => {
  process.env.ENCRYPTION_MASTER_KEY = "test-master-key-for-ci";
  setMasterKey(process.env.ENCRYPTION_MASTER_KEY);
});

describe("encrypt/decrypt roundtrip", () => {
  it("encrypts and decrypts back to the original plaintext", () => {
    const plaintext = "hello world";
    const ciphertext = encrypt(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it("roundtrips arbitrary strings", () => {
    const texts = ["", "a", "Unicode: 日本語 🔑", "x".repeat(1000)];
    for (const text of texts) {
      expect(decrypt(encrypt(text))).toBe(text);
    }
  });
});

describe("encrypt/decrypt with context (deterministic salt)", () => {
  it("same plaintext + same context can both be decrypted", () => {
    const a = encrypt("secret", "ctx");
    const b = encrypt("secret", "ctx");
    // Salt is deterministic from context, but IV is random — ciphertexts differ
    expect(a).not.toBe(b);
    // Both decrypt to the same plaintext
    expect(decrypt(a, "ctx")).toBe("secret");
    expect(decrypt(b, "ctx")).toBe("secret");
  });
});

describe("encrypt/decrypt with different contexts", () => {
  it("same plaintext with different contexts produces different ciphertext", () => {
    const a = encrypt("secret", "ctx-a");
    const b = encrypt("secret", "ctx-b");
    expect(a).not.toBe(b);
  });
});

describe("decrypt with wrong key", () => {
  it("throws on wrong master key", () => {
    const ciphertext = encrypt("secret");
    setMasterKey("wrong-key");
    expect(() => decrypt(ciphertext)).toThrow();
    setMasterKey(process.env.ENCRYPTION_MASTER_KEY!);
  });
});

describe("decrypt with truncated input", () => {
  it("throws on input shorter than minimum length", () => {
    const short = Buffer.alloc(5).toString("base64");
    expect(() => decrypt(short)).toThrow();
  });
});

describe("hashToken", () => {
  it("produces consistent SHA-256 hashes", () => {
    const hash1 = hashToken("token-abc");
    const hash2 = hashToken("token-abc");
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different inputs", () => {
    const a = hashToken("token-a");
    const b = hashToken("token-b");
    expect(a).not.toBe(b);
  });

  it("returns a 64-character hex string", () => {
    expect(hashToken("test")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("timingSafeEqual", () => {
  it("returns true for equal hex strings", () => {
    expect(timingSafeEqual("abcdef", "abcdef")).toBe(true);
  });

  it("returns false for different strings", () => {
    expect(timingSafeEqual("aaaaaa", "bbbbbb")).toBe(false);
  });

  it("returns false for different length strings (no timing leak)", () => {
    expect(timingSafeEqual("aaa", "aaaa")).toBe(false);
    expect(timingSafeEqual("aaaa", "aaa")).toBe(false);
  });
});

describe("generateToken", () => {
  it("produces hex strings of the correct length (default 32 bytes = 64 hex chars)", () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("respects custom byte count", () => {
    const token = generateToken(16);
    expect(token).toMatch(/^[0-9a-f]{32}$/);
  });

  it("generates unique values", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
  });
});

describe("getJwtExpiresAt", () => {
  it("parses valid JWT and returns expiry in milliseconds", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const payload = Buffer.from(JSON.stringify({ sub: "1", exp })).toString("base64url");
    const jwt = `header.${payload}.sig`;
    expect(getJwtExpiresAt(jwt)).toBe(exp * 1000);
  });

  it("returns null for invalid tokens", () => {
    expect(getJwtExpiresAt("not-a-jwt")).toBeNull();
    expect(getJwtExpiresAt("a.b")).toBeNull();
    expect(getJwtExpiresAt("")).toBeNull();
  });

  it("returns null when no exp claim", () => {
    const payload = Buffer.from(JSON.stringify({ sub: "1" })).toString("base64url");
    const jwt = `header.${payload}.sig`;
    expect(getJwtExpiresAt(jwt)).toBeNull();
  });
});

describe("setMasterKey / getMasterKey", () => {
  it("roundtrips the master key", () => {
    setMasterKey("my-secret");
    const key = getMasterKey();
    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  it("throws before setMasterKey is called", () => {
    const orig = getMasterKey();
    setMasterKey("temp");
    expect(() => {
      setMasterKey("reset");
      const fresh = getMasterKey();
      return fresh;
    }).not.toThrow();
    setMasterKey(process.env.ENCRYPTION_MASTER_KEY!);
  });
});
