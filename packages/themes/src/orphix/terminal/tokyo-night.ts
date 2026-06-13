import type { OrphixTerminalTheme } from "../../types";

export const tokyoNightTerminal: OrphixTerminalTheme = {
  id: "tokyo-night.terminal",
  themeId: "tokyo-night",
  variantId: "dark",
  name: "Tokyo Night Terminal",

  terminal: {
    pane: {
      background: "#16161E",
      foreground: "#C0CAF5",
      border: "rgba(122, 162, 247, 0.06)",
      borderActive: "rgba(122, 162, 247, 0.9)",
      borderHover: "rgba(122, 162, 247, 0.3)",
      borderDisabled: "#292E42",
      shadow: "none",
      shadowActive: "0 0 20px rgba(122, 162, 247, 0.06)",
    },

    tab: {
      background: "#1F2335",
      activeBackground: "#16161E",
      hoverBackground: "#24283B",
      foreground: "#565F89",
      activeForeground: "#C0CAF5",
      disabledForeground: "#292E42",
      border: "rgba(122, 162, 247, 0.06)",
    },

    status: {
      background: "rgba(0, 0, 0, 0.2)",
      foreground: "rgba(255, 255, 255, 0.3)",
    },

    scrollbar: {
      thumb: "#414868",
      thumbHover: "#7AA2F7",
      track: "transparent",
    },

    selection: {
      background: "rgba(122, 162, 247, 0.15)",
      foreground: "#C0CAF5",
    },
  },
};
