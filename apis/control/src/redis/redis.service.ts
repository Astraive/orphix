import { Injectable, Inject } from "@nestjs/common";
import type Redis from "ioredis";

@Injectable()
export class RedisService {
  constructor(@Inject("REDIS_CLIENT") public readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    if (ttl) {
      const result = await this.redis.set(key, value, "EX", ttl, "NX");
      return result === "OK";
    } else {
      const result = await this.redis.set(key, value);
      return result === "OK";
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }
}
