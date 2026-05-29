import type { OrphixTerminalTheme } from "../../types";

export const orphixMonoLightTerminal: OrphixTerminalTheme = {
  id: "orphix.mono-light.terminal",
  themeId: "orphix",
  variantId: "mono-light",
  name: "Orphix Mono Light Terminal",

  terminal: {
    pane: {
      background: "#FAFAFA",
      foreground: "#2A2A2A",
      border: "rgba(0, 0, 0, 0.08)",
      borderActive: "rgba(0, 0, 0, 0.5)",
      borderHover: "rgba(0, 0, 0, 0.15)",
      borderDisabled: "#C0C0C0",
      shadow: "none",
      shadowActive: "0 0 20px rgba(0, 0, 0, 0.04)",
    },

    tab: {
      background: "#F0F0F0",
      activeBackground: "#FAFAFA",
      hoverBackground: "#E8E8E8",
      foreground: "#808080",
      activeForeground: "#2A2A2A",
      disabledForeground: "#C0C0C0",
      border: "rgba(0, 0, 0, 0.08)",
    },

    status: {
      background: "rgba(0, 0, 0, 0.06)",
      foreground: "rgba(0, 0, 0, 0.25)",
    },

    scrollbar: {
      thumb: "#C0C0C0",
      thumbHover: "#808080",
      track: "transparent",
    },

    selection: {
      background: "rgba(0, 0, 0, 0.08)",
      foreground: "#2A2A2A",
    },
  },
};
