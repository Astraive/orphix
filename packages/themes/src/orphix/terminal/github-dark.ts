import type { OrphixTerminalTheme } from "../../types";

export const githubDarkTerminal: OrphixTerminalTheme = {
  id: "github-dark.terminal",
  themeId: "github-dark",
  variantId: "dark",
  name: "GitHub Dark Terminal",

  terminal: {
    pane: {
      background: "#010409",
      foreground: "#c9d1d9",
      border: "rgba(88, 166, 255, 0.06)",
      borderActive: "rgba(88, 166, 255, 0.9)",
      borderHover: "rgba(88, 166, 255, 0.3)",
      borderDisabled: "#21262d",
      shadow: "none",
      shadowActive: "0 0 20px rgba(88, 166, 255, 0.06)",
    },
    tab: {
      background: "#0d1117",
      activeBackground: "#010409",
      hoverBackground: "#161b22",
      foreground: "#8b949e",
      activeForeground: "#c9d1d9",
      disabledForeground: "#21262d",
      border: "rgba(88, 166, 255, 0.06)",
    },
    status: { background: "rgba(0,0,0,0.2)", foreground: "rgba(255,255,255,0.3)" },
    scrollbar: { thumb: "#30363d", thumbHover: "#58a6ff", track: "transparent" },
    selection: { background: "rgba(88, 166, 255, 0.15)", foreground: "#c9d1d9" },
  },
};
