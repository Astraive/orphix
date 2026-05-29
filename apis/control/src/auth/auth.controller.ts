import { Controller, Get, Post, Body, Query, Res, HttpException } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { AuthService } from "./auth.service";
import { GithubService } from "./github.service";
import { PkceService } from "./pkce.service";
import { ALLOWED_REDIRECT_URIS } from "./auth.config";
import { GithubAuthDto, GithubExchangeDto, RefreshTokenDto } from "./dto/auth.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly githubService: GithubService,
    private readonly pkceService: PkceService,
  ) {}

  @Post("github")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async initiateGithubAuth(@Body() dto: GithubAuthDto) {
    const { redirectUri } = dto;
    const { codeVerifier, codeChallenge } = this.pkceService.generate();
    const state = this.pkceService.generateState();

    // Validate redirect URI against allowlist
    const ghRedirect = process.env.GITHUB_REDIRECT_URI;
    if (!ghRedirect && process.env.NODE_ENV === "production") throw new HttpException("GITHUB_REDIRECT_URI env var required in production", 500);
    const finalRedirectUri = redirectUri ?? ghRedirect ?? "http://localhost:2605/auth/github/callback";
    if (!ALLOWED_REDIRECT_URIS.includes(finalRedirectUri)) {
      throw new HttpException("Invalid redirect URI", 400);
    }

    // Store code_verifier (NOT code_challenge) — needed for token exchange
    await this.authService.storeOAuthState(state, {
      codeVerifier,
      redirectUri: finalRedirectUri,
      createdAt: new Date().toISOString(),
    });

    const githubUrl = this.githubService.getAuthorizationUrl(state, codeChallenge, finalRedirectUri);

    // Don't return codeVerifier — server stores it in Redis for the token exchange
    return { state, githubUrl };
  }

  @Post("github/exchange")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async exchangeGithubCode(@Body() dto: GithubExchangeDto) {
    return this.authService.handleGithubCallback(dto.code, dto.state);
  }

  @Get("github/callback")
  async githubCallback(@Query("code") code: string, @Query("state") state: string, @Res() res: Response) {
    // Server-side callback: redirect to the SPA's callback route with code+state
    // so the SPA handles the exchange via POST /auth/github/exchange.
    // This avoids the code being used twice (once by server, once by SPA).
    const spaCallback = `${process.env.SPA_ORIGIN ?? "http://localhost:3000"}/auth/callback`;
    const redirectUrl = new URL(spaCallback);
    redirectUrl.searchParams.set("code", code);
    redirectUrl.searchParams.set("state", state);
    return res.redirect(redirectUrl.toString());
  }

  @Post("refresh")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    const token = dto.refresh_token ?? dto.refreshToken;
    if (!token) throw new HttpException("Missing refresh token", 400);
    return this.authService.refreshTokens(token);
  }

  @Post("logout")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async logout(@Body() dto: RefreshTokenDto) {
    const token = dto.refresh_token ?? dto.refreshToken;
    if (!token) throw new HttpException("Missing refresh token", 400);
    return this.authService.logout(token);
  }
}
