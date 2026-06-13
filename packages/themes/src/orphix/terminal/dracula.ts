import type { OrphixTerminalTheme } from "../../types";

export const draculaTerminal: OrphixTerminalTheme = {
  id: "dracula.terminal",
  themeId: "dracula",
  variantId: "dark",
  name: "Dracula Terminal",

  terminal: {
    pane: {
      background: "#1E1F29",
      foreground: "#F8F8F2",
      border: "rgba(189, 147, 249, 0.06)",
      borderActive: "rgba(189, 147, 249, 0.9)",
      borderHover: "rgba(189, 147, 249, 0.3)",
      borderDisabled: "#3C3F58",
      shadow: "none",
      shadowActive: "0 0 20px rgba(189, 147, 249, 0.06)",
    },

    tab: {
      background: "#2D303E",
      activeBackground: "#1E1F29",
      hoverBackground: "#343746",
      foreground: "#6272A4",
      activeForeground: "#F8F8F2",
      disabledForeground: "#3C3F58",
      border: "rgba(189, 147, 249, 0.06)",
    },

    status: {
      background: "rgba(0, 0, 0, 0.2)",
      foreground: "rgba(255, 255, 255, 0.3)",
    },

    scrollbar: {
      thumb: "#6272A4",
      thumbHover: "#BD93F9",
      track: "transparent",
    },

    selection: {
      background: "rgba(189, 147, 249, 0.15)",
      foreground: "#F8F8F2",
    },
  },
};
