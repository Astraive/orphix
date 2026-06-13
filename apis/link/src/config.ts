import { setMasterKey } from "@orphix/encryption";

function requireEnv(name: string, fallback?: string): string {
  const val = process.env[name] ?? fallback;
  if (!val) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    throw new Error(`Missing environment variable: ${name}. Set it in .env or environment.`);
  }
  return val;
}

const masterKey = requireEnv("ENCRYPTION_MASTER_KEY", process.env.NODE_ENV !== "production" ? "orphix-dev-master-key" : undefined);
setMasterKey(masterKey);

export const config = {
  port: Number(process.env.PORT ?? 2606),
  host: process.env.HOST ?? "0.0.0.0",
  convexUrl: requireEnv("CONVEX_URL"),
  redisUrl: requireEnv("REDIS_URL", "redis://localhost:6379"),
} as const;
