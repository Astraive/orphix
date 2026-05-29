import { Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { REDIS_KEYS } from "@orphix/config";
import { DEFAULT_LINK_SETTINGS, type LinkSettings, type TransportMode, type SecurityMode } from "@orphix/types";
import { DatabaseService } from "../database/database.service";
import { RedisService } from "../redis/redis.service";
import { users, devices } from "@orphix/database";

@Injectable()
export class UsersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async findById(id: string) {
    const [user] = await (this.db.db as any).select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async getUserDevices(userId: string) {
    const rows = await (this.db.db as any).select().from(devices).where(eq(devices.userId, userId));
    return Promise.all(
      rows.map(async (device: any) => {
        const key = device.deviceType === "mobile"
          ? REDIS_KEYS.presenceMobile(device.deviceId)
          : REDIS_KEYS.presenceDesktop(device.deviceId);
        const online = await this.redis.exists(key);
        return { ...device, online };
      }),
    );
  }

  private settingsKey(userId: string) {
    return `link:settings:${userId}`;
  }

  private defaultSettings: LinkSettings = DEFAULT_LINK_SETTINGS;

  private mergeSettings(raw: unknown): LinkSettings {
    const incoming = raw && typeof raw === "object" ? raw as Partial<LinkSettings> : {};
    return {
      ...this.defaultSettings,
      ...incoming,
      transport: { ...this.defaultSettings.transport, ...incoming.transport },
      encryption: { ...this.defaultSettings.encryption, ...incoming.encryption },
      webrtc: {
        ...this.defaultSettings.webrtc,
        ...incoming.webrtc,
        turn: {
          ...this.defaultSettings.webrtc.turn,
          ...incoming.webrtc?.turn,
        },
      },
      websocket: { ...this.defaultSettings.websocket, ...incoming.websocket },
    };
  }

  private sanitizeSettings(updates: Record<string, unknown>): Partial<LinkSettings> {
    const next: Partial<LinkSettings> = {};

    if (typeof updates.autoApprove === "boolean") next.autoApprove = updates.autoApprove;
    if (typeof updates.autoApproveSameUser === "boolean") next.autoApproveSameUser = updates.autoApproveSameUser;
    if (typeof updates.approvalTimeout === "number") {
      next.approvalTimeout = Math.max(5, Math.min(300, Math.floor(updates.approvalTimeout)));
    }

    const transport = updates.transport as Record<string, unknown> | undefined;
    const mode = transport?.mode;
    if (mode === "auto" || mode === "webrtc" || mode === "websocket" || mode === "local") {
      next.transport = { mode: mode as TransportMode };
    }

    const encryption = updates.encryption as Record<string, unknown> | undefined;
    if (encryption) {
      const securityMode = encryption.securityMode;
      next.encryption = {
        ...this.defaultSettings.encryption,
        ...(typeof encryption.e2ee === "boolean" ? { e2ee: encryption.e2ee } : {}),
        ...(typeof encryption.allowPlainRelay === "boolean" ? { allowPlainRelay: encryption.allowPlainRelay } : {}),
        ...(securityMode === "E2EE_REQUIRED" || securityMode === "E2EE_PREFERRED" || securityMode === "DEV_PLAINTEXT_ALLOWED"
          ? { securityMode: securityMode as SecurityMode }
          : {}),
      };
      if (next.encryption.securityMode === "E2EE_REQUIRED") {
        next.encryption.e2ee = true;
        next.encryption.allowPlainRelay = false;
      }
    }

    const webrtc = updates.webrtc as Record<string, unknown> | undefined;
    if (webrtc) {
      const turn = webrtc.turn as Record<string, unknown> | undefined;
      next.webrtc = {
        ...this.defaultSettings.webrtc,
        ...(typeof webrtc.enabled === "boolean" ? { enabled: webrtc.enabled } : {}),
        ...(Array.isArray(webrtc.stun) ? { stun: webrtc.stun.filter((s): s is string => typeof s === "string") } : {}),
        turn: {
          enabled: typeof turn?.enabled === "boolean" ? turn.enabled : this.defaultSettings.webrtc.turn.enabled,
          servers: Array.isArray(turn?.servers) ? turn.servers as any : this.defaultSettings.webrtc.turn.servers,
        },
      };
    }

    const websocket = updates.websocket as Record<string, unknown> | undefined;
    if (websocket) {
      next.websocket = {
        ...this.defaultSettings.websocket,
        ...(typeof websocket.relayEnabled === "boolean" ? { relayEnabled: websocket.relayEnabled } : {}),
        ...(typeof websocket.requireE2ee === "boolean" ? { requireE2ee: websocket.requireE2ee } : {}),
      };
    }

    return next;
  }

  async getLinkSettings(userId: string) {
    const raw = await this.redis.get(this.settingsKey(userId));
    if (!raw) return this.defaultSettings;
    try {
      return this.mergeSettings(JSON.parse(raw));
    } catch {
      return this.defaultSettings;
    }
  }

  async updateLinkSettings(userId: string, updates: Record<string, unknown>) {
    const current = await this.getLinkSettings(userId);
    const next = this.mergeSettings({ ...current, ...this.sanitizeSettings(updates) });
    await this.redis.set(this.settingsKey(userId), JSON.stringify(next));
    return next;
  }
}
