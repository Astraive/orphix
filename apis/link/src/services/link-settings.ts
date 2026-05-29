import { getRedis } from "../plugins/redis";
import { DEFAULT_LINK_SETTINGS, type LinkSettings } from "@orphix/types";

const defaults: LinkSettings = DEFAULT_LINK_SETTINGS;

function mergeSettings(raw: unknown): LinkSettings {
  const incoming = raw && typeof raw === "object" ? raw as Partial<LinkSettings> : {};
  return {
    ...defaults,
    ...incoming,
    transport: { ...defaults.transport, ...incoming.transport },
    encryption: { ...defaults.encryption, ...incoming.encryption },
    webrtc: {
      ...defaults.webrtc,
      ...incoming.webrtc,
      turn: {
        ...defaults.webrtc.turn,
        ...incoming.webrtc?.turn,
      },
    },
    websocket: { ...defaults.websocket, ...incoming.websocket },
  };
}

export async function getLinkSettings(userId: string): Promise<LinkSettings> {
  try {
    const redis = getRedis();
    const raw = await redis.get(`link:settings:${userId}`);
    if (!raw) return defaults;
    return mergeSettings(JSON.parse(raw));
  } catch {
    return defaults;
  }
}
