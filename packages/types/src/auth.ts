export interface OrphixUser {
  _id: string;
  name?: string;
  email?: string;
  image?: string;
  githubId?: string;
  githubUsername?: string;
  createdAt: number;
  updatedAt: number;
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
