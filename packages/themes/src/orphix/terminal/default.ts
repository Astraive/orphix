import type { OrphixTerminalTheme } from "../../types";

export const orphixDefaultTerminal: OrphixTerminalTheme = {
  id: "orphix.default.terminal",
  themeId: "orphix",
  variantId: "default",
  name: "Orphix Default Terminal",

  terminal: {
    pane: {
      background: "#020708",
      foreground: "#EEEEEE",
      border: "rgba(50, 224, 196, 0.06)",
      borderActive: "rgba(50, 224, 196, 0.9)",
      borderHover: "rgba(50, 224, 196, 0.3)",
      borderDisabled: "#3D555A",
      shadow: "none",
      shadowActive: "0 0 20px rgba(50, 224, 196, 0.06)",
    },

    tab: {
      background: "#071418",
      activeBackground: "#020708",
      hoverBackground: "#091A1F",
      foreground: "#8FA3A8",
      activeForeground: "#EEEEEE",
      disabledForeground: "#3D555A",
      border: "rgba(50, 224, 196, 0.06)",
    },

    status: {
      background: "rgba(0, 0, 0, 0.2)",
      foreground: "rgba(255, 255, 255, 0.3)",
    },

    scrollbar: {
      thumb: "#0D7377",
      thumbHover: "#32E0C4",
      track: "transparent",
    },

    selection: {
      background: "rgba(50, 224, 196, 0.15)",
      foreground: "#EEEEEE",
    },
  },
};
