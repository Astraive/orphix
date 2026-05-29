import type { Config } from "tailwindcss";

export default {
  content: ["./src/renderer/index.html", "./src/renderer/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ox: {
          bg: "var(--ox-bg)",
          surface: "var(--ox-surface)",
          muted: "var(--ox-muted)",
          accent: "var(--ox-accent)",
          text: "var(--ox-text)",
          "text-dim": "var(--ox-text-dim)",
          cyan: "var(--orphix-color-accent)",
        },
        "orphix-hover": {
          subtle: "var(--orphix-hover-subtle)",
          medium: "var(--orphix-hover-medium)",
          strong: "var(--orphix-hover-strong)",
        },
      },
      fontSize: {
        xs: ["var(--orphix-size-text-caption, 0.75rem)", { lineHeight: "1.35" }],
        sm: ["var(--orphix-size-text-ui, 0.8125rem)", { lineHeight: "1.4" }],
        base: ["var(--orphix-size-text-base, 0.875rem)", { lineHeight: "1.55" }],
        lg: ["var(--orphix-size-text-heading, 1.0625rem)", { lineHeight: "1.2" }],
        xl: ["1.25rem", { lineHeight: "1.2" }],
        "2xl": ["1.5rem", { lineHeight: "1.15" }],
        "3xl": ["1.875rem", { lineHeight: "1.1" }],
      },
      borderRadius: {
        tile: "18px",
        panel: "20px",
      },
      gap: {
        tile: "12px",
      },
    },
  },
  plugins: [],
} satisfies Config;
