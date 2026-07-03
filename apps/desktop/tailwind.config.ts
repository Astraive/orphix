import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
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
        // shadcn/ui semantic tokens, bridged to the active Orphix theme so the
        // @orphix/ui components follow whatever theme is selected.
        border: "var(--orphix-color-base-border)",
        input: "var(--orphix-color-base-border)",
        ring: "var(--orphix-color-base-ring)",
        background: "var(--orphix-color-base-background)",
        foreground: "var(--orphix-color-text)",
        primary: {
          DEFAULT: "var(--orphix-color-primary)",
          foreground: "var(--orphix-color-primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--orphix-color-secondary)",
          foreground: "var(--orphix-color-secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--orphix-color-danger)",
          foreground: "var(--orphix-color-danger-foreground)",
        },
        muted: {
          DEFAULT: "var(--orphix-color-base-surface-muted)",
          foreground: "var(--orphix-color-text-muted)",
        },
        accent: {
          DEFAULT: "var(--orphix-color-base-surface-hover)",
          foreground: "var(--orphix-color-text)",
        },
        popover: {
          DEFAULT: "var(--orphix-color-base-surface-elevated)",
          foreground: "var(--orphix-color-text)",
        },
        card: {
          DEFAULT: "var(--orphix-color-base-surface)",
          foreground: "var(--orphix-color-text)",
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
  plugins: [animate],
} satisfies Config;
