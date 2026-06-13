import type { OrphixTerminalTheme } from "../../types";

export const catppuccinTerminal: OrphixTerminalTheme = {
  id: "catppuccin.terminal",
  themeId: "catppuccin",
  variantId: "dark",
  name: "Catppuccin Terminal",

  terminal: {
    pane: {
      background: "#11111b",
      foreground: "#cdd6f4",
      border: "rgba(203, 166, 247, 0.06)",
      borderActive: "rgba(203, 166, 247, 0.9)",
      borderHover: "rgba(203, 166, 247, 0.3)",
      borderDisabled: "#313244",
      shadow: "none",
      shadowActive: "0 0 20px rgba(203, 166, 247, 0.06)",
    },
    tab: {
      background: "#1e1e2e",
      activeBackground: "#11111b",
      hoverBackground: "#313244",
      foreground: "#6c7086",
      activeForeground: "#cdd6f4",
      disabledForeground: "#313244",
      border: "rgba(203, 166, 247, 0.06)",
    },
    status: { background: "rgba(0,0,0,0.2)", foreground: "rgba(255,255,255,0.3)" },
    scrollbar: { thumb: "#45475a", thumbHover: "#cba6f7", track: "transparent" },
    selection: { background: "rgba(203, 166, 247, 0.15)", foreground: "#cdd6f4" },
  },
};
