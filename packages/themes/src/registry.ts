import type { OrphixThemeFamily, OrphixThemeVariant } from "./types";

import { orphixTheme } from "./orphix";

/**
 * Built-in theme families — always available.
 */
const builtinFamilies: Record<string, OrphixThemeFamily> = {
  [orphixTheme.id]: orphixTheme,
};

/**
 * Externally installed themes — loaded at runtime from orphix-themes.
 */
const installedFamilies: Record<string, OrphixThemeFamily> = {};

export function registerThemeFamily(family: OrphixThemeFamily): void {
  installedFamilies[family.id] = family;
}

export function unregisterThemeFamily(familyId: string): void {
  delete installedFamilies[familyId];
}

export function getInstalledFamilies(): Record<string, OrphixThemeFamily> {
  return { ...installedFamilies };
}

/**
 * Merged view of builtin + installed families.
 */
export function themeFamilies(): Record<string, OrphixThemeFamily> {
  return { ...builtinFamilies, ...installedFamilies };
}

export type OrphixThemeFamilyId = string;

export function listThemeFamilies(): OrphixThemeFamily[] {
  return Object.values(themeFamilies());
}

export function listThemeVariants(): OrphixThemeVariant[] {
  return Object.values(themeFamilies()).flatMap((family) =>
    Object.values(family.variants),
  );
}

export function getThemeFamily(themeId: string): OrphixThemeFamily | undefined {
  return themeFamilies()[themeId];
}

export function getThemeVariant(
  themeId: string,
  variantId?: string,
): OrphixThemeVariant {
  const fallbackFamily = orphixTheme;
  const family = getThemeFamily(themeId) ?? fallbackFamily;

  const resolvedVariantId = variantId ?? family.defaultVariant;

  return (
    family.variants[resolvedVariantId] ??
    family.variants[family.defaultVariant] ??
    fallbackFamily.variants[fallbackFamily.defaultVariant]
  );
}

export function getThemeById(id: string): OrphixThemeVariant {
  const direct = listThemeVariants().find((theme) => theme.id === id);

  if (direct) return direct;

  const [themeId, variantId] = id.split(".");
  return getThemeVariant(themeId, variantId);
}

/**
 * Get unique color themes across all families (deduplicated by color ID).
 */
export function listColorThemes(): OrphixThemeVariant[] {
  const seen = new Set<string>();
  const result: OrphixThemeVariant[] = [];
  for (const variant of listThemeVariants()) {
    if (!seen.has(variant.colors.id)) {
      seen.add(variant.colors.id);
      result.push(variant);
    }
  }
  return result;
}

/**
 * Get unique font themes across all families.
 */
export function listFontThemes(): OrphixThemeVariant[] {
  const seen = new Set<string>();
  const result: OrphixThemeVariant[] = [];
  for (const variant of listThemeVariants()) {
    if (!seen.has(variant.fonts.id)) {
      seen.add(variant.fonts.id);
      result.push(variant);
    }
  }
  return result;
}

/**
 * Get unique icon themes across all families.
 */
export function listIconThemes(): OrphixThemeVariant[] {
  const seen = new Set<string>();
  const result: OrphixThemeVariant[] = [];
  for (const variant of listThemeVariants()) {
    if (!seen.has(variant.icons.id)) {
      seen.add(variant.icons.id);
      result.push(variant);
    }
  }
  return result;
}

/**
 * Get unique terminal themes across all families.
 */
export function listTerminalThemes(): OrphixThemeVariant[] {
  const seen = new Set<string>();
  const result: OrphixThemeVariant[] = [];
  for (const variant of listThemeVariants()) {
    if (!seen.has(variant.terminal.id)) {
      seen.add(variant.terminal.id);
      result.push(variant);
    }
  }
  return result;
}

/**
 * Compose a custom theme from independent color, font, icon, and terminal choices.
 * Falls back to the first available theme variant for any missing part.
 */
export function composeTheme(
  colorId: string,
  fontId: string,
  iconId: string,
  terminalId?: string,
): OrphixThemeVariant {
  const allVariants = listThemeVariants();
  const fallback = allVariants[0] ?? getThemeById("orphix.dark");

  // Find a variant whose colors/fonts/icons/terminal match the requested IDs
  const colorVariant = allVariants.find((v) => v.colors.id === colorId || v.id === colorId) ?? fallback;
  const fontVariant = allVariants.find((v) => v.fonts.id === fontId || v.id === fontId) ?? fallback;
  const iconVariant = allVariants.find((v) => v.icons.id === iconId || v.id === iconId) ?? fallback;
  const terminalVariant = terminalId
    ? allVariants.find((v) => v.terminal.id === terminalId || v.id === terminalId) ?? fallback
    : colorVariant;

  return {
    id: `custom.${colorId}.${fontId}.${iconId}`,
    themeId: "custom",
    variantId: "custom",
    name: "Custom Theme",
    colors: colorVariant.colors,
    fonts: fontVariant.fonts,
    icons: iconVariant.icons,
    terminal: terminalVariant.terminal ?? fallback.terminal,
  };
}
