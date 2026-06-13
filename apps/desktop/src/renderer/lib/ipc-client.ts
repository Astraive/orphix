import type { OrphixAPI } from "../../shared/types/common";

declare global {
  interface Window {
    orphix: OrphixAPI;
  }
}

export async function invoke<T>(channel: string, args?: Record<string, unknown>): Promise<T> {
  return window.orphix.invoke<T>(channel, args);
}

export function listen<T>(channel: string, handler: (data: T) => void): () => void {
  return window.orphix.on(channel, (data: unknown) => handler(data as T));
}
