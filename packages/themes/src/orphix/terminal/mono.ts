import type { OrphixTerminalTheme } from "../../types";

export const orphixMonoTerminal: OrphixTerminalTheme = {
  id: "orphix.mono.terminal",
  themeId: "orphix",
  variantId: "mono",
  name: "Orphix Mono Terminal",

  terminal: {
    pane: {
      background: "#0A0A0A",
      foreground: "#D4D4D4",
      border: "rgba(255, 255, 255, 0.06)",
      borderActive: "rgba(255, 255, 255, 0.5)",
      borderHover: "rgba(255, 255, 255, 0.15)",
      borderDisabled: "#3A3A3A",
      shadow: "none",
      shadowActive: "0 0 20px rgba(255, 255, 255, 0.04)",
    },

    tab: {
      background: "#141414",
      activeBackground: "#0A0A0A",
      hoverBackground: "#1A1A1A",
      foreground: "#6B6B6B",
      activeForeground: "#D4D4D4",
      disabledForeground: "#3A3A3A",
      border: "rgba(255, 255, 255, 0.06)",
    },

    status: {
      background: "rgba(0, 0, 0, 0.3)",
      foreground: "rgba(255, 255, 255, 0.25)",
    },

    scrollbar: {
      thumb: "#3A3A3A",
      thumbHover: "#6B6B6B",
      track: "transparent",
    },

    selection: {
      background: "rgba(255, 255, 255, 0.1)",
      foreground: "#D4D4D4",
    },
  },
};
