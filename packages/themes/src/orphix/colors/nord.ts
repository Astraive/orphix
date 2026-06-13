import type { OrphixColorTheme } from "../../types";

export const nordColors: OrphixColorTheme = {
  id: "nord.colors",
  themeId: "nord",
  variantId: "dark",

  name: "Nord Colors",
  mode: "dark",
  appearance: "dark",

  colors: {
    base: {
      background: "#2E3440",
      foreground: "#D8DEE9",

      surface: "#3B4252",
      surfaceMuted: "#434C5E",
      surfaceElevated: "#4C566A",
      surfaceDeep: "#242933",
      surfaceHover: "#4C566A",
      surfaceActive: "#5E81AC",

      border: "#434C5E",
      borderMuted: "#3B4252",
      borderStrong: "#5E81AC",

      overlay: "rgba(0, 0, 0, 0.58)",
      ring: "#88C0D0",
    },

    text: {
      text: "#D8DEE9",
      textMuted: "#4C566A",
      textSubtle: "#434C5E",
      textDisabled: "#3B4252",
      textInverse: "#2E3440",
      textAccent: "#88C0D0",
    },

    brand: {
      primary: "#88C0D0",
      primaryForeground: "#2E3440",

      secondary: "#4C566A",
      secondaryForeground: "#D8DEE9",

      accent: "#81A1C1",
      accentForeground: "#2E3440",
    },

    status: {
      success: "#A3BE8C",
      successForeground: "#2E3440",

      warning: "#EBCB8B",
      warningForeground: "#2E3440",

      danger: "#BF616A",
      dangerForeground: "#D8DEE9",

      info: "#88C0D0",
      infoForeground: "#2E3440",
    },

    agents: {
      agentRunning: "#A3BE8C",
      agentIdle: "#4C566A",
      agentError: "#BF616A",
      agentPaused: "#EBCB8B",
    },

    terminal: {
      background: "#2E3440",
      foreground: "#D8DEE9",

      cursor: "#D8DEE9",
      cursorAccent: "#2E3440",

      selectionBackground: "#434C5E",
      selectionForeground: "#D8DEE9",

      black: "#3B4252",
      red: "#BF616A",
      green: "#A3BE8C",
      yellow: "#EBCB8B",
      blue: "#81A1C1",
      magenta: "#B48EAD",
      cyan: "#88C0D0",
      white: "#E5E9F0",

      brightBlack: "#4C566A",
      brightRed: "#BF616A",
      brightGreen: "#A3BE8C",
      brightYellow: "#EBCB8B",
      brightBlue: "#81A1C1",
      brightMagenta: "#B48EAD",
      brightCyan: "#8FBCBB",
      brightWhite: "#ECEFF4",
    },

    syntax: {
      keyword: "#81A1C1",
      string: "#A3BE8C",
      number: "#B48EAD",
      boolean: "#B48EAD",
      comment: "#616E88",
      function: "#88C0D0",
      variable: "#D8DEE9",
      type: "#8FBCBB",
      className: "#8FBCBB",
      constant: "#B48EAD",
      operator: "#81A1C1",
      punctuation: "#D8DEE9",
      property: "#88C0D0",
      tag: "#81A1C1",
      attribute: "#8FBCBB",
    },
  },
};
