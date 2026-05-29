import type { FastifyInstance } from "fastify";
import { handleMobileSocket } from "../handlers/mobile.handler";

export function mobileRoute(app: FastifyInstance) {
  app.get("/v1/link/mobile", { websocket: true }, (socket, req) => {
    handleMobileSocket(socket, req, app);
  });
}
