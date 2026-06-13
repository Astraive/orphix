import type { OrphixColorTheme } from "../../types";

export const githubDarkColors: OrphixColorTheme = {
  id: "github-dark.colors",
  themeId: "github-dark",
  variantId: "dark",

  name: "GitHub Dark Colors",
  mode: "dark",
  appearance: "dark",

  colors: {
    base: {
      background: "#0d1117",
      foreground: "#c9d1d9",

      surface: "#161b22",
      surfaceMuted: "#21262d",
      surfaceElevated: "#30363d",
      surfaceDeep: "#010409",
      surfaceHover: "#30363d",
      surfaceActive: "#388bfd26",

      border: "#30363d",
      borderMuted: "#21262d",
      borderStrong: "#484f58",

      overlay: "rgba(0, 0, 0, 0.58)",
      ring: "#58a6ff",
    },

    text: {
      text: "#c9d1d9",
      textMuted: "#8b949e",
      textSubtle: "#484f58",
      textDisabled: "#21262d",
      textInverse: "#0d1117",
      textAccent: "#58a6ff",
    },

    brand: {
      primary: "#58a6ff",
      primaryForeground: "#0d1117",

      secondary: "#30363d",
      secondaryForeground: "#c9d1d9",

      accent: "#bc8cff",
      accentForeground: "#0d1117",
    },

    status: {
      success: "#3fb950",
      successForeground: "#0d1117",

      warning: "#d29922",
      warningForeground: "#0d1117",

      danger: "#f85149",
      dangerForeground: "#0d1117",

      info: "#58a6ff",
      infoForeground: "#0d1117",
    },

    agents: {
      agentRunning: "#3fb950",
      agentIdle: "#8b949e",
      agentError: "#f85149",
      agentPaused: "#d29922",
    },

    terminal: {
      background: "#0d1117",
      foreground: "#c9d1d9",

      cursor: "#c9d1d9",
      cursorAccent: "#0d1117",

      selectionBackground: "#264f78",
      selectionForeground: "#c9d1d9",

      black: "#484f58",
      red: "#ff7b72",
      green: "#3fb950",
      yellow: "#d29922",
      blue: "#58a6ff",
      magenta: "#bc8cff",
      cyan: "#39c5cf",
      white: "#c9d1d9",

      brightBlack: "#6e7681",
      brightRed: "#ffa198",
      brightGreen: "#56d364",
      brightYellow: "#e3b341",
      brightBlue: "#79c0ff",
      brightMagenta: "#d2a8ff",
      brightCyan: "#56d4dd",
      brightWhite: "#f0f6fc",
    },

    syntax: {
      keyword: "#ff7b72",
      string: "#a5d6ff",
      number: "#79c0ff",
      boolean: "#79c0ff",
      comment: "#8b949e",
      function: "#d2a8ff",
      variable: "#c9d1d9",
      type: "#ffa657",
      className: "#ffa657",
      constant: "#79c0ff",
      operator: "#ff7b72",
      punctuation: "#c9d1d9",
      property: "#79c0ff",
      tag: "#7ee787",
      attribute: "#79c0ff",
    },
  },
};
