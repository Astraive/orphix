export const JWT_CONFIG = {
  algorithm: "ES256" as const,
  accessTokenExpiry: "15m",
  refreshTokenExpiry: "30d",
  issuer: "orphix",
  audience: "orphix-api",
} as const;
