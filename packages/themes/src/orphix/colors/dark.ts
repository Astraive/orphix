import type { OrphixColorTheme } from "../../types";

export const orphixDarkColors: OrphixColorTheme = {
  id: "orphix.dark.colors",
  themeId: "orphix",
  variantId: "dark",

  name: "Orphix Dark Colors",
  mode: "dark",
  appearance: "dark",

  colors: {
    base: {
      background: "#050D10",
      foreground: "#EEEEEE",

      surface: "#071418",
      surfaceMuted: "#091A1F",
      surfaceElevated: "#0A1D22",
      surfaceDeep: "#020708",
      surfaceHover: "#0D2026",
      surfaceActive: "#102B31",

      border: "#123238",
      borderMuted: "#0C252B",
      borderStrong: "#1D5962",

      overlay: "rgba(0, 0, 0, 0.58)",
      ring: "#32E0C4",
    },

    text: {
      text: "#EEEEEE",
      textMuted: "#8FA3A8",
      textSubtle: "#5F777C",
      textDisabled: "#3D555A",
      textInverse: "#031113",
      textAccent: "#32E0C4",
    },

    brand: {
      primary: "#32E0C4",
      primaryForeground: "#031113",

      secondary: "#0D7377",
      secondaryForeground: "#FFFFFF",

      accent: "#00D9F5",
      accentForeground: "#031113",
    },

    status: {
      success: "#32E0C4",
      successForeground: "#031113",

      warning: "#FFC857",
      warningForeground: "#1F1600",

      danger: "#FF5C7A",
      dangerForeground: "#FFFFFF",

      info: "#00D9F5",
      infoForeground: "#031113",
    },

    agents: {
      agentRunning: "#32E0C4",
      agentIdle: "#8FA3A8",
      agentError: "#FF5C7A",
      agentPaused: "#FFC857",
    },

    terminal: {
      background: "#050D10",
      foreground: "#EEEEEE",

      cursor: "#32E0C4",
      cursorAccent: "#050D10",

      selectionBackground: "#0D7377",
      selectionForeground: "#FFFFFF",

      black: "#050D10",
      red: "#FF5C7A",
      green: "#32E0C4",
      yellow: "#FFC857",
      blue: "#00D9F5",
      magenta: "#B18CFF",
      cyan: "#0D7377",
      white: "#EEEEEE",

      brightBlack: "#385A60",
      brightRed: "#FF7A92",
      brightGreen: "#5EF5DD",
      brightYellow: "#FFD978",
      brightBlue: "#45E6FF",
      brightMagenta: "#C9A8FF",
      brightCyan: "#20A4AA",
      brightWhite: "#FFFFFF",
    },

    syntax: {
      keyword: "#00D9F5",
      string: "#32E0C4",
      number: "#FFC857",
      boolean: "#FFC857",
      comment: "#5F777C",
      function: "#EEEEEE",
      variable: "#8FA3A8",
      type: "#20A4AA",
      className: "#32E0C4",
      constant: "#B18CFF",
      operator: "#00D9F5",
      punctuation: "#8FA3A8",
      property: "#EEEEEE",
      tag: "#00D9F5",
      attribute: "#32E0C4",
    },
  },
};
