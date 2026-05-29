/**
 * Hook to resolve icon names from the active theme's icon tokens.
 *
 * Usage:
 *   const icon = useIcon("core.terminal");  // returns "terminal" (or URL/path from theme)
 *   const icon = useIcon("panels.docker");  // returns "container" or a custom URL
 *
 * Icon paths follow the OrphixIconTokens structure:
 *   "core.app", "core.terminal", "panels.files", "agents.agent", "status.success", etc.
 */

import { useMemo } from "react";
import { useTheme } from "@/providers/ThemeProvider";

type IconTokens = Record<string, Record<string, string>>;
type IconCategory = string;

function resolveIconPath(tokens: IconTokens, path: string): string | undefined {
  const [category, key] = path.split(".") as [IconCategory, string];
  if (!category || !key) return undefined;

  const group = tokens[category];
  if (!group || typeof group !== "object") return undefined;

  return group[key];
}

export function useIcon(path: string): string {
  const { activeTheme } = useTheme();

  return useMemo(() => {
    const resolved = resolveIconPath(activeTheme.icons.icons as unknown as IconTokens, path);
    return resolved ?? path; // Fallback: treat the path itself as the icon name
  }, [activeTheme, path]);
}

/**
 * Get the icon metadata (sizes, stroke, style) from the active theme.
 */
export function useIconMeta() {
  const { activeTheme } = useTheme();
  return activeTheme.icons.icons.meta;
}
