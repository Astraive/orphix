import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { eq, and, isNull, gt } from "drizzle-orm";
import * as crypto from "crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { DatabaseService } from "../database/database.service";
import { RedisService } from "../redis/redis.service";
import { GithubService } from "./github.service";
import { users, authAccounts, sessions, refreshTokens } from "@orphix/database";
import { REDIS_KEYS, REDIS_TTL } from "@orphix/config";
import type { AuthTokens } from "@orphix/types";
import { ALLOWED_REDIRECT_URIS } from "./auth.config";
import { encryptToken, decryptToken } from "./crypto.util";

interface OrphixJWTPayload extends JWTPayload {
  sub: string;
  sid: string;
  type: "access";
  iss: "orphix";
  aud: "orphix-api";
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly github: GithubService,
    private readonly config: ConfigService,
  ) {}

  private getJwtSecret(): string {
    const secret = this.config.get<string>("JWT_SECRET");
    if (!secret) {
      throw new UnauthorizedException("JWT_SECRET not configured");
    }
    if (process.env.NODE_ENV === "production" && secret.length < 32) {
      throw new UnauthorizedException("JWT_SECRET too short for production (min 32 chars)");
    }
    return secret;
  }

  async storeOAuthState(state: string, data: Record<string, string>): Promise<void> {
    await this.redis.set(REDIS_KEYS.oauthState(state), JSON.stringify(data), REDIS_TTL.oauthState);
  }

  async handleGithubCallback(code: string, state: string) {
    // 1. Validate state exists and not expired (Redis TTL handles expiry)
    const stateData = await this.redis.get(REDIS_KEYS.oauthState(state));
    if (!stateData) throw new UnauthorizedException("Invalid or expired OAuth state");

    // 2. Delete state immediately to prevent replay (one-time use)
    await this.redis.del(REDIS_KEYS.oauthState(state));

    const parsed = JSON.parse(stateData) as {
      codeVerifier: string;
      redirectUri: string;
      createdAt: string;
    };

    // 3. Validate redirect URI against allowlist (prevent open redirect)
    if (!ALLOWED_REDIRECT_URIS.includes(parsed.redirectUri)) {
      throw new BadRequestException("Invalid redirect URI");
    }

    // 4. Exchange code for GitHub token — send code_verifier (NOT code_challenge)
    //    code_verifier is the original random string stored in Redis
    //    code_challenge (sent to GitHub authorize URL) is SHA256(code_verifier)
    //    GitHub computes SHA256(code_verifier) and compares to code_challenge
    const githubToken = await this.github.exchangeCode(code, parsed.codeVerifier, parsed.redirectUri);

    // 5. Fetch GitHub user identity
    const githubUser = await this.github.getUser(githubToken);
    if (!githubUser.id) throw new UnauthorizedException("Failed to fetch GitHub user");

    // 6. Upsert user (GitHub ID is the stable identifier, not username)
    const [user] = await (this.db.db as any)
      .insert(users)
      .values({
        githubId: String(githubUser.id),
        githubUsername: githubUser.login,
        githubEmail: githubUser.email ?? null,
        displayName: githubUser.name ?? null,
        avatarUrl: githubUser.avatar_url ?? null,
      })
      .onConflictDoUpdate({
        target: users.githubId,
        set: {
          githubUsername: githubUser.login,
          githubEmail: githubUser.email ?? null,
          displayName: githubUser.name ?? null,
          avatarUrl: githubUser.avatar_url ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    // 7. Upsert auth account (link GitHub identity to Orphix user)
    await (this.db.db as any)
      .insert(authAccounts)
      .values({
        userId: user.id,
        provider: "github",
        providerUserId: String(githubUser.id),
        providerUsername: githubUser.login,
        providerEmail: githubUser.email ?? null,
        accessToken: encryptToken(githubToken),
      })
      .onConflictDoUpdate({
        target: [authAccounts.provider, authAccounts.providerUserId],
        set: {
          providerUsername: githubUser.login,
          providerEmail: githubUser.email ?? null,
          accessToken: encryptToken(githubToken),
        },
      });

    // 8. Create session
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const [session] = await (this.db.db as any)
      .insert(sessions)
      .values({ userId: user.id, clientType: "web", expiresAt })
      .returning();

    // 9. Create tokens
    const tokens = await this.createTokens(user.id, session.id);

    return { user, tokens, redirectUri: parsed.redirectUri };
  }

  async createTokens(userId: string, sessionId: string): Promise<AuthTokens> {
    const secret = new TextEncoder().encode(this.getJwtSecret());

    const accessToken = await new SignJWT({
      sub: userId,
      sid: sessionId,
      type: "access",
    } satisfies Partial<OrphixJWTPayload>)
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .setIssuer("orphix")
      .setAudience("orphix-api")
      .setExpirationTime("15m")
      .sign(secret);

    // Create refresh token (opaque, stored hashed)
    const refreshToken = `orx_rt_${crypto.randomBytes(32).toString("hex")}`;
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    await (this.db.db as any).insert(refreshTokens).values({
      userId,
      sessionId,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return { accessToken, refreshToken, expiresIn: 900 };
  }

  async verifyAccessToken(token: string): Promise<{ sub: string; sid: string }> {
    const secret = new TextEncoder().encode(this.getJwtSecret());

    let payload: OrphixJWTPayload;
    try {
      ({ payload } = await jwtVerify<OrphixJWTPayload>(token, secret, {
        issuer: "orphix",
        audience: "orphix-api",
      }));
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    // Check session is not revoked and not expired
    const [session] = await (this.db.db as any)
      .select({ revokedAt: sessions.revokedAt, expiresAt: sessions.expiresAt })
      .from(sessions)
      .where(eq(sessions.id, payload.sid))
      .limit(1);

    if (!session || session.revokedAt) {
      throw new UnauthorizedException("Session revoked");
    }
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      throw new UnauthorizedException("Session expired");
    }

    return { sub: payload.sub, sid: payload.sid };
  }

  async refreshTokens(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException("Missing refresh token");
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    // Use Redis lock to prevent race condition on rotation
    const lockKey = `refresh:lock:${tokenHash}`;
    const acquired = await this.redis.set(lockKey, "1", 5); // 5s lock
    if (!acquired) throw new UnauthorizedException("Refresh in progress");

    try {
      const [token] = await (this.db.db as any)
        .select()
        .from(refreshTokens)
        .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
        .limit(1);

      if (!token) throw new UnauthorizedException("Invalid refresh token");
      if (token.expiresAt < new Date()) throw new UnauthorizedException("Refresh token expired");

      // Check for token reuse (already rotated) — possible theft
      if (token.rotatedAt) {
        // Revoke entire session and all tokens
        await (this.db.db as any).update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, token.sessionId));
        await (this.db.db as any).update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.sessionId, token.sessionId));
        throw new UnauthorizedException("Refresh token reuse detected — session revoked");
      }

      // Rotate: mark old token as rotated (atomic)
      await (this.db.db as any).update(refreshTokens).set({ rotatedAt: new Date() }).where(eq(refreshTokens.id, token.id));
      await (this.db.db as any)
        .update(sessions)
        .set({ expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
        .where(eq(sessions.id, token.sessionId));

      // Create new tokens
      return this.createTokens(token.userId, token.sessionId);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  async logout(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException("Missing refresh token");
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const [token] = await (this.db.db as any)
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (token) {
      // Revoke all tokens and session
      await (this.db.db as any).update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.sessionId, token.sessionId));
      await (this.db.db as any).update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, token.sessionId));

      // Also invalidate any active link sessions for this user
      const [session] = await (this.db.db as any)
        .select({ userId: sessions.userId })
        .from(sessions)
        .where(eq(sessions.id, token.sessionId))
        .limit(1);

      if (session) {
        await this.redis.del(`presence:user:${session.userId}`);
      }
    }

    return { success: true };
  }
}
