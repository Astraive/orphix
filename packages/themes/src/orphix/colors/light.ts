import type { OrphixColorTheme } from "../../types";

export const orphixLightColors: OrphixColorTheme = {
  id: "orphix.light.colors",
  themeId: "orphix",
  variantId: "light",

  name: "Orphix Light Colors",
  mode: "light",
  appearance: "light",

  colors: {
    base: {
      background: "#F5F8F9",
      foreground: "#1A2B2E",

      surface: "#FFFFFF",
      surfaceMuted: "#EDF2F4",
      surfaceElevated: "#FFFFFF",
      surfaceDeep: "#E3EAED",
      surfaceHover: "#E0EFF2",
      surfaceActive: "#D0E6EA",

      border: "#C8D8DC",
      borderMuted: "#DDE7EA",
      borderStrong: "#A0BCC2",

      overlay: "rgba(0, 0, 0, 0.32)",
      ring: "#0D7377",
    },

    text: {
      text: "#1A2B2E",
      textMuted: "#567378",
      textSubtle: "#7A9499",
      textDisabled: "#B0C4C8",
      textInverse: "#FFFFFF",
      textAccent: "#0D7377",
    },

    brand: {
      primary: "#0D7377",
      primaryForeground: "#FFFFFF",

      secondary: "#32E0C4",
      secondaryForeground: "#031113",

      accent: "#00A3B8",
      accentForeground: "#FFFFFF",
    },

    status: {
      success: "#0D8A5E",
      successForeground: "#FFFFFF",

      warning: "#B8860B",
      warningForeground: "#FFFFFF",

      danger: "#D6336C",
      dangerForeground: "#FFFFFF",

      info: "#00A3B8",
      infoForeground: "#FFFFFF",
    },

    agents: {
      agentRunning: "#0D8A5E",
      agentIdle: "#7A9499",
      agentError: "#D6336C",
      agentPaused: "#B8860B",
    },

    terminal: {
      background: "#F5F8F9",
      foreground: "#1A2B2E",

      cursor: "#0D7377",
      cursorAccent: "#FFFFFF",

      selectionBackground: "#B0DDE2",
      selectionForeground: "#031113",

      black: "#1A2B2E",
      red: "#D6336C",
      green: "#0D7377",
      yellow: "#B8860B",
      blue: "#00A3B8",
      magenta: "#8B5CF6",
      cyan: "#0D8A5E",
      white: "#F5F8F9",

      brightBlack: "#567378",
      brightRed: "#E8547A",
      brightGreen: "#10B981",
      brightYellow: "#D4A017",
      brightBlue: "#22D3EE",
      brightMagenta: "#A78BFA",
      brightCyan: "#14B8A6",
      brightWhite: "#FFFFFF",
    },

    syntax: {
      keyword: "#00A3B8",
      string: "#0D7377",
      number: "#B8860B",
      boolean: "#B8860B",
      comment: "#7A9499",
      function: "#1A2B2E",
      variable: "#567378",
      type: "#0D8A5E",
      className: "#0D7377",
      constant: "#8B5CF6",
      operator: "#00A3B8",
      punctuation: "#567378",
      property: "#1A2B2E",
      tag: "#00A3B8",
      attribute: "#0D7377",
    },
  },
};
