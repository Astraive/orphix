import type { OrphixColorTheme } from "../../types";

export const rosePineColors: OrphixColorTheme = {
  id: "rose-pine.colors",
  themeId: "rose-pine",
  variantId: "dark",

  name: "Rose Pine Colors",
  mode: "dark",
  appearance: "dark",

  colors: {
    base: {
      background: "#191724",
      foreground: "#e0def4",

      surface: "#1f1d2e",
      surfaceMuted: "#26233a",
      surfaceElevated: "#393552",
      surfaceDeep: "#11111b",
      surfaceHover: "#393552",
      surfaceActive: "#403d52",

      border: "#26233a",
      borderMuted: "#1f1d2e",
      borderStrong: "#403d52",

      overlay: "rgba(0, 0, 0, 0.58)",
      ring: "#c4a7e7",
    },

    text: {
      text: "#e0def4",
      textMuted: "#6e6a86",
      textSubtle: "#26233a",
      textDisabled: "#1f1d2e",
      textInverse: "#191724",
      textAccent: "#c4a7e7",
    },

    brand: {
      primary: "#c4a7e7",
      primaryForeground: "#191724",

      secondary: "#393552",
      secondaryForeground: "#e0def4",

      accent: "#eb6f92",
      accentForeground: "#191724",
    },

    status: {
      success: "#9ccfd8",
      successForeground: "#191724",

      warning: "#f6c177",
      warningForeground: "#191724",

      danger: "#eb6f92",
      dangerForeground: "#191724",

      info: "#9ccfd8",
      infoForeground: "#191724",
    },

    agents: {
      agentRunning: "#9ccfd8",
      agentIdle: "#6e6a86",
      agentError: "#eb6f92",
      agentPaused: "#f6c177",
    },

    terminal: {
      background: "#191724",
      foreground: "#e0def4",

      cursor: "#e0def4",
      cursorAccent: "#191724",

      selectionBackground: "#2a283e",
      selectionForeground: "#e0def4",

      black: "#26233a",
      red: "#eb6f92",
      green: "#31748f",
      yellow: "#f6c177",
      blue: "#9ccfd8",
      magenta: "#c4a7e7",
      cyan: "#ebbcba",
      white: "#e0def4",

      brightBlack: "#6e6a86",
      brightRed: "#eb6f92",
      brightGreen: "#31748f",
      brightYellow: "#f6c177",
      brightBlue: "#9ccfd8",
      brightMagenta: "#c4a7e7",
      brightCyan: "#ebbcba",
      brightWhite: "#e0def4",
    },

    syntax: {
      keyword: "#31748f",
      string: "#f6c177",
      number: "#ebbcba",
      boolean: "#ebbcba",
      comment: "#6e6a86",
      function: "#9ccfd8",
      variable: "#e0def4",
      type: "#c4a7e7",
      className: "#c4a7e7",
      constant: "#ebbcba",
      operator: "#908caa",
      punctuation: "#908caa",
      property: "#eb6f92",
      tag: "#eb6f92",
      attribute: "#f6c177",
    },
  },
};
