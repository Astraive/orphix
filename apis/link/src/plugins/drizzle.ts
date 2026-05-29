import type { FastifyInstance } from "fastify";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let db: PostgresJsDatabase;

export async function setupDrizzle(app: FastifyInstance, url: string) {
  const client = postgres(url);
  db = drizzle(client);
  app.decorate("db", db);
  app.addHook("onClose", async () => { await client.end(); });
}

export function getDb(): PostgresJsDatabase {
  return db;
}
