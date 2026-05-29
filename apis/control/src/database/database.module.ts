import { Module, Global } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DatabaseService } from "./database.service";

@Global()
@Module({
  providers: [
    {
      provide: "DATABASE_CONNECTION",
      useFactory: (config: ConfigService) => {
        const url = config.get<string>("DATABASE_URL");
        if (!url) throw new Error("DATABASE_URL environment variable is required");
        const client = postgres(url);
        return drizzle(client);
      },
      inject: [ConfigService],
    },
    DatabaseService,
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
