import type { OrphixColorTheme } from "../../types";

export const orphixMonochromeLightColors: OrphixColorTheme = {
  id: "orphix.monochrome-light.colors",
  themeId: "orphix",
  variantId: "monochrome-light",

  name: "Orphix Monochrome Light Colors",
  mode: "light",
  appearance: "monochrome",

  colors: {
    base: {
      background: "#FAFAFA",
      foreground: "#1A1A1A",

      surface: "#FFFFFF",
      surfaceMuted: "#F0F0F0",
      surfaceElevated: "#FFFFFF",
      surfaceDeep: "#E8E8E8",
      surfaceHover: "#ECECEC",
      surfaceActive: "#E0E0E0",

      border: "#D4D4D4",
      borderMuted: "#E2E2E2",
      borderStrong: "#A0A0A0",

      overlay: "rgba(0, 0, 0, 0.28)",
      ring: "#444444",
    },

    text: {
      text: "#1A1A1A",
      textMuted: "#666666",
      textSubtle: "#888888",
      textDisabled: "#B0B0B0",
      textInverse: "#FAFAFA",
      textAccent: "#444444",
    },

    brand: {
      primary: "#444444",
      primaryForeground: "#FFFFFF",

      secondary: "#888888",
      secondaryForeground: "#FFFFFF",

      accent: "#555555",
      accentForeground: "#FFFFFF",
    },

    status: {
      success: "#555555",
      successForeground: "#FFFFFF",

      warning: "#666666",
      warningForeground: "#FFFFFF",

      danger: "#777777",
      dangerForeground: "#FFFFFF",

      info: "#888888",
      infoForeground: "#FFFFFF",
    },

    agents: {
      agentRunning: "#555555",
      agentIdle: "#999999",
      agentError: "#777777",
      agentPaused: "#666666",
    },

    terminal: {
      background: "#FAFAFA",
      foreground: "#1A1A1A",

      cursor: "#444444",
      cursorAccent: "#FAFAFA",

      selectionBackground: "#CCCCCC",
      selectionForeground: "#1A1A1A",

      black: "#1A1A1A",
      red: "#777777",
      green: "#555555",
      yellow: "#666666",
      blue: "#888888",
      magenta: "#999999",
      cyan: "#777777",
      white: "#FAFAFA",

      brightBlack: "#999999",
      brightRed: "#888888",
      brightGreen: "#666666",
      brightYellow: "#777777",
      brightBlue: "#999999",
      brightMagenta: "#AAAAAA",
      brightCyan: "#888888",
      brightWhite: "#FFFFFF",
    },

    syntax: {
      keyword: "#555555",
      string: "#444444",
      number: "#666666",
      boolean: "#666666",
      comment: "#999999",
      function: "#1A1A1A",
      variable: "#666666",
      type: "#777777",
      className: "#444444",
      constant: "#999999",
      operator: "#555555",
      punctuation: "#666666",
      property: "#1A1A1A",
      tag: "#555555",
      attribute: "#444444",
    },
  },
};
