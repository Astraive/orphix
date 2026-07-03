import type { OrphixThemeVariant } from "../types";

export function createCssVars(theme: OrphixThemeVariant): Record<string, string> {
  const color = theme.colors.colors;
  const font = theme.fonts.fonts;
  const icon = theme.icons.icons;
  const term = theme.terminal?.terminal;

  const vars: Record<string, string> = {
    // Base surfaces
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

    // Text
    "--orphix-color-text": color.text.text,
    "--orphix-color-text-muted": color.text.textMuted,
    "--orphix-color-text-subtle": color.text.textSubtle,
    "--orphix-color-text-disabled": color.text.textDisabled,
    "--orphix-color-text-inverse": color.text.textInverse,
    "--orphix-color-text-accent": color.text.textAccent,

    // Brand
    "--orphix-color-primary": color.brand.primary,
    "--orphix-color-primary-foreground": color.brand.primaryForeground,
    "--orphix-color-secondary": color.brand.secondary,
    "--orphix-color-secondary-foreground": color.brand.secondaryForeground,
    "--orphix-color-accent": color.brand.accent,
    "--orphix-color-accent-foreground": color.brand.accentForeground,

    // Status
    "--orphix-color-success": color.status.success,
    "--orphix-color-success-foreground": color.status.successForeground,
    "--orphix-color-warning": color.status.warning,
    "--orphix-color-warning-foreground": color.status.warningForeground,
    "--orphix-color-danger": color.status.danger,
    "--orphix-color-danger-foreground": color.status.dangerForeground,
    "--orphix-color-info": color.status.info,
    "--orphix-color-info-foreground": color.status.infoForeground,

    // Agents
    "--orphix-color-agent-running": color.agents.agentRunning,
    "--orphix-color-agent-idle": color.agents.agentIdle,
    "--orphix-color-agent-error": color.agents.agentError,
    "--orphix-color-agent-paused": color.agents.agentPaused,

    // Terminal ANSI colors
    "--orphix-color-terminal-bg": color.terminal.background,
    "--orphix-color-terminal-fg": color.terminal.foreground,
    "--orphix-color-terminal-cursor": color.terminal.cursor,
    "--orphix-color-terminal-selection": color.terminal.selectionBackground,

    // Terminal UI - pane
    "--orphix-terminal-pane-bg": term?.pane.background ?? color.terminal.background,
    "--orphix-terminal-pane-fg": term?.pane.foreground ?? color.terminal.foreground,
    "--orphix-terminal-pane-border": term?.pane.border ?? color.base.border,
    "--orphix-terminal-pane-border-active": term?.pane.borderActive ?? color.brand.primary,
    "--orphix-terminal-pane-border-hover": term?.pane.borderHover ?? color.base.border,
    "--orphix-terminal-pane-border-disabled": term?.pane.borderDisabled ?? color.text.textDisabled,
    "--orphix-terminal-pane-shadow": term?.pane.shadow ?? "none",
    "--orphix-terminal-pane-shadow-active": term?.pane.shadowActive ?? "none",

    // Terminal UI - tab
    "--orphix-terminal-tab-bg": term?.tab.background ?? color.base.surface,
    "--orphix-terminal-tab-active-bg": term?.tab.activeBackground ?? color.terminal.background,
    "--orphix-terminal-tab-hover-bg": term?.tab.hoverBackground ?? color.base.surfaceMuted,
    "--orphix-terminal-tab-fg": term?.tab.foreground ?? color.text.textMuted,
    "--orphix-terminal-tab-active-fg": term?.tab.activeForeground ?? color.terminal.foreground,
    "--orphix-terminal-tab-disabled-fg": term?.tab.disabledForeground ?? color.text.textDisabled,
    "--orphix-terminal-tab-border": term?.tab.border ?? color.base.border,

    // Terminal UI - status
    "--orphix-terminal-status-bg": term?.status.background ?? "rgba(0,0,0,0.2)",
    "--orphix-terminal-status-fg": term?.status.foreground ?? "rgba(255,255,255,0.3)",

    // Terminal UI - scrollbar
    "--orphix-terminal-scrollbar-thumb": term?.scrollbar.thumb ?? color.brand.secondary,
    "--orphix-terminal-scrollbar-thumb-hover": term?.scrollbar.thumbHover ?? color.brand.primary,
    "--orphix-terminal-scrollbar-track": term?.scrollbar.track ?? "transparent",

    // Terminal UI - selection
    "--orphix-terminal-selection-bg": term?.selection?.background ?? "rgba(255,255,255,0.1)",
    "--orphix-terminal-selection-fg": term?.selection?.foreground ?? color.terminal.foreground,

    // Fonts - families
    "--orphix-font-sans": createFontStack(font.families.sans.family, font.families.sans.fallback),
    "--orphix-font-mono": createFontStack(font.families.mono.family, font.families.mono.fallback),
    "--orphix-font-ui": createFontStack(font.families.ui.family, font.families.ui.fallback),
    "--orphix-font-body": createFontStack(font.families.body.family, font.families.body.fallback),
    "--orphix-font-heading": createFontStack(font.families.heading.family, font.families.heading.fallback),
    "--orphix-font-code": createFontStack(font.families.code.family, font.families.code.fallback),
    "--orphix-font-terminal": createFontStack(font.families.terminal.family, font.families.terminal.fallback),

    // Fonts - sizes
    "--orphix-font-size-ui": font.sizes.ui,
    "--orphix-font-size-body": font.sizes.body,
    "--orphix-font-size-heading": font.sizes.heading,
    "--orphix-font-size-caption": font.sizes.caption,
    "--orphix-font-size-label": font.sizes.label,
    "--orphix-font-size-code": font.sizes.code,
    "--orphix-font-size-terminal": font.sizes.terminal,
    "--orphix-font-size-command": font.sizes.command,
    "--orphix-font-size-status": font.sizes.status,

    // Fonts - line heights
    "--orphix-line-height-terminal": font.lineHeights.terminal,

    // Icons - sizes
    "--orphix-icon-size-xs": `${icon.meta.sizes.xs}px`,
    "--orphix-icon-size-sm": `${icon.meta.sizes.sm}px`,
    "--orphix-icon-size-md": `${icon.meta.sizes.md}px`,
    "--orphix-icon-size-lg": `${icon.meta.sizes.lg}px`,
    "--orphix-icon-size-xl": `${icon.meta.sizes.xl}px`,
  };

  // Editor syntax-highlighting tokens — drive the .editor-tok-* classes per theme.
  // Guarded because older cached themes may predate the syntax palette.
  const sx = color.syntax;
  if (sx) {
    Object.assign(vars, {
      "--orphix-editor-token-comment": sx.comment,
      "--orphix-editor-token-string": sx.string,
      "--orphix-editor-token-keyword": sx.keyword,
      "--orphix-editor-token-function": sx.function,
      "--orphix-editor-token-type": sx.type,
      "--orphix-editor-token-number": sx.number,
      "--orphix-editor-token-operator": sx.operator,
      "--orphix-editor-token-tag": sx.tag,
      "--orphix-editor-token-attribute": sx.attribute,
    });
  }

  return vars;
}

function createFontStack(family: string, fallback: string[]): string {
  return [quoteFontFamily(family), ...fallback].join(", ");
}

function quoteFontFamily(font: string): string {
  return font.includes(" ") ? `"${font}"` : font;
}
