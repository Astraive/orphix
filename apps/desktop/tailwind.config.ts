import type { Config } from "tailwindcss";

export default {
  content: ["./renderer/index.html", "./renderer/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ox: {
          bg: "#050D10",
          surface: "#0D7377",
          muted: "#0D7377",
          accent: "#32E0C4",
          text: "#EAF4EF",
          "text-dim": "#8BA8A0",
          cyan: "#00D9F5",
        },
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
