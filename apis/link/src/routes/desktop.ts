import type { FastifyInstance } from "fastify";
import { handleDesktopSocket } from "../handlers/desktop.handler";

export function desktopRoute(app: FastifyInstance) {
  app.get("/v1/link/desktop", { websocket: true }, (socket, req) => {
    handleDesktopSocket(socket, req, app);
  });
}
