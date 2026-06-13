import Fastify from "fastify";
import websocket from "@fastify/websocket";
import cors from "@fastify/cors";
import "./types";
import { config } from "./config";
import { setupRedis } from "./plugins/redis";
import { setupConvex } from "./plugins/convex";
import { handleRelaySocket } from "./relay";

async function main() {
  const app = Fastify({ logger: true });

  const envOrigins = process.env.CORS_ORIGINS?.split(",").filter(Boolean);
  const allowedOrigins = envOrigins?.length
    ? envOrigins
    : ["http://localhost:3000", "http://localhost:5173"];
  await app.register(cors, { origin: allowedOrigins, credentials: true });

  await app.register(websocket);

  await setupRedis(app, config.redisUrl);
  await setupConvex(app, config.convexUrl);

  app.get("/health", async () => ({ status: "ok", service: "link-relay" }));

  app.get("/v1/link/relay", { websocket: true }, (socket) => {
    handleRelaySocket(socket, app);
  });

  await app.listen({ port: config.port, host: config.host });
  console.log(`[link-relay] listening on http://${config.host}:${config.port}`);
}

main().catch((err) => {
  console.error("[link-relay] failed to start:", err);
  process.exit(1);
});
