import Fastify from "fastify";
import websocket from "@fastify/websocket";
import cors from "@fastify/cors";
import "./types";
import { config } from "./config";
import { setupRedis, getRedis } from "./plugins/redis";
import { setupDrizzle, getDb } from "./plugins/drizzle";
import { desktopRoute } from "./routes/desktop";
import { mobileRoute } from "./routes/mobile";
import { healthRoute } from "./routes/health";
import { iceConfigRoute } from "./routes/ice-config";
import { relayRoutes } from "./routes/relay.routes";

async function main() {
  const app = Fastify({ logger: true });

  // Register CORS (required for ice-config endpoint from desktop renderer)
  const envOrigins = process.env.CORS_ORIGINS?.split(",").filter(Boolean);
  const allowedOrigins = envOrigins?.length
    ? envOrigins
    : ["http://localhost:3000", "http://localhost:5173"];
  await app.register(cors, { origin: allowedOrigins, credentials: true });

  // Register WebSocket plugin
  await app.register(websocket);

  // Setup connections
  await setupRedis(app, config.redisUrl);
  await setupDrizzle(app, config.databaseUrl);

  // Register routes
  healthRoute(app);
  desktopRoute(app);
  mobileRoute(app);
  iceConfigRoute(app);
  relayRoutes(app);

  // Start server
  await app.listen({ port: config.port, host: config.host });
  console.log(`[link] listening on http://${config.host}:${config.port}`);
}

main().catch((err) => {
  console.error("[link] failed to start:", err);
  process.exit(1);
});
