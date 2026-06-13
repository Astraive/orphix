import type { OrphixColorTheme } from "../../types";

export const draculaColors: OrphixColorTheme = {
  id: "dracula.colors",
  themeId: "dracula",
  variantId: "dark",

  name: "Dracula Colors",
  mode: "dark",
  appearance: "dark",

  colors: {
    base: {
      background: "#282A36",
      foreground: "#F8F8F2",

      surface: "#2D303E",
      surfaceMuted: "#343746",
      surfaceElevated: "#3C3F58",
      surfaceDeep: "#1E1F29",
      surfaceHover: "#44475A",
      surfaceActive: "#6272A4",

      border: "#44475A",
      borderMuted: "#3C3F58",
      borderStrong: "#6272A4",

      overlay: "rgba(0, 0, 0, 0.58)",
      ring: "#BD93F9",
    },

    text: {
      text: "#F8F8F2",
      textMuted: "#6272A4",
      textSubtle: "#44475A",
      textDisabled: "#3C3F58",
      textInverse: "#282A36",
      textAccent: "#BD93F9",
    },

    brand: {
      primary: "#BD93F9",
      primaryForeground: "#282A36",

      secondary: "#44475A",
      secondaryForeground: "#F8F8F2",

      accent: "#FF79C6",
      accentForeground: "#282A36",
    },

    status: {
      success: "#50FA7B",
      successForeground: "#282A36",

      warning: "#F1FA8C",
      warningForeground: "#282A36",

      danger: "#FF5555",
      dangerForeground: "#F8F8F2",

      info: "#8BE9FD",
      infoForeground: "#282A36",
    },

    agents: {
      agentRunning: "#50FA7B",
      agentIdle: "#6272A4",
      agentError: "#FF5555",
      agentPaused: "#F1FA8C",
    },

    terminal: {
      background: "#282A36",
      foreground: "#F8F8F2",

      cursor: "#F8F8F2",
      cursorAccent: "#282A36",

      selectionBackground: "#44475A",
      selectionForeground: "#F8F8F2",

      black: "#21222C",
      red: "#FF5555",
      green: "#50FA7B",
      yellow: "#F1FA8C",
      blue: "#BD93F9",
      magenta: "#FF79C6",
      cyan: "#8BE9FD",
      white: "#F8F8F2",

      brightBlack: "#6272A4",
      brightRed: "#FF6E6E",
      brightGreen: "#69FF94",
      brightYellow: "#FFFFA5",
      brightBlue: "#D6ACFF",
      brightMagenta: "#FF92DF",
      brightCyan: "#A4FFFF",
      brightWhite: "#FFFFFF",
    },

    syntax: {
      keyword: "#FF79C6",
      string: "#F1FA8C",
      number: "#BD93F9",
      boolean: "#BD93F9",
      comment: "#6272A4",
      function: "#50FA7B",
      variable: "#F8F8F2",
      type: "#8BE9FD",
      className: "#8BE9FD",
      constant: "#BD93F9",
      operator: "#FF79C6",
      punctuation: "#F8F8F2",
      property: "#66D9EF",
      tag: "#FF79C6",
      attribute: "#50FA7B",
    },
  },
};
