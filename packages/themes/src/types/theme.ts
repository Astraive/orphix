import type { OrphixColorTheme } from "./colors";
import type { OrphixFontTheme } from "./fonts";
import type { OrphixIconTheme } from "./icons";
import type { OrphixTerminalTheme } from "./terminal";

export interface OrphixThemeVariant {
  id: string;
  themeId: string;
  variantId: string;
  name: string;
  colors: OrphixColorTheme;
  fonts: OrphixFontTheme;
  icons: OrphixIconTheme;
  terminal: OrphixTerminalTheme;
}

export interface OrphixThemeFamily {
  id: string;
  name: string;
  author: string;
  version: string;
  description?: string;
  defaultVariant: string;
  variants: Record<string, OrphixThemeVariant>;
}
