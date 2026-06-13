import type { OrphixColorTheme } from "../../types";

export const catppuccinColors: OrphixColorTheme = {
  id: "catppuccin.colors",
  themeId: "catppuccin",
  variantId: "dark",

  name: "Catppuccin Colors",
  mode: "dark",
  appearance: "dark",

  colors: {
    base: {
      background: "#1e1e2e",
      foreground: "#cdd6f4",

      surface: "#313244",
      surfaceMuted: "#45475a",
      surfaceElevated: "#585b70",
      surfaceDeep: "#11111b",
      surfaceHover: "#585b70",
      surfaceActive: "#6c7086",

      border: "#45475a",
      borderMuted: "#313244",
      borderStrong: "#6c7086",

      overlay: "rgba(0, 0, 0, 0.58)",
      ring: "#cba6f7",
    },

    text: {
      text: "#cdd6f4",
      textMuted: "#6c7086",
      textSubtle: "#45475a",
      textDisabled: "#313244",
      textInverse: "#1e1e2e",
      textAccent: "#cba6f7",
    },

    brand: {
      primary: "#cba6f7",
      primaryForeground: "#1e1e2e",

      secondary: "#45475a",
      secondaryForeground: "#cdd6f4",

      accent: "#f5c2e7",
      accentForeground: "#1e1e2e",
    },

    status: {
      success: "#a6e3a1",
      successForeground: "#1e1e2e",

      warning: "#f9e2af",
      warningForeground: "#1e1e2e",

      danger: "#f38ba8",
      dangerForeground: "#1e1e2e",

      info: "#89dceb",
      infoForeground: "#1e1e2e",
    },

    agents: {
      agentRunning: "#a6e3a1",
      agentIdle: "#6c7086",
      agentError: "#f38ba8",
      agentPaused: "#f9e2af",
    },

    terminal: {
      background: "#1e1e2e",
      foreground: "#cdd6f4",

      cursor: "#f5e0dc",
      cursorAccent: "#1e1e2e",

      selectionBackground: "#45475a",
      selectionForeground: "#cdd6f4",

      black: "#45475a",
      red: "#f38ba8",
      green: "#a6e3a1",
      yellow: "#f9e2af",
      blue: "#89b4fa",
      magenta: "#f5c2e7",
      cyan: "#94e2d5",
      white: "#bac2de",

      brightBlack: "#585b70",
      brightRed: "#f38ba8",
      brightGreen: "#a6e3a1",
      brightYellow: "#f9e2af",
      brightBlue: "#89b4fa",
      brightMagenta: "#f5c2e7",
      brightCyan: "#94e2d5",
      brightWhite: "#a6adc8",
    },

    syntax: {
      keyword: "#cba6f7",
      string: "#a6e3a1",
      number: "#fab387",
      boolean: "#fab387",
      comment: "#6c7086",
      function: "#89b4fa",
      variable: "#cdd6f4",
      type: "#f9e2af",
      className: "#f9e2af",
      constant: "#fab387",
      operator: "#89dceb",
      punctuation: "#bac2de",
      property: "#89dceb",
      tag: "#f38ba8",
      attribute: "#f9e2af",
    },
  },
};
