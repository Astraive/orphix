import type { OrphixTerminalTheme } from "../../types";

export const monokaiTerminal: OrphixTerminalTheme = {
  id: "monokai.terminal",
  themeId: "monokai",
  variantId: "dark",
  name: "Monokai Terminal",

  terminal: {
    pane: {
      background: "#1E1F1C",
      foreground: "#F8F8F2",
      border: "rgba(166, 226, 46, 0.06)",
      borderActive: "rgba(166, 226, 46, 0.9)",
      borderHover: "rgba(166, 226, 46, 0.3)",
      borderDisabled: "#3E3D32",
      shadow: "none",
      shadowActive: "0 0 20px rgba(166, 226, 46, 0.06)",
    },

    tab: {
      background: "#2D2E27",
      activeBackground: "#1E1F1C",
      hoverBackground: "#3E3D32",
      foreground: "#75715E",
      activeForeground: "#F8F8F2",
      disabledForeground: "#2D2E27",
      border: "rgba(166, 226, 46, 0.06)",
    },

    status: {
      background: "rgba(0, 0, 0, 0.2)",
      foreground: "rgba(255, 255, 255, 0.3)",
    },

    scrollbar: {
      thumb: "#49483E",
      thumbHover: "#A6E22E",
      track: "transparent",
    },

    selection: {
      background: "rgba(166, 226, 46, 0.15)",
      foreground: "#F8F8F2",
    },
  },
};
