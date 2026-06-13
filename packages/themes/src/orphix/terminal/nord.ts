import type { OrphixTerminalTheme } from "../../types";

export const nordTerminal: OrphixTerminalTheme = {
  id: "nord.terminal",
  themeId: "nord",
  variantId: "dark",
  name: "Nord Terminal",

  terminal: {
    pane: {
      background: "#242933",
      foreground: "#D8DEE9",
      border: "rgba(136, 192, 208, 0.06)",
      borderActive: "rgba(136, 192, 208, 0.9)",
      borderHover: "rgba(136, 192, 208, 0.3)",
      borderDisabled: "#3B4252",
      shadow: "none",
      shadowActive: "0 0 20px rgba(136, 192, 208, 0.06)",
    },

    tab: {
      background: "#2E3440",
      activeBackground: "#242933",
      hoverBackground: "#3B4252",
      foreground: "#4C566A",
      activeForeground: "#D8DEE9",
      disabledForeground: "#3B4252",
      border: "rgba(136, 192, 208, 0.06)",
    },

    status: {
      background: "rgba(0, 0, 0, 0.2)",
      foreground: "rgba(255, 255, 255, 0.3)",
    },

    scrollbar: {
      thumb: "#4C566A",
      thumbHover: "#88C0D0",
      track: "transparent",
    },

    selection: {
      background: "rgba(136, 192, 208, 0.15)",
      foreground: "#D8DEE9",
    },
  },
};
