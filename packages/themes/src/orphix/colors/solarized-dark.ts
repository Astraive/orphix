import type { OrphixColorTheme } from "../../types";

export const solarizedDarkColors: OrphixColorTheme = {
  id: "solarized-dark.colors",
  themeId: "solarized-dark",
  variantId: "dark",

  name: "Solarized Dark Colors",
  mode: "dark",
  appearance: "dark",

  colors: {
    base: {
      background: "#002b36",
      foreground: "#839496",

      surface: "#073642",
      surfaceMuted: "#094959",
      surfaceElevated: "#0a5c6e",
      surfaceDeep: "#001e27",
      surfaceHover: "#0a5c6e",
      surfaceActive: "#0b6d82",

      border: "#094959",
      borderMuted: "#073642",
      borderStrong: "#0b6d82",

      overlay: "rgba(0, 0, 0, 0.58)",
      ring: "#268bd2",
    },

    text: {
      text: "#839496",
      textMuted: "#586e75",
      textSubtle: "#094959",
      textDisabled: "#073642",
      textInverse: "#002b36",
      textAccent: "#268bd2",
    },

    brand: {
      primary: "#268bd2",
      primaryForeground: "#fdf6e3",

      secondary: "#586e75",
      secondaryForeground: "#839496",

      accent: "#6c71c4",
      accentForeground: "#fdf6e3",
    },

    status: {
      success: "#859900",
      successForeground: "#fdf6e3",

      warning: "#b58900",
      warningForeground: "#fdf6e3",

      danger: "#dc322f",
      dangerForeground: "#fdf6e3",

      info: "#2aa198",
      infoForeground: "#fdf6e3",
    },

    agents: {
      agentRunning: "#859900",
      agentIdle: "#586e75",
      agentError: "#dc322f",
      agentPaused: "#b58900",
    },

    terminal: {
      background: "#002b36",
      foreground: "#839496",

      cursor: "#839496",
      cursorAccent: "#002b36",

      selectionBackground: "#094959",
      selectionForeground: "#839496",

      black: "#073642",
      red: "#dc322f",
      green: "#859900",
      yellow: "#b58900",
      blue: "#268bd2",
      magenta: "#d33682",
      cyan: "#2aa198",
      white: "#eee8d5",

      brightBlack: "#586e75",
      brightRed: "#cb4b16",
      brightGreen: "#586e75",
      brightYellow: "#657b83",
      brightBlue: "#839496",
      brightMagenta: "#6c71c4",
      brightCyan: "#93a1a1",
      brightWhite: "#fdf6e3",
    },

    syntax: {
      keyword: "#859900",
      string: "#2aa198",
      number: "#d33682",
      boolean: "#d33682",
      comment: "#586e75",
      function: "#268bd2",
      variable: "#839496",
      type: "#b58900",
      className: "#b58900",
      constant: "#cb4b16",
      operator: "#859900",
      punctuation: "#839496",
      property: "#268bd2",
      tag: "#268bd2",
      attribute: "#93a1a1",
    },
  },
};
