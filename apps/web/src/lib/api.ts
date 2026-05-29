import { CONTROL_URL } from "./env";

interface TokenResponse {
  accessToken?: string;
  refreshToken?: string;
}

function getAccessToken(): string | null {
  return localStorage.getItem("orphix_access_token");
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("orphix_refresh_token");
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${CONTROL_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as TokenResponse;
    if (!data.accessToken || !data.refreshToken) return null;
    localStorage.setItem("orphix_access_token", data.accessToken);
    localStorage.setItem("orphix_refresh_token", data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

function withAuthHeaders(options: RequestInit, token: string | null): RequestInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return { ...options, headers };
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getAccessToken();
  const res = await fetch(`${CONTROL_URL}${path}`, withAuthHeaders(options, token));
  if (res.status !== 401 || !localStorage.getItem("orphix_refresh_token")) {
    return res;
  }

  const refreshedToken = await refreshAccessToken();
  if (!refreshedToken) return res;
  return fetch(`${CONTROL_URL}${path}`, withAuthHeaders(options, refreshedToken));
}

export async function parseArrayResponse<T>(res: Response): Promise<T[]> {
  if (!res.ok) return [];
  try {
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object") {
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) return data[key];
      }
    }
    return [];
  } catch (e) {
    console.warn("[api] Failed to parse response:", e);
    return [];
  }
}
