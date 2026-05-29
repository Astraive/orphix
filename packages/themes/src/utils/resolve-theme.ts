import { getThemeById } from "../registry";

export function resolveTheme(themeId?: string) {
  return getThemeById(themeId ?? "orphix.dark");
}
