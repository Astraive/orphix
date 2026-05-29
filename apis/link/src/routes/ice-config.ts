import type { FastifyInstance } from "fastify";

// STUN servers for NAT traversal (srflx candidates).
// TURN servers are NOT included — Link Relay (WebSocket fallback) is the free alternative.
// For direct P2P: STUN works with cone NATs (most home routers).
// For symmetric NATs (some mobile carriers): use Link Relay.
// Future: add TURN for paid users who want guaranteed P2P.
const ICE_CONFIG = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302"] },
    { urls: ["stun:stun1.l.google.com:19302"] },
    { urls: ["stun:stun2.l.google.com:19302"] },
  ],
  iceTransportPolicy: "all",
};

export function iceConfigRoute(app: FastifyInstance) {
  app.get("/v1/link/ice-config", async (_req, reply) => {
    return reply.send(ICE_CONFIG);
  });
}
