export type DeviceType = "desktop" | "mobile" | "web";
export type DeviceStatus = "registered" | "trusted" | "revoked" | "blocked";
export type TrustLevel = "view_only" | "approve_only" | "full_control";

export interface Device {
  id: string;
  userId: string;
  deviceId: string;
  deviceType: DeviceType;
  deviceName: string;
  platform: string | null;
  appVersion: string | null;
  publicKey: string;
  status: DeviceStatus;
  createdAt: string;
  lastSeenAt: string | null;
}

export interface DeviceRegistration {
  deviceId: string;
  deviceType: DeviceType;
  deviceName: string;
  publicKey: string;
  platform?: string;
  appVersion?: string;
}

export interface TrustedDevice {
  id: string;
  userId: string;
  desktopDeviceId: string;
  mobileDeviceId: string;
  trustLevel: TrustLevel;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface DeviceProof {
  deviceId: string;
  nonce: string;
  timestamp: number;
  signature: string;
}
