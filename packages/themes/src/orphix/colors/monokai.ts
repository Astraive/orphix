import type { OrphixColorTheme } from "../../types";

export const monokaiColors: OrphixColorTheme = {
  id: "monokai.colors",
  themeId: "monokai",
  variantId: "dark",

  name: "Monokai Colors",
  mode: "dark",
  appearance: "dark",

  colors: {
    base: {
      background: "#272822",
      foreground: "#F8F8F2",

      surface: "#2D2E27",
      surfaceMuted: "#3E3D32",
      surfaceElevated: "#49483E",
      surfaceDeep: "#1E1F1C",
      surfaceHover: "#49483E",
      surfaceActive: "#75715E",

      border: "#3E3D32",
      borderMuted: "#2D2E27",
      borderStrong: "#75715E",

      overlay: "rgba(0, 0, 0, 0.58)",
      ring: "#A6E22E",
    },

    text: {
      text: "#F8F8F2",
      textMuted: "#75715E",
      textSubtle: "#3E3D32",
      textDisabled: "#2D2E27",
      textInverse: "#272822",
      textAccent: "#A6E22E",
    },

    brand: {
      primary: "#A6E22E",
      primaryForeground: "#272822",

      secondary: "#49483E",
      secondaryForeground: "#F8F8F2",

      accent: "#F92672",
      accentForeground: "#272822",
    },

    status: {
      success: "#A6E22E",
      successForeground: "#272822",

      warning: "#E6DB74",
      warningForeground: "#272822",

      danger: "#F92672",
      dangerForeground: "#F8F8F2",

      info: "#66D9EF",
      infoForeground: "#272822",
    },

    agents: {
      agentRunning: "#A6E22E",
      agentIdle: "#75715E",
      agentError: "#F92672",
      agentPaused: "#E6DB74",
    },

    terminal: {
      background: "#272822",
      foreground: "#F8F8F2",

      cursor: "#F8F8F2",
      cursorAccent: "#272822",

      selectionBackground: "#49483E",
      selectionForeground: "#F8F8F2",

      black: "#272822",
      red: "#F92672",
      green: "#A6E22E",
      yellow: "#E6DB74",
      blue: "#66D9EF",
      magenta: "#AE81FF",
      cyan: "#A1EFE4",
      white: "#F8F8F2",

      brightBlack: "#75715E",
      brightRed: "#F92672",
      brightGreen: "#A6E22E",
      brightYellow: "#E6DB74",
      brightBlue: "#66D9EF",
      brightMagenta: "#AE81FF",
      brightCyan: "#A1EFE4",
      brightWhite: "#F9F8F5",
    },

    syntax: {
      keyword: "#F92672",
      string: "#E6DB74",
      number: "#AE81FF",
      boolean: "#AE81FF",
      comment: "#75715E",
      function: "#A6E22E",
      variable: "#F8F8F2",
      type: "#66D9EF",
      className: "#A6E22E",
      constant: "#AE81FF",
      operator: "#F92672",
      punctuation: "#F8F8F2",
      property: "#A6E22E",
      tag: "#F92672",
      attribute: "#A6E22E",
    },
  },
};
