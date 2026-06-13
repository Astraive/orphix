import type { FastifyInstance } from "fastify";
import Redis from "ioredis";

let redis: Redis;

export async function setupRedis(app: FastifyInstance, url: string) {
  redis = new Redis(url);
  app.decorate("redis", redis);
  app.addHook("onClose", async () => {
    await redis.quit();
  });
}

export function getRedis(): Redis {
  return redis;
}
