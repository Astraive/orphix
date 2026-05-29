import type React from "react";

export const Stack = null as unknown as React.FC<any> & {
  Screen: React.FC<any>;
};
export const Slot = null as unknown as React.FC<any>;

export function useRouter(): {
  push: (href: string | Record<string, unknown>) => void;
  replace: (href: string | Record<string, unknown>) => void;
  back: () => void;
  canGoBack: () => boolean;
} {
  return null as any;
}

export function useLocalSearchParams<T extends Record<string, unknown> = Record<string, string | string[]>>(): T {
  return null as any;
}
