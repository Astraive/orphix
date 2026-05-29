import { Injectable, Inject } from "@nestjs/common";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

@Injectable()
export class DatabaseService {
  constructor(@Inject("DATABASE_CONNECTION") public readonly db: PostgresJsDatabase) {}
}
