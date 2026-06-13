import type { OrphixColorTheme } from "../../types";

export const oneDarkColors: OrphixColorTheme = {
  id: "one-dark.colors",
  themeId: "one-dark",
  variantId: "dark",

  name: "One Dark Colors",
  mode: "dark",
  appearance: "dark",

  colors: {
    base: {
      background: "#282c34",
      foreground: "#abb2bf",

      surface: "#2c313a",
      surfaceMuted: "#3e4451",
      surfaceElevated: "#4b5263",
      surfaceDeep: "#21252b",
      surfaceHover: "#4b5263",
      surfaceActive: "#545862",

      border: "#3e4451",
      borderMuted: "#2c313a",
      borderStrong: "#545862",

      overlay: "rgba(0, 0, 0, 0.58)",
      ring: "#61afef",
    },

    text: {
      text: "#abb2bf",
      textMuted: "#5c6370",
      textSubtle: "#3e4451",
      textDisabled: "#2c313a",
      textInverse: "#282c34",
      textAccent: "#61afef",
    },

    brand: {
      primary: "#61afef",
      primaryForeground: "#282c34",

      secondary: "#3e4451",
      secondaryForeground: "#abb2bf",

      accent: "#c678dd",
      accentForeground: "#282c34",
    },

    status: {
      success: "#98c379",
      successForeground: "#282c34",

      warning: "#e5c07b",
      warningForeground: "#282c34",

      danger: "#e06c75",
      dangerForeground: "#282c34",

      info: "#56b6c2",
      infoForeground: "#282c34",
    },

    agents: {
      agentRunning: "#98c379",
      agentIdle: "#5c6370",
      agentError: "#e06c75",
      agentPaused: "#e5c07b",
    },

    terminal: {
      background: "#282c34",
      foreground: "#abb2bf",

      cursor: "#abb2bf",
      cursorAccent: "#282c34",

      selectionBackground: "#3e4451",
      selectionForeground: "#abb2bf",

      black: "#282c34",
      red: "#e06c75",
      green: "#98c379",
      yellow: "#e5c07b",
      blue: "#61afef",
      magenta: "#c678dd",
      cyan: "#56b6c2",
      white: "#abb2bf",

      brightBlack: "#5c6370",
      brightRed: "#e06c75",
      brightGreen: "#98c379",
      brightYellow: "#e5c07b",
      brightBlue: "#61afef",
      brightMagenta: "#c678dd",
      brightCyan: "#56b6c2",
      brightWhite: "#ffffff",
    },

    syntax: {
      keyword: "#c678dd",
      string: "#98c379",
      number: "#d19a66",
      boolean: "#d19a66",
      comment: "#5c6370",
      function: "#61afef",
      variable: "#abb2bf",
      type: "#e5c07b",
      className: "#e5c07b",
      constant: "#d19a66",
      operator: "#56b6c2",
      punctuation: "#abb2bf",
      property: "#e06c75",
      tag: "#e06c75",
      attribute: "#d19a66",
    },
  },
};
