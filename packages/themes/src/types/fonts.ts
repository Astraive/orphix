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
  family: OrphixFontValue;
  fallback: OrphixFontValue[];
  weight?: number | string;
  lineHeight?: string;
  letterSpacing?: string;
  fontFeatureSettings?: string;
  fontVariationSettings?: string;
}

export interface OrphixFontFamilies {
  sans: OrphixFontFace;
  mono: OrphixFontFace;
  serif?: OrphixFontFace;
  display: OrphixFontFace;
  ui: OrphixFontFace;
  body: OrphixFontFace;
  heading: OrphixFontFace;
  caption: OrphixFontFace;
  label: OrphixFontFace;
  code: OrphixFontFace;
  terminal: OrphixFontFace;
  command: OrphixFontFace;
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
