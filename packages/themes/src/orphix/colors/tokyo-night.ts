import type { OrphixColorTheme } from "../../types";

export const tokyoNightColors: OrphixColorTheme = {
  id: "tokyo-night.colors",
  themeId: "tokyo-night",
  variantId: "dark",

  name: "Tokyo Night Colors",
  mode: "dark",
  appearance: "dark",

  colors: {
    base: {
      background: "#1A1B26",
      foreground: "#C0CAF5",

      surface: "#1F2335",
      surfaceMuted: "#24283B",
      surfaceElevated: "#292E42",
      surfaceDeep: "#16161E",
      surfaceHover: "#343A52",
      surfaceActive: "#414868",

      border: "#3B4261",
      borderMuted: "#292E42",
      borderStrong: "#565F89",

      overlay: "rgba(0, 0, 0, 0.58)",
      ring: "#7AA2F7",
    },

    text: {
      text: "#C0CAF5",
      textMuted: "#565F89",
      textSubtle: "#3B4261",
      textDisabled: "#292E42",
      textInverse: "#1A1B26",
      textAccent: "#7AA2F7",
    },

    brand: {
      primary: "#7AA2F7",
      primaryForeground: "#1A1B26",

      secondary: "#414868",
      secondaryForeground: "#C0CAF5",

      accent: "#BB9AF7",
      accentForeground: "#1A1B26",
    },

    status: {
      success: "#9ECE6A",
      successForeground: "#1A1B26",

      warning: "#E0AF68",
      warningForeground: "#1A1B26",

      danger: "#F7768E",
      dangerForeground: "#C0CAF5",

      info: "#7DCFFF",
      infoForeground: "#1A1B26",
    },

    agents: {
      agentRunning: "#9ECE6A",
      agentIdle: "#565F89",
      agentError: "#F7768E",
      agentPaused: "#E0AF68",
    },

    terminal: {
      background: "#1A1B26",
      foreground: "#C0CAF5",

      cursor: "#C0CAF5",
      cursorAccent: "#1A1B26",

      selectionBackground: "#33467C",
      selectionForeground: "#C0CAF5",

      black: "#15161E",
      red: "#F7768E",
      green: "#9ECE6A",
      yellow: "#E0AF68",
      blue: "#7AA2F7",
      magenta: "#BB9AF7",
      cyan: "#7DCFFF",
      white: "#A9B1D6",

      brightBlack: "#414868",
      brightRed: "#F7768E",
      brightGreen: "#9ECE6A",
      brightYellow: "#E0AF68",
      brightBlue: "#7AA2F7",
      brightMagenta: "#BB9AF7",
      brightCyan: "#7DCFFF",
      brightWhite: "#C0CAF5",
    },

    syntax: {
      keyword: "#BB9AF7",
      string: "#9ECE6A",
      number: "#FF9E64",
      boolean: "#FF9E64",
      comment: "#565F89",
      function: "#7AA2F7",
      variable: "#C0CAF5",
      type: "#2AC3DE",
      className: "#2AC3DE",
      constant: "#FF9E64",
      operator: "#89DDFF",
      punctuation: "#A9B1D6",
      property: "#7AA2F7",
      tag: "#F7768E",
      attribute: "#BB9AF7",
    },
  },
};
