import type { OrphixTerminalTheme } from "../../types";

export const solarizedDarkTerminal: OrphixTerminalTheme = {
  id: "solarized-dark.terminal",
  themeId: "solarized-dark",
  variantId: "dark",
  name: "Solarized Dark Terminal",

  terminal: {
    pane: {
      background: "#001e27",
      foreground: "#839496",
      border: "rgba(38, 139, 210, 0.06)",
      borderActive: "rgba(38, 139, 210, 0.9)",
      borderHover: "rgba(38, 139, 210, 0.3)",
      borderDisabled: "#073642",
      shadow: "none",
      shadowActive: "0 0 20px rgba(38, 139, 210, 0.06)",
    },
    tab: {
      background: "#002b36",
      activeBackground: "#001e27",
      hoverBackground: "#073642",
      foreground: "#586e75",
      activeForeground: "#839496",
      disabledForeground: "#073642",
      border: "rgba(38, 139, 210, 0.06)",
    },
    status: { background: "rgba(0,0,0,0.2)", foreground: "rgba(255,255,255,0.3)" },
    scrollbar: { thumb: "#094959", thumbHover: "#268bd2", track: "transparent" },
    selection: { background: "rgba(38, 139, 210, 0.15)", foreground: "#839496" },
  },
};
