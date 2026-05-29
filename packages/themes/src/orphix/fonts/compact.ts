import type { OrphixFontTheme } from "../../types";

export const orphixCompactFonts: OrphixFontTheme = {
  id: "orphix.compact.fonts",
  themeId: "orphix",
  variantId: "compact",

  name: "Orphix Compact Fonts",

  fonts: {
    families: {
      sans: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        lineHeight: "1.35",
      },

      mono: {
        family: "JetBrains Mono",
        fallback: ["Cascadia Code", "Fira Code", "ui-monospace", "monospace"],
        lineHeight: "1.3",
        fontFeatureSettings: '"liga" 1, "calt" 1',
      },

      display: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        weight: 700,
        lineHeight: "1.05",
        letterSpacing: "-0.04em",
      },

      ui: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        lineHeight: "1.2",
        letterSpacing: "-0.015em",
      },

      body: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        lineHeight: "1.4",
      },

      heading: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        weight: 650,
        lineHeight: "1.1",
        letterSpacing: "-0.03em",
      },

      caption: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        lineHeight: "1.2",
        letterSpacing: "-0.01em",
      },

      label: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        weight: 500,
        lineHeight: "1.15",
        letterSpacing: "-0.01em",
      },

      code: {
        family: "JetBrains Mono",
        fallback: ["Cascadia Code", "Fira Code", "ui-monospace", "monospace"],
        lineHeight: "1.3",
        fontFeatureSettings: '"liga" 1, "calt" 1',
      },

      terminal: {
        family: "JetBrains Mono",
        fallback: ["Cascadia Code", "Fira Code", "Consolas", "monospace"],
        lineHeight: "1.15",
        fontFeatureSettings: '"liga" 1, "calt" 1',
      },

      command: {
        family: "JetBrains Mono",
        fallback: ["Cascadia Code", "Fira Code", "ui-monospace", "monospace"],
        lineHeight: "1.2",
      },

      status: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        lineHeight: "1.1",
        letterSpacing: "-0.01em",
      },
    },

    sizes: {
      xs: "11px",
      sm: "12px",
      md: "14px",
      lg: "16px",
      xl: "18px",
      "2xl": "22px",
      "3xl": "28px",
      "4xl": "36px",
      "5xl": "46px",

      ui: "13px",
      body: "14px",
      heading: "16px",
      caption: "12px",
      label: "12px",
      code: "13px",
      terminal: "14px",
      command: "13px",
      status: "12px",
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
      tight: "1.05",
      snug: "1.15",
      normal: "1.35",
      relaxed: "1.5",
      loose: "1.65",

      ui: "1.2",
      body: "1.4",
      heading: "1.1",
      code: "1.3",
      terminal: "1.15",
      command: "1.2",
      status: "1.1",
    },

    letterSpacing: {
      tighter: "-0.045em",
      tight: "-0.03em",
      normal: "0em",
      wide: "0.025em",
      wider: "0.05em",

      ui: "-0.015em",
      heading: "-0.03em",
      code: "0em",
      terminal: "0em",
      command: "0em",
      status: "-0.01em",
    },
  },
};
