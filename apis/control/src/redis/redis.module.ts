import { Module, Global } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { RedisService } from "./redis.service";

@Global()
@Module({
  providers: [
    {
      provide: "REDIS_CLIENT",
      useFactory: (config: ConfigService) => {
        const url = config.get<string>("REDIS_URL");
        if (!url) throw new Error("REDIS_URL environment variable is required");
        return new Redis(url);
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
