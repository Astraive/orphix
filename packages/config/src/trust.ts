export const TRUST_LEVELS = {
  VIEW_ONLY: "view_only",
  APPROVE_ONLY: "approve_only",
  FULL_CONTROL: "full_control",
} as const;

export const LINK_MODES = {
  VIEW_ONLY: "view_only",
  APPROVE_ONLY: "approve_only",
  FULL_CONTROL: "full_control",
} as const;

export const LINK_STATUS = {
  REQUESTED: "requested",
  APPROVED: "approved",
  REJECTED: "rejected",
  EXPIRED: "expired",
  ENDED: "ended",
} as const;

export const DEVICE_STATUS = {
  REGISTERED: "registered",
  TRUSTED: "trusted",
  REVOKED: "revoked",
  BLOCKED: "blocked",
} as const;

export const SESSION_CONFIG = {
  linkSessionDuration: 3600,      // 1 hour
  linkSessionMaxDuration: 86400,  // 24 hours
  maxActiveSessions: 5,
  pairingCodeLength: 6,
  challengeLength: 32,
} as const;

function requireEnvOrDev(name: string, devFallback: string): string {
  const val = process.env[name];
  if (!val) {
    if (process.env.NODE_ENV === "production") throw new Error(`${name} env var required in production`);
    return devFallback;
  }
  return val;
}

// Lazy getters — read env vars at runtime, not module load time.
// Each service sets its own .env which is loaded before these are accessed.
export const SERVICE_URLS = {
  get control() { return requireEnvOrDev("CONTROL_API_URL", "http://localhost:2605"); },
  get link() { return requireEnvOrDev("LINK_API_URL", "http://localhost:2606"); },
  get marketplace() { return requireEnvOrDev("MARKETPLACE_API_URL", "http://localhost:2607"); },
};
