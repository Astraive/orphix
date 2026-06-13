import "fastify";

declare module "fastify" {
  interface FastifyInstance {
    redis: import("ioredis").Redis;
    convex: import("convex/browser").ConvexClient;
  }
}
