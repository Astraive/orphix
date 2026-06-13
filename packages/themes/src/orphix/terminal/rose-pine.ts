import type { OrphixTerminalTheme } from "../../types";

export const rosePineTerminal: OrphixTerminalTheme = {
  id: "rose-pine.terminal",
  themeId: "rose-pine",
  variantId: "dark",
  name: "Rose Pine Terminal",

  terminal: {
    pane: {
      background: "#11111b",
      foreground: "#e0def4",
      border: "rgba(196, 167, 231, 0.06)",
      borderActive: "rgba(196, 167, 231, 0.9)",
      borderHover: "rgba(196, 167, 231, 0.3)",
      borderDisabled: "#26233a",
      shadow: "none",
      shadowActive: "0 0 20px rgba(196, 167, 231, 0.06)",
    },
    tab: {
      background: "#191724",
      activeBackground: "#11111b",
      hoverBackground: "#1f1d2e",
      foreground: "#6e6a86",
      activeForeground: "#e0def4",
      disabledForeground: "#26233a",
      border: "rgba(196, 167, 231, 0.06)",
    },
    status: { background: "rgba(0,0,0,0.2)", foreground: "rgba(255,255,255,0.3)" },
    scrollbar: { thumb: "#26233a", thumbHover: "#c4a7e7", track: "transparent" },
    selection: { background: "rgba(196, 167, 231, 0.15)", foreground: "#e0def4" },
  },
};
