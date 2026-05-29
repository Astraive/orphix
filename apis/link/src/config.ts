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

export const config = {
  port: Number(process.env.PORT ?? 2606),
  host: process.env.HOST ?? "0.0.0.0",
  databaseUrl: requireEnv("DATABASE_URL", process.env.NODE_ENV !== "production" ? "postgres://orphix:orphix_dev@localhost:5432/orphix" : undefined),
  redisUrl: requireEnv("REDIS_URL", process.env.NODE_ENV !== "production" ? "redis://localhost:6379" : undefined),
  jwtSecret: requireEnv("JWT_SECRET", process.env.NODE_ENV !== "production" ? "dev-jwt-secret-change-in-production" : undefined),
  controlApiUrl: requireEnv("CONTROL_API_URL", process.env.NODE_ENV !== "production" ? "http://localhost:2605" : undefined),
} as const;
