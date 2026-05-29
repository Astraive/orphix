import type { OrphixFontTheme } from "../../types";

export const orphixDefaultFonts: OrphixFontTheme = {
  id: "orphix.default.fonts",
  themeId: "orphix",
  variantId: "default",

  name: "Orphix Default Fonts",

  fonts: {
    families: {
      sans: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        lineHeight: "1.5",
      },

      mono: {
        family: "JetBrains Mono",
        fallback: ["Cascadia Code", "Fira Code", "ui-monospace", "monospace"],
        lineHeight: "1.45",
        fontFeatureSettings: '"liga" 1, "calt" 1',
      },

      display: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        weight: 700,
        lineHeight: "1.1",
        letterSpacing: "-0.035em",
      },

      ui: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        lineHeight: "1.4",
        letterSpacing: "-0.01em",
      },

      body: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        lineHeight: "1.55",
      },

      heading: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        weight: 650,
        lineHeight: "1.2",
        letterSpacing: "-0.025em",
      },

      caption: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        lineHeight: "1.35",
        letterSpacing: "-0.005em",
      },

      label: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        weight: 500,
        lineHeight: "1.25",
        letterSpacing: "-0.005em",
      },

      code: {
        family: "JetBrains Mono",
        fallback: ["Cascadia Code", "Fira Code", "ui-monospace", "monospace"],
        lineHeight: "1.45",
        fontFeatureSettings: '"liga" 1, "calt" 1',
      },

      terminal: {
        family: "JetBrains Mono",
        fallback: ["Cascadia Code", "Fira Code", "Consolas", "monospace"],
        lineHeight: "1.25",
        fontFeatureSettings: '"liga" 1, "calt" 1',
      },

      command: {
        family: "JetBrains Mono",
        fallback: ["Cascadia Code", "Fira Code", "ui-monospace", "monospace"],
        lineHeight: "1.35",
      },

      status: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        lineHeight: "1.2",
        letterSpacing: "-0.005em",
      },
    },

    sizes: {
      xs: "12px",
      sm: "13px",
      md: "15px",
      lg: "17px",
      xl: "20px",
      "2xl": "24px",
      "3xl": "30px",
      "4xl": "38px",
      "5xl": "50px",

      ui: "14px",
      body: "15px",
      heading: "18px",
      caption: "13px",
      label: "13px",
      code: "14px",
      terminal: "15px",
      command: "14px",
      status: "13px",
    },

    weights: {
      thin: 100,
      extralight: 200,
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900,
    },

    lineHeights: {
      tight: "1.1",
      snug: "1.25",
      normal: "1.5",
      relaxed: "1.65",
      loose: "1.8",

      ui: "1.4",
      body: "1.55",
      heading: "1.2",
      code: "1.45",
      terminal: "1.25",
      command: "1.35",
      status: "1.2",
    },

    letterSpacing: {
      tighter: "-0.04em",
      tight: "-0.025em",
      normal: "0em",
      wide: "0.025em",
      wider: "0.05em",

      ui: "-0.01em",
      heading: "-0.025em",
      code: "0em",
      terminal: "0em",
      command: "0em",
      status: "-0.005em",
    },
  },
};
