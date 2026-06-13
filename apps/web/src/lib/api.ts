const CONTROL_URL = import.meta.env.VITE_CONTROL_URL ?? "http://localhost:2605";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${CONTROL_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${response.statusText}`);
  }
  return response;
}
