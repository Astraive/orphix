/**
 * Icon name — resolves at render time via OrphixIcon component.
 *
 * Supported formats:
 *   - Lucide icon name: "terminal", "settings", "bot", "chevron-right"
 *   - Public URL: "https://example.com/icon.svg"
 *   - Local file path: "/path/to/icon.png", "./icons/custom.svg"
 *   - Data URI: "data:image/svg+xml;base64,..."
 */
export type OrphixIconName = string;

export type OrphixIconStyle =
  | "default"
  | "minimal"
  | "rounded"
  | "sharp"
  | "duotone"
  | "filled"
  | "outline";

export type OrphixIconSize = "xs" | "sm" | "md" | "lg" | "xl";

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
