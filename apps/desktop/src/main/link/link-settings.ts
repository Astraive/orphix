import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { DEFAULT_LINK_SETTINGS, type LinkSettings, type SecurityMode, type TransportMode } from "../../shared/types/link";

function settingsDir(): string {
  const dir = join(app.getPath("userData"), "link");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function settingsPath(): string {
  return join(settingsDir(), "link-settings.json");
}

function mergeSettings(raw: unknown): LinkSettings {
  const incoming = raw && typeof raw === "object" ? raw as Partial<LinkSettings> : {};
  return {
    ...DEFAULT_LINK_SETTINGS,
    ...incoming,
    transport: { ...DEFAULT_LINK_SETTINGS.transport, ...incoming.transport },
    encryption: { ...DEFAULT_LINK_SETTINGS.encryption, ...incoming.encryption },
    webrtc: {
      ...DEFAULT_LINK_SETTINGS.webrtc,
      ...incoming.webrtc,
      turn: {
        ...DEFAULT_LINK_SETTINGS.webrtc.turn,
        ...incoming.webrtc?.turn,
      },
    },
    websocket: { ...DEFAULT_LINK_SETTINGS.websocket, ...incoming.websocket },
  };
}

function sanitize(updates: Partial<LinkSettings>): Partial<LinkSettings> {
  const next: Partial<LinkSettings> = {};

  const mode = updates.transport?.mode;
  if (mode === "auto" || mode === "webrtc" || mode === "websocket" || mode === "local") {
    next.transport = { mode: mode as TransportMode };
  }

  if (updates.encryption) {
    const securityMode = updates.encryption.securityMode;
    next.encryption = {
      ...DEFAULT_LINK_SETTINGS.encryption,
      ...(typeof updates.encryption.e2ee === "boolean" ? { e2ee: updates.encryption.e2ee } : {}),
      ...(typeof updates.encryption.allowPlainRelay === "boolean" ? { allowPlainRelay: updates.encryption.allowPlainRelay } : {}),
      ...(securityMode === "E2EE_REQUIRED" || securityMode === "E2EE_PREFERRED" || securityMode === "DEV_PLAINTEXT_ALLOWED"
        ? { securityMode: securityMode as SecurityMode }
        : {}),
    };
    if (next.encryption.securityMode === "E2EE_REQUIRED") {
      next.encryption.e2ee = true;
      next.encryption.allowPlainRelay = false;
    }
  }

  if (updates.webrtc) {
    next.webrtc = {
      ...DEFAULT_LINK_SETTINGS.webrtc,
      ...(typeof updates.webrtc.enabled === "boolean" ? { enabled: updates.webrtc.enabled } : {}),
      ...(Array.isArray(updates.webrtc.stun) ? { stun: updates.webrtc.stun.filter((s): s is string => typeof s === "string") } : {}),
      turn: {
        enabled: typeof updates.webrtc.turn?.enabled === "boolean" ? updates.webrtc.turn.enabled : DEFAULT_LINK_SETTINGS.webrtc.turn.enabled,
        servers: Array.isArray(updates.webrtc.turn?.servers) ? updates.webrtc.turn.servers : DEFAULT_LINK_SETTINGS.webrtc.turn.servers,
      },
    };
  }

  if (updates.websocket) {
    next.websocket = {
      ...DEFAULT_LINK_SETTINGS.websocket,
      ...(typeof updates.websocket.relayEnabled === "boolean" ? { relayEnabled: updates.websocket.relayEnabled } : {}),
      ...(typeof updates.websocket.requireE2ee === "boolean" ? { requireE2ee: updates.websocket.requireE2ee } : {}),
    };
  }

  return next;
}

export function loadLinkSettings(): LinkSettings {
  try {
    const file = settingsPath();
    if (!existsSync(file)) return DEFAULT_LINK_SETTINGS;
    return mergeSettings(JSON.parse(readFileSync(file, "utf-8")));
  } catch {
    return DEFAULT_LINK_SETTINGS;
  }
}

export function saveLinkSettings(updates: Partial<LinkSettings>): LinkSettings {
  const next = mergeSettings({ ...loadLinkSettings(), ...sanitize(updates) });
  writeFileSync(settingsPath(), JSON.stringify(next, null, 2));
  return next;
}
