# Orphix Themes Design Doc

## Goal

`packages/themes` is the single source of truth for Orphix visual identity.

It owns three theme domains:

```txt
colors
fonts
icons
```

A full Orphix theme is made by combining those three parts:

```txt
theme = colors + fonts + icons
```

The desktop app should not hardcode colors, font stacks, icon names, sizes, terminal colors, or agent colors. It should read them from the active theme.

This keeps Orphix themeable end-to-end: app shell, terminal, command palette, settings, agents, panels, and future extensions.

The earlier desktop structure already separates `renderer/themes`, `config`, `types`, and feature modules, so this package becomes the external theme source that desktop consumes. 

---

# Package location

Use this:

```txt
packages/
└── themes/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts
        ├── registry.ts
        ├── types/
        │   ├── index.ts
        │   ├── colors.ts
        │   ├── fonts.ts
        │   ├── icons.ts
        │   └── theme.ts
        │
        ├── orphix/
        │   ├── index.ts
        │   ├── theme.ts
        │   ├── colors/
        │   │   ├── dark.ts
        │   │   ├── light.ts
        │   │   ├── monochrome-dark.ts
        │   │   └── monochrome-light.ts
        │   ├── fonts/
        │   │   ├── default.ts
        │   │   ├── compact.ts
        │   │   └── mono.ts
        │   └── icons/
        │       ├── default.ts
        │       ├── minimal.ts
        │       └── rounded.ts
        │
        └── utils/
            ├── resolve-theme.ts
            ├── create-css-vars.ts
            ├── create-xterm-theme.ts
            └── create-icon-map.ts
```

Package name:

```json
{
  "name": "@orphix/themes"
}
```

---

# High-level model

There are four main concepts.

```txt
ColorTheme
FontTheme
IconTheme
ThemeVariant
```

A `ThemeVariant` combines one color variant, one font variant, and one icon variant.

Example:

```ts
{
  id: "orphix.dark",
  themeId: "orphix",
  variantId: "dark",
  colors: orphixDarkColors,
  fonts: orphixDefaultFonts,
  icons: orphixDefaultIcons
}
```

A `ThemeFamily` groups variants.

Example:

```txt
orphix
├── dark
├── light
├── monochrome-dark
└── monochrome-light
```

So the user-facing theme ID can be:

```txt
orphix.dark
orphix.light
orphix.monochrome-dark
orphix.monochrome-light
```

---

# No-hardcoded policy

No UI code should do this:

```ts
color: "#32E0C4"
fontFamily: "JetBrains Mono"
icon: "terminal"
background: "#050D10"
```

Instead, UI code should use theme tokens:

```ts
theme.colors.brand.primary
theme.fonts.fonts.families.terminal.family
theme.icons.icons.core.terminal
theme.colors.base.background
```

Or via CSS variables generated from the active theme:

```css
.terminal-pane {
  background: var(--orphix-color-base-background);
  color: var(--orphix-color-text-text);
  font-family: var(--orphix-font-terminal-family);
}
```

Hardcoding is only allowed inside theme package files like:

```txt
packages/themes/src/orphix/colors/dark.ts
packages/themes/src/orphix/fonts/default.ts
packages/themes/src/orphix/icons/default.ts
```

Everywhere else consumes the theme.

---

# Runtime flow

The desktop app should load themes like this:

```txt
apps/desktop renderer
        ↓
ThemeProvider
        ↓
@orphix/themes getThemeById("orphix.dark")
        ↓
resolved ThemeVariant
        ↓
apply CSS variables
        ↓
xterm receives terminal colors
        ↓
icons resolve from icon theme
        ↓
UI renders with theme tokens
```

Example flow:

```ts
import { getThemeById, createCssVars, createXtermTheme } from "@orphix/themes";

const theme = getThemeById("orphix.dark");

const cssVars = createCssVars(theme);
const xtermTheme = createXtermTheme(theme);
```

Desktop owns applying the theme. The package owns defining and resolving the theme.

---

# Type files

## `packages/themes/src/types/colors.ts`

```ts
export type OrphixColorMode = "dark" | "light";

export type OrphixColorAppearance =
  | "dark"
  | "light"
  | "monochrome"
  | "high-contrast";

export type OrphixColorValue = string;

export interface OrphixBaseColors {
  /**
   * Root app background.
   */
  background: OrphixColorValue;

  /**
   * Main foreground color.
   */
  foreground: OrphixColorValue;

  /**
   * Default panel/card surface.
   */
  surface: OrphixColorValue;

  /**
   * Muted secondary surface.
   */
  surfaceMuted: OrphixColorValue;

  /**
   * Raised surfaces: popovers, command palette, menus.
   */
  surfaceElevated: OrphixColorValue;

  /**
   * Deepest surface: terminal/editor background.
   */
  surfaceDeep: OrphixColorValue;

  /**
   * Hovered surface.
   */
  surfaceHover: OrphixColorValue;

  /**
   * Active/pressed selected surface.
   */
  surfaceActive: OrphixColorValue;

  /**
   * Standard border and separators.
   */
  border: OrphixColorValue;

  /**
   * Subtle border.
   */
  borderMuted: OrphixColorValue;

  /**
   * Strong border for selected/focused elements.
   */
  borderStrong: OrphixColorValue;

  /**
   * Modal/backdrop overlay.
   */
  overlay: OrphixColorValue;

  /**
   * Focus ring.
   */
  ring: OrphixColorValue;
}

export interface OrphixTextColors {
  text: OrphixColorValue;
  textMuted: OrphixColorValue;
  textSubtle: OrphixColorValue;
  textDisabled: OrphixColorValue;
  textInverse: OrphixColorValue;
  textAccent: OrphixColorValue;
}

export interface OrphixBrandColors {
  primary: OrphixColorValue;
  primaryForeground: OrphixColorValue;

  secondary: OrphixColorValue;
  secondaryForeground: OrphixColorValue;

  accent: OrphixColorValue;
  accentForeground: OrphixColorValue;
}

export interface OrphixStatusColors {
  success: OrphixColorValue;
  successForeground: OrphixColorValue;

  warning: OrphixColorValue;
  warningForeground: OrphixColorValue;

  danger: OrphixColorValue;
  dangerForeground: OrphixColorValue;

  info: OrphixColorValue;
  infoForeground: OrphixColorValue;
}

export interface OrphixAgentColors {
  agentRunning: OrphixColorValue;
  agentIdle: OrphixColorValue;
  agentError: OrphixColorValue;
  agentPaused: OrphixColorValue;
}

export interface OrphixTerminalColors {
  background: OrphixColorValue;
  foreground: OrphixColorValue;

  cursor: OrphixColorValue;
  cursorAccent: OrphixColorValue;

  selectionBackground: OrphixColorValue;
  selectionForeground?: OrphixColorValue;

  black: OrphixColorValue;
  red: OrphixColorValue;
  green: OrphixColorValue;
  yellow: OrphixColorValue;
  blue: OrphixColorValue;
  magenta: OrphixColorValue;
  cyan: OrphixColorValue;
  white: OrphixColorValue;

  brightBlack: OrphixColorValue;
  brightRed: OrphixColorValue;
  brightGreen: OrphixColorValue;
  brightYellow: OrphixColorValue;
  brightBlue: OrphixColorValue;
  brightMagenta: OrphixColorValue;
  brightCyan: OrphixColorValue;
  brightWhite: OrphixColorValue;
}

export interface OrphixSyntaxColors {
  keyword: OrphixColorValue;
  string: OrphixColorValue;
  number: OrphixColorValue;
  boolean: OrphixColorValue;
  comment: OrphixColorValue;
  function: OrphixColorValue;
  variable: OrphixColorValue;
  type: OrphixColorValue;
  className: OrphixColorValue;
  constant: OrphixColorValue;
  operator: OrphixColorValue;
  punctuation: OrphixColorValue;
  property: OrphixColorValue;
  tag: OrphixColorValue;
  attribute: OrphixColorValue;
}

export interface OrphixColorTokens {
  base: OrphixBaseColors;
  text: OrphixTextColors;
  brand: OrphixBrandColors;
  status: OrphixStatusColors;
  agents: OrphixAgentColors;
  terminal: OrphixTerminalColors;
  syntax: OrphixSyntaxColors;
}

export interface OrphixColorTheme {
  id: string;
  themeId: string;
  variantId: string;

  name: string;
  mode: OrphixColorMode;
  appearance: OrphixColorAppearance;

  colors: OrphixColorTokens;
}
```

---

## `packages/themes/src/types/fonts.ts`

```ts
export type OrphixFontRole =
  | "sans"
  | "mono"
  | "serif"
  | "display"
  | "ui"
  | "body"
  | "heading"
  | "caption"
  | "label"
  | "code"
  | "terminal"
  | "command"
  | "status";

export type OrphixFontValue = string;

export interface OrphixFontFace {
  /**
   * Primary font family.
   */
  family: OrphixFontValue;

  /**
   * Fallback fonts.
   */
  fallback: OrphixFontValue[];

  /**
   * Default font weight for this role.
   */
  weight?: number | string;

  /**
   * Default line height.
   */
  lineHeight?: string;

  /**
   * Default letter spacing.
   */
  letterSpacing?: string;

  /**
   * CSS font-feature-settings.
   */
  fontFeatureSettings?: string;

  /**
   * CSS font-variation-settings.
   */
  fontVariationSettings?: string;
}

export interface OrphixFontFamilies {
  /**
   * General sans font.
   */
  sans: OrphixFontFace;

  /**
   * General monospace font.
   */
  mono: OrphixFontFace;

  /**
   * Optional serif font.
   */
  serif?: OrphixFontFace;

  /**
   * Logo, hero, large titles.
   */
  display: OrphixFontFace;

  /**
   * App shell, buttons, tabs, sidebar, command palette.
   */
  ui: OrphixFontFace;

  /**
   * Normal body/content text.
   */
  body: OrphixFontFace;

  /**
   * Headings in settings, panels, modals.
   */
  heading: OrphixFontFace;

  /**
   * Small muted text.
   */
  caption: OrphixFontFace;

  /**
   * Form labels, badges, small status labels.
   */
  label: OrphixFontFace;

  /**
   * Inline code, code blocks, commands.
   */
  code: OrphixFontFace;

  /**
   * Actual terminal/xterm.js font.
   */
  terminal: OrphixFontFace;

  /**
   * Command palette command text.
   */
  command: OrphixFontFace;

  /**
   * Status bar and tiny metadata.
   */
  status: OrphixFontFace;
}

export interface OrphixFontSizes {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
  "3xl": string;
  "4xl": string;
  "5xl": string;

  ui: string;
  body: string;
  heading: string;
  caption: string;
  label: string;
  code: string;
  terminal: string;
  command: string;
  status: string;
}

export interface OrphixFontWeights {
  thin?: number;
  extralight?: number;
  light: number;
  regular: number;
  medium: number;
  semibold: number;
  bold: number;
  extrabold?: number;
  black?: number;
}

export interface OrphixLineHeights {
  tight: string;
  snug: string;
  normal: string;
  relaxed: string;
  loose: string;

  ui: string;
  body: string;
  heading: string;
  code: string;
  terminal: string;
  command: string;
  status: string;
}

export interface OrphixLetterSpacing {
  tighter: string;
  tight: string;
  normal: string;
  wide: string;
  wider: string;

  ui: string;
  heading: string;
  code: string;
  terminal: string;
  command: string;
  status: string;
}

export interface OrphixFontTokens {
  families: OrphixFontFamilies;
  sizes: OrphixFontSizes;
  weights: OrphixFontWeights;
  lineHeights: OrphixLineHeights;
  letterSpacing: OrphixLetterSpacing;
}

export interface OrphixFontTheme {
  id: string;
  themeId: string;
  variantId: string;

  name: string;

  fonts: OrphixFontTokens;
}
```

---

## `packages/themes/src/types/icons.ts`

```ts
export type OrphixIconName = string;

export type OrphixIconStyle =
  | "default"
  | "minimal"
  | "rounded"
  | "sharp"
  | "duotone"
  | "filled"
  | "outline";

export type OrphixIconSize =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl";

export interface OrphixIconSizing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface OrphixIconStroke {
  thin: number;
  regular: number;
  medium: number;
  bold: number;
}

export interface OrphixIconMetadata {
  style: OrphixIconStyle;
  defaultSize: OrphixIconSize;
  sizes: OrphixIconSizing;
  stroke: OrphixIconStroke;
  radius?: string;
}

export interface OrphixCoreIcons {
  app: OrphixIconName;
  terminal: OrphixIconName;
  command: OrphixIconName;
  settings: OrphixIconName;
  search: OrphixIconName;
  close: OrphixIconName;
  add: OrphixIconName;
  remove: OrphixIconName;
  split: OrphixIconName;
  splitHorizontal: OrphixIconName;
  splitVertical: OrphixIconName;
  maximize: OrphixIconName;
  minimize: OrphixIconName;
  restore: OrphixIconName;
  refresh: OrphixIconName;
  more: OrphixIconName;
  chevronRight: OrphixIconName;
  chevronDown: OrphixIconName;
  externalLink: OrphixIconName;
  copy: OrphixIconName;
  check: OrphixIconName;
}

export interface OrphixPanelIcons {
  workspace: OrphixIconName;
  files: OrphixIconName;
  agents: OrphixIconName;
  extensions: OrphixIconName;
  settings: OrphixIconName;
  terminal: OrphixIconName;
  search: OrphixIconName;
}

export interface OrphixFileIcons {
  file: OrphixIconName;
  folder: OrphixIconName;
  folderOpen: OrphixIconName;

  typescript: OrphixIconName;
  javascript: OrphixIconName;
  react: OrphixIconName;
  rust: OrphixIconName;
  python: OrphixIconName;
  go: OrphixIconName;
  json: OrphixIconName;
  markdown: OrphixIconName;
  css: OrphixIconName;
  html: OrphixIconName;
  image: OrphixIconName;
  lock: OrphixIconName;
  config: OrphixIconName;
  package: OrphixIconName;
  docker: OrphixIconName;
  git: OrphixIconName;
  unknown: OrphixIconName;
}

export interface OrphixAgentIcons {
  agent: OrphixIconName;
  agentRunning: OrphixIconName;
  agentIdle: OrphixIconName;
  agentError: OrphixIconName;
  agentPaused: OrphixIconName;
}

export interface OrphixStatusIcons {
  success: OrphixIconName;
  warning: OrphixIconName;
  danger: OrphixIconName;
  info: OrphixIconName;
  loading: OrphixIconName;
}

export interface OrphixIconTokens {
  meta: OrphixIconMetadata;
  core: OrphixCoreIcons;
  panels: OrphixPanelIcons;
  files: OrphixFileIcons;
  agents: OrphixAgentIcons;
  status: OrphixStatusIcons;
}

export interface OrphixIconTheme {
  id: string;
  themeId: string;
  variantId: string;

  name: string;

  icons: OrphixIconTokens;
}
```

---

## `packages/themes/src/types/theme.ts`

```ts
import type { OrphixColorTheme } from "./colors";
import type { OrphixFontTheme } from "./fonts";
import type { OrphixIconTheme } from "./icons";

export interface OrphixThemeVariant {
  /**
   * Globally unique theme variant ID.
   * Example: "orphix.dark"
   */
  id: string;

  /**
   * Parent theme family.
   * Example: "orphix"
   */
  themeId: string;

  /**
   * Variant inside the family.
   * Example: "dark"
   */
  variantId: string;

  name: string;

  colors: OrphixColorTheme;
  fonts: OrphixFontTheme;
  icons: OrphixIconTheme;
}

export interface OrphixThemeFamily {
  id: string;
  name: string;
  author: string;
  version: string;
  description?: string;

  /**
   * Default variant used when no variant is selected.
   */
  defaultVariant: string;

  variants: Record<string, OrphixThemeVariant>;
}
```

---

## `packages/themes/src/types/index.ts`

```ts
export type {
  OrphixColorMode,
  OrphixColorAppearance,
  OrphixColorValue,
  OrphixBaseColors,
  OrphixTextColors,
  OrphixBrandColors,
  OrphixStatusColors,
  OrphixAgentColors,
  OrphixTerminalColors,
  OrphixSyntaxColors,
  OrphixColorTokens,
  OrphixColorTheme,
} from "./colors";

export type {
  OrphixFontRole,
  OrphixFontValue,
  OrphixFontFace,
  OrphixFontFamilies,
  OrphixFontSizes,
  OrphixFontWeights,
  OrphixLineHeights,
  OrphixLetterSpacing,
  OrphixFontTokens,
  OrphixFontTheme,
} from "./fonts";

export type {
  OrphixIconName,
  OrphixIconStyle,
  OrphixIconSize,
  OrphixIconSizing,
  OrphixIconStroke,
  OrphixIconMetadata,
  OrphixCoreIcons,
  OrphixPanelIcons,
  OrphixFileIcons,
  OrphixAgentIcons,
  OrphixStatusIcons,
  OrphixIconTokens,
  OrphixIconTheme,
} from "./icons";

export type {
  OrphixThemeVariant,
  OrphixThemeFamily,
} from "./theme";
```

---

# Example implementation

## `packages/themes/src/orphix/colors/dark.ts`

```ts
import type { OrphixColorTheme } from "../../types";

export const orphixDarkColors: OrphixColorTheme = {
  id: "orphix.dark.colors",
  themeId: "orphix",
  variantId: "dark",

  name: "Orphix Dark Colors",
  mode: "dark",
  appearance: "dark",

  colors: {
    base: {
      background: "#050D10",
      foreground: "#EEEEEE",

      surface: "#071418",
      surfaceMuted: "#091A1F",
      surfaceElevated: "#0A1D22",
      surfaceDeep: "#020708",
      surfaceHover: "#0D2026",
      surfaceActive: "#102B31",

      border: "#123238",
      borderMuted: "#0C252B",
      borderStrong: "#1D5962",

      overlay: "rgba(0, 0, 0, 0.58)",
      ring: "#32E0C4",
    },

    text: {
      text: "#EEEEEE",
      textMuted: "#8FA3A8",
      textSubtle: "#5F777C",
      textDisabled: "#3D555A",
      textInverse: "#031113",
      textAccent: "#32E0C4",
    },

    brand: {
      primary: "#32E0C4",
      primaryForeground: "#031113",

      secondary: "#0D7377",
      secondaryForeground: "#FFFFFF",

      accent: "#00D9F5",
      accentForeground: "#031113",
    },

    status: {
      success: "#32E0C4",
      successForeground: "#031113",

      warning: "#FFC857",
      warningForeground: "#1F1600",

      danger: "#FF5C7A",
      dangerForeground: "#FFFFFF",

      info: "#00D9F5",
      infoForeground: "#031113",
    },

    agents: {
      agentRunning: "#32E0C4",
      agentIdle: "#8FA3A8",
      agentError: "#FF5C7A",
      agentPaused: "#FFC857",
    },

    terminal: {
      background: "#050D10",
      foreground: "#EEEEEE",

      cursor: "#32E0C4",
      cursorAccent: "#050D10",

      selectionBackground: "#0D7377",
      selectionForeground: "#FFFFFF",

      black: "#050D10",
      red: "#FF5C7A",
      green: "#32E0C4",
      yellow: "#FFC857",
      blue: "#00D9F5",
      magenta: "#B18CFF",
      cyan: "#0D7377",
      white: "#EEEEEE",

      brightBlack: "#385A60",
      brightRed: "#FF7A92",
      brightGreen: "#5EF5DD",
      brightYellow: "#FFD978",
      brightBlue: "#45E6FF",
      brightMagenta: "#C9A8FF",
      brightCyan: "#20A4AA",
      brightWhite: "#FFFFFF",
    },

    syntax: {
      keyword: "#00D9F5",
      string: "#32E0C4",
      number: "#FFC857",
      boolean: "#FFC857",
      comment: "#5F777C",
      function: "#EEEEEE",
      variable: "#8FA3A8",
      type: "#20A4AA",
      className: "#32E0C4",
      constant: "#B18CFF",
      operator: "#00D9F5",
      punctuation: "#8FA3A8",
      property: "#EEEEEE",
      tag: "#00D9F5",
      attribute: "#32E0C4",
    },
  },
};
```

---

## `packages/themes/src/orphix/fonts/default.ts`

```ts
import type { OrphixFontTheme } from "../../types";

export const orphixDefaultFonts: OrphixFontTheme = {
  id: "orphix.default.fonts",
  themeId: "orphix",
  variantId: "default",

  name: "Orphix Default Fonts",

  fonts: {
    families: {
      sans: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        lineHeight: "1.5",
      },

      mono: {
        family: "JetBrains Mono",
        fallback: ["Cascadia Code", "Fira Code", "ui-monospace", "monospace"],
        lineHeight: "1.45",
        fontFeatureSettings: '"liga" 1, "calt" 1',
      },

      display: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        weight: 700,
        lineHeight: "1.1",
        letterSpacing: "-0.035em",
      },

      ui: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        lineHeight: "1.4",
        letterSpacing: "-0.01em",
      },

      body: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        lineHeight: "1.55",
      },

      heading: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        weight: 650,
        lineHeight: "1.2",
        letterSpacing: "-0.025em",
      },

      caption: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        lineHeight: "1.35",
        letterSpacing: "-0.005em",
      },

      label: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        weight: 500,
        lineHeight: "1.25",
        letterSpacing: "-0.005em",
      },

      code: {
        family: "JetBrains Mono",
        fallback: ["Cascadia Code", "Fira Code", "ui-monospace", "monospace"],
        lineHeight: "1.45",
        fontFeatureSettings: '"liga" 1, "calt" 1',
      },

      terminal: {
        family: "JetBrains Mono",
        fallback: ["Cascadia Code", "Fira Code", "Consolas", "monospace"],
        lineHeight: "1.25",
        fontFeatureSettings: '"liga" 1, "calt" 1',
      },

      command: {
        family: "JetBrains Mono",
        fallback: ["Cascadia Code", "Fira Code", "ui-monospace", "monospace"],
        lineHeight: "1.35",
      },

      status: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        lineHeight: "1.2",
        letterSpacing: "-0.005em",
      },
    },

    sizes: {
      xs: "11px",
      sm: "12px",
      md: "14px",
      lg: "16px",
      xl: "18px",
      "2xl": "22px",
      "3xl": "28px",
      "4xl": "36px",
      "5xl": "48px",

      ui: "13px",
      body: "14px",
      heading: "16px",
      caption: "12px",
      label: "12px",
      code: "13px",
      terminal: "14px",
      command: "13px",
      status: "12px",
    },

    weights: {
      thin: 100,
      extralight: 200,
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900,
    },

    lineHeights: {
      tight: "1.1",
      snug: "1.25",
      normal: "1.5",
      relaxed: "1.65",
      loose: "1.8",

      ui: "1.4",
      body: "1.55",
      heading: "1.2",
      code: "1.45",
      terminal: "1.25",
      command: "1.35",
      status: "1.2",
    },

    letterSpacing: {
      tighter: "-0.04em",
      tight: "-0.025em",
      normal: "0em",
      wide: "0.025em",
      wider: "0.05em",

      ui: "-0.01em",
      heading: "-0.025em",
      code: "0em",
      terminal: "0em",
      command: "0em",
      status: "-0.005em",
    },
  },
};
```

---

## `packages/themes/src/orphix/icons/default.ts`

```ts
import type { OrphixIconTheme } from "../../types";

export const orphixDefaultIcons: OrphixIconTheme = {
  id: "orphix.default.icons",
  themeId: "orphix",
  variantId: "default",

  name: "Orphix Default Icons",

  icons: {
    meta: {
      style: "outline",
      defaultSize: "md",
      sizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 20,
        xl: 24,
      },
      stroke: {
        thin: 1,
        regular: 1.5,
        medium: 2,
        bold: 2.5,
      },
      radius: "round",
    },

    core: {
      app: "orb",
      terminal: "terminal",
      command: "command",
      settings: "settings",
      search: "search",
      close: "x",
      add: "plus",
      remove: "minus",
      split: "split-square-horizontal",
      splitHorizontal: "split-square-horizontal",
      splitVertical: "split-square-vertical",
      maximize: "maximize",
      minimize: "minimize",
      restore: "panel-top",
      refresh: "refresh-cw",
      more: "ellipsis",
      chevronRight: "chevron-right",
      chevronDown: "chevron-down",
      externalLink: "external-link",
      copy: "copy",
      check: "check",
    },

    panels: {
      workspace: "folder-kanban",
      files: "files",
      agents: "bot",
      extensions: "blocks",
      settings: "settings",
      terminal: "terminal",
      search: "search",
    },

    files: {
      file: "file",
      folder: "folder",
      folderOpen: "folder-open",

      typescript: "file-type",
      javascript: "file-code",
      react: "atom",
      rust: "settings-2",
      python: "file-code",
      go: "file-code",
      json: "braces",
      markdown: "file-text",
      css: "palette",
      html: "code-xml",
      image: "image",
      lock: "lock",
      config: "settings-2",
      package: "package",
      docker: "container",
      git: "git-branch",
      unknown: "file-question",
    },

    agents: {
      agent: "bot",
      agentRunning: "circle-play",
      agentIdle: "circle",
      agentError: "circle-alert",
      agentPaused: "circle-pause",
    },

    status: {
      success: "circle-check",
      warning: "triangle-alert",
      danger: "circle-x",
      info: "info",
      loading: "loader-circle",
    },
  },
};
```

---

# Theme composition

## `packages/themes/src/orphix/theme.ts`

```ts
import type { OrphixThemeFamily } from "../types";

import { orphixDarkColors } from "./colors/dark";
import { orphixDefaultFonts } from "./fonts/default";
import { orphixDefaultIcons } from "./icons/default";

export const orphixTheme: OrphixThemeFamily = {
  id: "orphix",
  name: "Orphix",
  author: "Orphix",
  version: "0.1.0",
  description: "Official Orphix theme family.",
  defaultVariant: "dark",

  variants: {
    dark: {
      id: "orphix.dark",
      themeId: "orphix",
      variantId: "dark",
      name: "Orphix Dark",

      colors: orphixDarkColors,
      fonts: orphixDefaultFonts,
      icons: orphixDefaultIcons,
    },
  },
};
```

## `packages/themes/src/orphix/index.ts`

```ts
export { orphixTheme } from "./theme";

export { orphixDarkColors } from "./colors/dark";
export { orphixDefaultFonts } from "./fonts/default";
export { orphixDefaultIcons } from "./icons/default";
```

---

# Registry

## `packages/themes/src/registry.ts`

```ts
import type { OrphixThemeFamily, OrphixThemeVariant } from "./types";

import { orphixTheme } from "./orphix";

export const themeFamilies = {
  [orphixTheme.id]: orphixTheme,
} as const satisfies Record<string, OrphixThemeFamily>;

export type OrphixThemeFamilyId = keyof typeof themeFamilies;

export function listThemeFamilies(): OrphixThemeFamily[] {
  return Object.values(themeFamilies);
}

export function listThemeVariants(): OrphixThemeVariant[] {
  return Object.values(themeFamilies).flatMap((family) =>
    Object.values(family.variants),
  );
}

export function getThemeFamily(themeId: string): OrphixThemeFamily | undefined {
  return themeFamilies[themeId as OrphixThemeFamilyId];
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
```

---

# Package exports

## `packages/themes/src/index.ts`

```ts
export type * from "./types";

export {
  themeFamilies,
  listThemeFamilies,
  listThemeVariants,
  getThemeFamily,
  getThemeVariant,
  getThemeById,
} from "./registry";

export type { OrphixThemeFamilyId } from "./registry";

export { orphixTheme } from "./orphix";
```

---

# Utility functions

## `packages/themes/src/utils/create-xterm-theme.ts`

```ts
import type { OrphixThemeVariant } from "../types";

export function createXtermTheme(theme: OrphixThemeVariant) {
  const terminal = theme.colors.colors.terminal;

  return {
    background: terminal.background,
    foreground: terminal.foreground,

    cursor: terminal.cursor,
    cursorAccent: terminal.cursorAccent,

    selectionBackground: terminal.selectionBackground,
    selectionForeground: terminal.selectionForeground,

    black: terminal.black,
    red: terminal.red,
    green: terminal.green,
    yellow: terminal.yellow,
    blue: terminal.blue,
    magenta: terminal.magenta,
    cyan: terminal.cyan,
    white: terminal.white,

    brightBlack: terminal.brightBlack,
    brightRed: terminal.brightRed,
    brightGreen: terminal.brightGreen,
    brightYellow: terminal.brightYellow,
    brightBlue: terminal.brightBlue,
    brightMagenta: terminal.brightMagenta,
    brightCyan: terminal.brightCyan,
    brightWhite: terminal.brightWhite,
  };
}
```

## `packages/themes/src/utils/create-css-vars.ts`

```ts
import type { OrphixThemeVariant } from "../types";

export function createCssVars(theme: OrphixThemeVariant): Record<string, string> {
  const color = theme.colors.colors;
  const font = theme.fonts.fonts;
  const icon = theme.icons.icons;

  return {
    "--orphix-color-base-background": color.base.background,
    "--orphix-color-base-foreground": color.base.foreground,
    "--orphix-color-base-surface": color.base.surface,
    "--orphix-color-base-surface-muted": color.base.surfaceMuted,
    "--orphix-color-base-surface-elevated": color.base.surfaceElevated,
    "--orphix-color-base-surface-deep": color.base.surfaceDeep,
    "--orphix-color-base-surface-hover": color.base.surfaceHover,
    "--orphix-color-base-surface-active": color.base.surfaceActive,
    "--orphix-color-base-border": color.base.border,
    "--orphix-color-base-border-muted": color.base.borderMuted,
    "--orphix-color-base-border-strong": color.base.borderStrong,
    "--orphix-color-base-overlay": color.base.overlay,
    "--orphix-color-base-ring": color.base.ring,

    "--orphix-color-text": color.text.text,
    "--orphix-color-text-muted": color.text.textMuted,
    "--orphix-color-text-subtle": color.text.textSubtle,
    "--orphix-color-text-disabled": color.text.textDisabled,
    "--orphix-color-text-inverse": color.text.textInverse,
    "--orphix-color-text-accent": color.text.textAccent,

    "--orphix-color-primary": color.brand.primary,
    "--orphix-color-primary-foreground": color.brand.primaryForeground,
    "--orphix-color-secondary": color.brand.secondary,
    "--orphix-color-secondary-foreground": color.brand.secondaryForeground,
    "--orphix-color-accent": color.brand.accent,
    "--orphix-color-accent-foreground": color.brand.accentForeground,

    "--orphix-color-success": color.status.success,
    "--orphix-color-warning": color.status.warning,
    "--orphix-color-danger": color.status.danger,
    "--orphix-color-info": color.status.info,

    "--orphix-color-agent-running": color.agents.agentRunning,
    "--orphix-color-agent-idle": color.agents.agentIdle,
    "--orphix-color-agent-error": color.agents.agentError,
    "--orphix-color-agent-paused": color.agents.agentPaused,

    "--orphix-font-sans": createFontStack(font.families.sans.family, font.families.sans.fallback),
    "--orphix-font-mono": createFontStack(font.families.mono.family, font.families.mono.fallback),
    "--orphix-font-ui": createFontStack(font.families.ui.family, font.families.ui.fallback),
    "--orphix-font-body": createFontStack(font.families.body.family, font.families.body.fallback),
    "--orphix-font-heading": createFontStack(font.families.heading.family, font.families.heading.fallback),
    "--orphix-font-code": createFontStack(font.families.code.family, font.families.code.fallback),
    "--orphix-font-terminal": createFontStack(font.families.terminal.family, font.families.terminal.fallback),

    "--orphix-font-size-ui": font.sizes.ui,
    "--orphix-font-size-body": font.sizes.body,
    "--orphix-font-size-heading": font.sizes.heading,
    "--orphix-font-size-code": font.sizes.code,
    "--orphix-font-size-terminal": font.sizes.terminal,
    "--orphix-font-size-status": font.sizes.status,

    "--orphix-icon-size-xs": `${icon.meta.sizes.xs}px`,
    "--orphix-icon-size-sm": `${icon.meta.sizes.sm}px`,
    "--orphix-icon-size-md": `${icon.meta.sizes.md}px`,
    "--orphix-icon-size-lg": `${icon.meta.sizes.lg}px`,
    "--orphix-icon-size-xl": `${icon.meta.sizes.xl}px`,
  };
}

function createFontStack(family: string, fallback: string[]): string {
  return [quoteFontFamily(family), ...fallback].join(", ");
}

function quoteFontFamily(font: string): string {
  return font.includes(" ") ? `"${font}"` : font;
}
```

## `packages/themes/src/utils/create-icon-map.ts`

```ts
import type { OrphixThemeVariant } from "../types";

export function createIconMap(theme: OrphixThemeVariant) {
  return theme.icons.icons;
}
```

## `packages/themes/src/utils/resolve-theme.ts`

```ts
import { getThemeById } from "../registry";

export function resolveTheme(themeId?: string) {
  return getThemeById(themeId ?? "orphix.dark");
}
```

---

# Desktop usage

Inside desktop:

```txt
apps/desktop/src/renderer/themes/
├── ThemeProvider.tsx
├── apply-theme.ts
├── use-theme.ts
├── xterm-theme.ts
└── icons.ts
```

## `apply-theme.ts`

```ts
import { createCssVars, getThemeById } from "@orphix/themes";

export function applyTheme(themeId: string) {
  const theme = getThemeById(themeId);
  const vars = createCssVars(theme);

  for (const [key, value] of Object.entries(vars)) {
    document.documentElement.style.setProperty(key, value);
  }

  document.documentElement.dataset.theme = theme.id;
}
```

## `xterm-theme.ts`

```ts
import { createXtermTheme, getThemeById } from "@orphix/themes";

export function getXtermTheme(themeId: string) {
  const theme = getThemeById(themeId);
  return createXtermTheme(theme);
}
```

## `icons.ts`

```ts
import { createIconMap, getThemeById } from "@orphix/themes";

export function getIcons(themeId: string) {
  const theme = getThemeById(themeId);
  return createIconMap(theme);
}
```

---

# How components consume it

Bad:

```tsx
<div style={{ color: "#32E0C4" }} />
```

Good:

```tsx
<div className="text-[var(--orphix-color-primary)]" />
```

Bad:

```tsx
<TerminalIcon size={16} />
```

Good:

```tsx
<Icon
  name={icons.core.terminal}
  size={theme.icons.icons.meta.sizes.md}
/>
```

Bad:

```tsx
fontFamily: "JetBrains Mono"
```

Good:

```tsx
fontFamily: "var(--orphix-font-terminal)"
```

---

# How xterm uses it

When creating a terminal:

```ts
const terminal = new Terminal({
  theme: getXtermTheme(activeThemeId),
  fontFamily: "var(--orphix-font-terminal)",
  fontSize: Number.parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue("--orphix-font-size-terminal"),
    10,
  ),
});
```

Better: resolve the font from the theme object:

```ts
const theme = getThemeById(activeThemeId);
const terminalFont = theme.fonts.fonts.families.terminal;

const terminal = new Terminal({
  theme: createXtermTheme(theme),
  fontFamily: [terminalFont.family, ...terminalFont.fallback].join(", "),
  fontSize: Number.parseInt(theme.fonts.fonts.sizes.terminal, 10),
});
```

---

# How icons work

The icon theme stores icon names, not React components.

Example:

```ts
icons.core.terminal = "terminal"
```

Renderer maps the string to an actual icon component.

Example:

```ts
import {
  Terminal,
  Settings,
  Search,
  X,
} from "lucide-react";

export const lucideIconRegistry = {
  terminal: Terminal,
  settings: Settings,
  search: Search,
  x: X,
};
```

Then:

```tsx
const IconComponent = lucideIconRegistry[theme.icons.icons.core.terminal];

return <IconComponent size={theme.icons.icons.meta.sizes.md} />;
```

This keeps `packages/themes` independent from React and `lucide-react`.

---

# Why icons are part of themes

Icons are visual style. A theme may want:

```txt
minimal icons
rounded icons
sharp icons
filled icons
duotone icons
```

So icon theme controls:

```txt
icon names
icon style
default sizes
stroke width
radius
```

But actual rendering stays inside desktop.

---

# Why colors are separate

Colors change by dark/light/monochrome variants.

Example:

```txt
orphix.dark.colors
orphix.light.colors
orphix.monochrome-dark.colors
```

Fonts and icons may stay the same across variants.

So you can compose:

```txt
dark colors + default fonts + default icons
light colors + default fonts + default icons
monochrome colors + mono fonts + minimal icons
```

This avoids repeating the whole theme object for every variant.

---

# Why fonts are separate

Fonts affect the entire app:

```txt
terminal readability
command palette density
settings readability
status bar compactness
agent labels
tabs
panels
```

So fonts are not random CSS. They are first-class theme tokens.

Good font variants:

```txt
default
compact
mono
large
accessibility
```

Example future variants:

```txt
orphix.default.fonts
orphix.compact.fonts
orphix.mono.fonts
```

---

# Why no Git-specific theme tokens

Git is not part of base visual identity.

Avoid:

```ts
gitAdded
gitModified
gitDeleted
gitRenamed
gitUntracked
gitIgnored
```

Git UI should derive colors from semantic tokens:

```txt
added      -> status.success
modified   -> status.warning
deleted    -> status.danger
renamed    -> status.info
ignored    -> textSubtle
untracked  -> brand.accent
```

This keeps themes generic.

Agent colors are allowed because agents are central to Orphix’s core app identity:

```ts
agentRunning
agentIdle
agentError
agentPaused
```

---

# Future extension support

Later, extensions can ask for theme tokens instead of hardcoding their own styles.

Example extension API:

```ts
const theme = orphix.theme.getActiveTheme();

button.style.color = theme.colors.colors.brand.primary;
```

Or CSS variables:

```css
.my-extension-button {
  color: var(--orphix-color-primary);
  background: var(--orphix-color-base-surface);
}
```

This makes extensions visually consistent with Orphix.

---

# Final rule

The theme package owns values.

The desktop app owns application.

```txt
packages/themes
  owns colors, fonts, icons, theme registry, theme resolution

apps/desktop
  owns ThemeProvider, applying CSS variables, rendering icons, passing xterm theme

features/*
  consume theme tokens only

components/*
  consume theme tokens only

no hardcoded colors/fonts/icons outside packages/themes
```