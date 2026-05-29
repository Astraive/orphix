import type { OrphixTerminalTheme } from "../../types";

export const orphixLightTerminal: OrphixTerminalTheme = {
  id: "orphix.light.terminal",
  themeId: "orphix",
  variantId: "light",
  name: "Orphix Light Terminal",

  terminal: {
    pane: {
      background: "#FFFFFF",
      foreground: "#1A1A2E",
      border: "rgba(13, 115, 119, 0.1)",
      borderActive: "rgba(13, 115, 119, 0.9)",
      borderHover: "rgba(13, 115, 119, 0.3)",
      borderDisabled: "#B0BEC5",
      shadow: "none",
      shadowActive: "0 0 20px rgba(13, 115, 119, 0.08)",
    },

    tab: {
      background: "#F0F4F8",
      activeBackground: "#FFFFFF",
      hoverBackground: "#E8EDF2",
      foreground: "#546E7A",
      activeForeground: "#1A1A2E",
      disabledForeground: "#B0BEC5",
      border: "rgba(13, 115, 119, 0.1)",
    },

    status: {
      background: "rgba(0, 0, 0, 0.06)",
      foreground: "rgba(0, 0, 0, 0.3)",
    },

    scrollbar: {
      thumb: "#B0BEC5",
      thumbHover: "#0D7377",
      track: "transparent",
    },

    selection: {
      background: "rgba(13, 115, 119, 0.12)",
      foreground: "#1A1A2E",
    },
  },
};
