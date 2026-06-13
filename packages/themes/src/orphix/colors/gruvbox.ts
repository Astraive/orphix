import type { OrphixColorTheme } from "../../types";

export const gruvboxColors: OrphixColorTheme = {
  id: "gruvbox.colors",
  themeId: "gruvbox",
  variantId: "dark",

  name: "Gruvbox Colors",
  mode: "dark",
  appearance: "dark",

  colors: {
    base: {
      background: "#282828",
      foreground: "#ebdbb2",

      surface: "#3c3836",
      surfaceMuted: "#504945",
      surfaceElevated: "#665c54",
      surfaceDeep: "#1d2021",
      surfaceHover: "#665c54",
      surfaceActive: "#7c6f64",

      border: "#504945",
      borderMuted: "#3c3836",
      borderStrong: "#7c6f64",

      overlay: "rgba(0, 0, 0, 0.58)",
      ring: "#d79921",
    },

    text: {
      text: "#ebdbb2",
      textMuted: "#7c6f64",
      textSubtle: "#504945",
      textDisabled: "#3c3836",
      textInverse: "#282828",
      textAccent: "#d79921",
    },

    brand: {
      primary: "#d79921",
      primaryForeground: "#282828",

      secondary: "#504945",
      secondaryForeground: "#ebdbb2",

      accent: "#b8bb26",
      accentForeground: "#282828",
    },

    status: {
      success: "#b8bb26",
      successForeground: "#282828",

      warning: "#d79921",
      warningForeground: "#282828",

      danger: "#fb4934",
      dangerForeground: "#282828",

      info: "#83a598",
      infoForeground: "#282828",
    },

    agents: {
      agentRunning: "#b8bb26",
      agentIdle: "#7c6f64",
      agentError: "#fb4934",
      agentPaused: "#d79921",
    },

    terminal: {
      background: "#282828",
      foreground: "#ebdbb2",

      cursor: "#ebdbb2",
      cursorAccent: "#282828",

      selectionBackground: "#504945",
      selectionForeground: "#ebdbb2",

      black: "#282828",
      red: "#fb4934",
      green: "#b8bb26",
      yellow: "#d79921",
      blue: "#83a598",
      magenta: "#d3869b",
      cyan: "#8ec07c",
      white: "#ebdbb2",

      brightBlack: "#7c6f64",
      brightRed: "#fb4934",
      brightGreen: "#b8bb26",
      brightYellow: "#d79921",
      brightBlue: "#83a598",
      brightMagenta: "#d3869b",
      brightCyan: "#8ec07c",
      brightWhite: "#fbf1c7",
    },

    syntax: {
      keyword: "#fb4934",
      string: "#b8bb26",
      number: "#d3869b",
      boolean: "#d3869b",
      comment: "#928374",
      function: "#d79921",
      variable: "#ebdbb2",
      type: "#83a598",
      className: "#83a598",
      constant: "#d3869b",
      operator: "#fb4934",
      punctuation: "#ebdbb2",
      property: "#8ec07c",
      tag: "#fb4934",
      attribute: "#d79921",
    },
  },
};
