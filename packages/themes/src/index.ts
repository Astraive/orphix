export type * from "./types";

export {
  registerThemeFamily,
  unregisterThemeFamily,
  getInstalledFamilies,
  listThemeFamilies,
  listThemeVariants,
  getThemeFamily,
  getThemeVariant,
  getThemeById,
  listColorThemes,
  listFontThemes,
  listIconThemes,
  listTerminalThemes,
  composeTheme,
} from "./registry";

export type { OrphixThemeFamilyId } from "./registry";

export { orphixTheme } from "./orphix";

export { createXtermTheme } from "./utils/create-xterm-theme";
export { createCssVars } from "./utils/create-css-vars";
export { createIconMap } from "./utils/create-icon-map";
export { resolveTheme } from "./utils/resolve-theme";
