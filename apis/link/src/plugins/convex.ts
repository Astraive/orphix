import type { FastifyInstance } from "fastify";
import { ConvexClient } from "convex/browser";

let client: ConvexClient;

export async function setupConvex(app: FastifyInstance, url: string) {
  client = new ConvexClient(url);
  app.decorate("convex", client);
  app.addHook("onClose", async () => {
    client.close();
  });
}

export function getConvex(): ConvexClient {
  return client;
}
