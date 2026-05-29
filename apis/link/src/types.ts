import "fastify";

declare module "fastify" {
  interface FastifyInstance {
    redis: import("ioredis").Redis;
    db: import("drizzle-orm/postgres-js").PostgresJsDatabase;
  }
}
