import type { OrphixTerminalTheme } from "../../types";

export const gruvboxTerminal: OrphixTerminalTheme = {
  id: "gruvbox.terminal",
  themeId: "gruvbox",
  variantId: "dark",
  name: "Gruvbox Terminal",

  terminal: {
    pane: {
      background: "#1d2021",
      foreground: "#ebdbb2",
      border: "rgba(215, 153, 33, 0.06)",
      borderActive: "rgba(215, 153, 33, 0.9)",
      borderHover: "rgba(215, 153, 33, 0.3)",
      borderDisabled: "#3c3836",
      shadow: "none",
      shadowActive: "0 0 20px rgba(215, 153, 33, 0.06)",
    },
    tab: {
      background: "#282828",
      activeBackground: "#1d2021",
      hoverBackground: "#3c3836",
      foreground: "#7c6f64",
      activeForeground: "#ebdbb2",
      disabledForeground: "#3c3836",
      border: "rgba(215, 153, 33, 0.06)",
    },
    status: { background: "rgba(0,0,0,0.2)", foreground: "rgba(255,255,255,0.3)" },
    scrollbar: { thumb: "#504945", thumbHover: "#d79921", track: "transparent" },
    selection: { background: "rgba(215, 153, 33, 0.15)", foreground: "#ebdbb2" },
  },
};
