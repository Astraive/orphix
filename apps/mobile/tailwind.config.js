/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#050D10",
        foreground: "#EEEEEE",
        card: "#071418",
        "card-foreground": "#EEEEEE",
        primary: "#32E0C4",
        "primary-foreground": "#050D10",
        secondary: "#0D7377",
        "secondary-foreground": "#EEEEEE",
        muted: "#8FA3A8",
        "muted-foreground": "#5A7A80",
        accent: "#32E0C4",
        "accent-foreground": "#050D10",
        destructive: "#FF5370",
        "destructive-foreground": "#EEEEEE",
        border: "#123238",
        input: "#123238",
      },
    },
  },
  plugins: [],
};
