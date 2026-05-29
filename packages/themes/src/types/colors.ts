export type OrphixColorMode = "dark" | "light";

export type OrphixColorAppearance =
  | "dark"
  | "light"
  | "monochrome"
  | "high-contrast";

export type OrphixColorValue = string;

export interface OrphixBaseColors {
  background: OrphixColorValue;
  foreground: OrphixColorValue;
  surface: OrphixColorValue;
  surfaceMuted: OrphixColorValue;
  surfaceElevated: OrphixColorValue;
  surfaceDeep: OrphixColorValue;
  surfaceHover: OrphixColorValue;
  surfaceActive: OrphixColorValue;
  border: OrphixColorValue;
  borderMuted: OrphixColorValue;
  borderStrong: OrphixColorValue;
  overlay: OrphixColorValue;
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
