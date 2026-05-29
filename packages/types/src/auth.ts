export interface OrphixUser {
  id: string;
  githubId: string;
  githubUsername: string;
  githubEmail: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  sid: string;
  type: "access" | "refresh";
  iat: number;
  exp: number;
}

export interface Session {
  id: string;
  userId: string;
  deviceId: string | null;
  clientType: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}
