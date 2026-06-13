import type { OrphixTerminalTheme } from "../../types";

export const oneDarkTerminal: OrphixTerminalTheme = {
  id: "one-dark.terminal",
  themeId: "one-dark",
  variantId: "dark",
  name: "One Dark Terminal",

  terminal: {
    pane: {
      background: "#21252b",
      foreground: "#abb2bf",
      border: "rgba(97, 175, 239, 0.06)",
      borderActive: "rgba(97, 175, 239, 0.9)",
      borderHover: "rgba(97, 175, 239, 0.3)",
      borderDisabled: "#2c313a",
      shadow: "none",
      shadowActive: "0 0 20px rgba(97, 175, 239, 0.06)",
    },
    tab: {
      background: "#282c34",
      activeBackground: "#21252b",
      hoverBackground: "#2c313a",
      foreground: "#5c6370",
      activeForeground: "#abb2bf",
      disabledForeground: "#2c313a",
      border: "rgba(97, 175, 239, 0.06)",
    },
    status: { background: "rgba(0,0,0,0.2)", foreground: "rgba(255,255,255,0.3)" },
    scrollbar: { thumb: "#3e4451", thumbHover: "#61afef", track: "transparent" },
    selection: { background: "rgba(97, 175, 239, 0.15)", foreground: "#abb2bf" },
  },
};
