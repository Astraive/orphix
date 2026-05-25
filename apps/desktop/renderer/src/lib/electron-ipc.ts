// Wrapper around window.orphix.* preload API
declare global {
  interface Window {
    orphix: {
      invoke: <T>(channel: string, args?: unknown) => Promise<T>;
      on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
      window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
        isMaximized: () => Promise<boolean>;
      };
    };
  }
}

export async function invoke<T>(channel: string, args?: unknown): Promise<T> {
  return window.orphix.invoke<T>(channel, args);
}

export function listen<T>(channel: string, handler: (data: T) => void): () => void {
  return window.orphix.on(channel, (data: unknown) => handler(data as T));
}
