import type { OrphixColorTheme } from "../../types";

export const orphixMonochromeDarkColors: OrphixColorTheme = {
  id: "orphix.monochrome-dark.colors",
  themeId: "orphix",
  variantId: "monochrome-dark",

  name: "Orphix Monochrome Dark Colors",
  mode: "dark",
  appearance: "monochrome",

  colors: {
    base: {
      background: "#0A0A0A",
      foreground: "#E0E0E0",

      surface: "#141414",
      surfaceMuted: "#1A1A1A",
      surfaceElevated: "#1E1E1E",
      surfaceDeep: "#050505",
      surfaceHover: "#222222",
      surfaceActive: "#2A2A2A",

      border: "#2E2E2E",
      borderMuted: "#242424",
      borderStrong: "#444444",

      overlay: "rgba(0, 0, 0, 0.6)",
      ring: "#CCCCCC",
    },

    text: {
      text: "#E0E0E0",
      textMuted: "#888888",
      textSubtle: "#606060",
      textDisabled: "#404040",
      textInverse: "#0A0A0A",
      textAccent: "#CCCCCC",
    },

    brand: {
      primary: "#CCCCCC",
      primaryForeground: "#0A0A0A",

      secondary: "#666666",
      secondaryForeground: "#FFFFFF",

      accent: "#AAAAAA",
      accentForeground: "#0A0A0A",
    },

    status: {
      success: "#AAAAAA",
      successForeground: "#0A0A0A",

      warning: "#CCCCCC",
      warningForeground: "#0A0A0A",

      danger: "#999999",
      dangerForeground: "#FFFFFF",

      info: "#888888",
      infoForeground: "#FFFFFF",
    },

    agents: {
      agentRunning: "#CCCCCC",
      agentIdle: "#777777",
      agentError: "#999999",
      agentPaused: "#AAAAAA",
    },

    terminal: {
      background: "#0A0A0A",
      foreground: "#E0E0E0",

      cursor: "#CCCCCC",
      cursorAccent: "#0A0A0A",

      selectionBackground: "#333333",
      selectionForeground: "#FFFFFF",

      black: "#0A0A0A",
      red: "#CC6666",
      green: "#AAAAAA",
      yellow: "#CCCC66",
      blue: "#888888",
      magenta: "#AA88CC",
      cyan: "#66AAAA",
      white: "#E0E0E0",

      brightBlack: "#444444",
      brightRed: "#DD8888",
      brightGreen: "#CCCCCC",
      brightYellow: "#DDDD88",
      brightBlue: "#AAAAAA",
      brightMagenta: "#BB99DD",
      brightCyan: "#88CCCC",
      brightWhite: "#FFFFFF",
    },

    syntax: {
      keyword: "#AAAAAA",
      string: "#CCCCCC",
      number: "#BBBBBB",
      boolean: "#BBBBBB",
      comment: "#606060",
      function: "#E0E0E0",
      variable: "#888888",
      type: "#999999",
      className: "#CCCCCC",
      constant: "#BB99DD",
      operator: "#AAAAAA",
      punctuation: "#888888",
      property: "#E0E0E0",
      tag: "#AAAAAA",
      attribute: "#CCCCCC",
    },
  },
};
