export const REDIS_KEYS = {
  // OAuth
  oauthState: (state: string) => `oauth:state:${state}`,

  // Presence
  presenceDesktop: (deviceId: string) => `presence:desktop:${deviceId}`,
  presenceMobile: (deviceId: string) => `presence:mobile:${deviceId}`,

  // Socket mappings
  deviceSocket: (deviceId: string) => `device:socket:${deviceId}`,
  socketDevice: (socketId: string) => `socket:device:${socketId}`,

  // Challenge
  challengeNonce: (socketId: string) => `challenge:nonce:${socketId}`,

  // Link sessions
  linkSession: (sessionId: string) => `link:session:${sessionId}`,
  linkApproval: (sessionId: string) => `link:approval:${sessionId}`,

  // WebRTC signaling
  signalOffer: (sessionId: string) => `signal:offer:${sessionId}`,
  signalAnswer: (sessionId: string) => `signal:answer:${sessionId}`,
  signalIce: (sessionId: string, id: string) => `signal:ice:${sessionId}:${id}`,

  // Pairing
  pairingCode: (code: string) => `pairing:code:${code}`,

  // Rate limiting
  rateLimit: (ip: string, endpoint: string) => `rate:${ip}:${endpoint}`,

  // Device public keys (cache)
  devicePublicKey: (deviceId: string) => `device:pubkey:${deviceId}`,
} as const;

export const REDIS_TTL = {
  oauthState: 300,          // 5 min
  presence: 60,             // 60s, refreshed by heartbeat
  challenge: 120,           // 2 min
  linkSession: 3600,        // 1 hour
  linkApproval: 300,        // 5 min
  signal: 120,              // 2 min
  pairingCode: 300,         // 5 min
  rateLimit: 60,            // 1 min
  devicePublicKey: 86400,   // 24h
} as const;
