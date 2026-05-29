import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class GithubService {
  constructor(private readonly config: ConfigService) {}

  getAuthorizationUrl(state: string, codeChallenge: string, redirectUri: string): string {
    const clientId = this.config.get<string>("GITHUB_CLIENT_ID", "");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "read:user user:email",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string, codeVerifier: string, redirectUri: string): Promise<string> {
    const clientId = this.config.get<string>("GITHUB_CLIENT_ID", "");
    const clientSecret = this.config.get<string>("GITHUB_CLIENT_SECRET", "");

    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    const data = (await res.json()) as { access_token?: string; error?: string };
    if (!data.access_token) throw new Error(`GitHub token exchange failed: ${data.error}`);
    return data.access_token;
  }

  async getUser(token: string): Promise<{ id: number; login: string; email: string | null; name: string | null; avatar_url: string }> {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    return res.json() as Promise<{ id: number; login: string; email: string | null; name: string | null; avatar_url: string }>;
  }
}
