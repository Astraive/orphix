import type { FastifyInstance } from "fastify";

export function healthRoute(app: FastifyInstance) {
  app.get("/health", async () => {
    return { status: "ok", service: "link", timestamp: new Date().toISOString() };
  });
}
