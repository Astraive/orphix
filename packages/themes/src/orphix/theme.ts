import type { OrphixThemeFamily } from "../types";

import { orphixDarkColors } from "./colors/dark";
import { orphixLightColors } from "./colors/light";
import { orphixMonochromeDarkColors } from "./colors/monochrome-dark";
import { orphixMonochromeLightColors } from "./colors/monochrome-light";
import { draculaColors } from "./colors/dracula";
import { nordColors } from "./colors/nord";
import { tokyoNightColors } from "./colors/tokyo-night";
import { monokaiColors } from "./colors/monokai";
import { gruvboxColors } from "./colors/gruvbox";
import { catppuccinColors } from "./colors/catppuccin";
import { oneDarkColors } from "./colors/one-dark";
import { solarizedDarkColors } from "./colors/solarized-dark";
import { rosePineColors } from "./colors/rose-pine";
import { githubDarkColors } from "./colors/github-dark";
import { orphixDefaultFonts } from "./fonts/default";
import { orphixCompactFonts } from "./fonts/compact";
import { orphixMonoFonts } from "./fonts/mono";
import { orphixDefaultIcons } from "./icons/default";
import { orphixMinimalIcons } from "./icons/minimal";
import { orphixRoundedIcons } from "./icons/rounded";
import { orphixDefaultTerminal } from "./terminal/default";
import { orphixLightTerminal } from "./terminal/light";
import { orphixMonoTerminal } from "./terminal/mono";
import { orphixMonoLightTerminal } from "./terminal/mono-light";
import { draculaTerminal } from "./terminal/dracula";
import { nordTerminal } from "./terminal/nord";
import { tokyoNightTerminal } from "./terminal/tokyo-night";
import { monokaiTerminal } from "./terminal/monokai";
import { gruvboxTerminal } from "./terminal/gruvbox";
import { catppuccinTerminal } from "./terminal/catppuccin";
import { oneDarkTerminal } from "./terminal/one-dark";
import { solarizedDarkTerminal } from "./terminal/solarized-dark";
import { rosePineTerminal } from "./terminal/rose-pine";
import { githubDarkTerminal } from "./terminal/github-dark";

export const orphixTheme: OrphixThemeFamily = {
  id: "orphix",
  name: "Orphix",
  author: "Orphix",
  version: "0.1.0",
  description: "Official Orphix default theme family.",
  defaultVariant: "dark",

  variants: {
    dark: {
      id: "orphix.dark",
      themeId: "orphix",
      variantId: "dark",
      name: "Orphix Dark",
      colors: orphixDarkColors,
      fonts: orphixDefaultFonts,
      icons: orphixDefaultIcons,
      terminal: orphixDefaultTerminal,
    },
    light: {
      id: "orphix.light",
      themeId: "orphix",
      variantId: "light",
      name: "Orphix Light",
      colors: orphixLightColors,
      fonts: orphixDefaultFonts,
      icons: orphixDefaultIcons,
      terminal: orphixLightTerminal,
    },
    "monochrome-dark": {
      id: "orphix.monochrome-dark",
      themeId: "orphix",
      variantId: "monochrome-dark",
      name: "Monochrome Dark",
      colors: orphixMonochromeDarkColors,
      fonts: orphixMonoFonts,
      icons: orphixMinimalIcons,
      terminal: orphixMonoTerminal,
    },
    "monochrome-light": {
      id: "orphix.monochrome-light",
      themeId: "orphix",
      variantId: "monochrome-light",
      name: "Monochrome Light",
      colors: orphixMonochromeLightColors,
      fonts: orphixMonoFonts,
      icons: orphixMinimalIcons,
      terminal: orphixMonoLightTerminal,
    },
    dracula: {
      id: "orphix.dracula",
      themeId: "orphix",
      variantId: "dracula",
      name: "Dracula",
      colors: draculaColors,
      fonts: orphixDefaultFonts,
      icons: orphixDefaultIcons,
      terminal: draculaTerminal,
    },
    nord: {
      id: "orphix.nord",
      themeId: "orphix",
      variantId: "nord",
      name: "Nord",
      colors: nordColors,
      fonts: orphixDefaultFonts,
      icons: orphixDefaultIcons,
      terminal: nordTerminal,
    },
    "tokyo-night": {
      id: "orphix.tokyo-night",
      themeId: "orphix",
      variantId: "tokyo-night",
      name: "Tokyo Night",
      colors: tokyoNightColors,
      fonts: orphixDefaultFonts,
      icons: orphixDefaultIcons,
      terminal: tokyoNightTerminal,
    },
    monokai: {
      id: "orphix.monokai",
      themeId: "orphix",
      variantId: "monokai",
      name: "Monokai",
      colors: monokaiColors,
      fonts: orphixDefaultFonts,
      icons: orphixDefaultIcons,
      terminal: monokaiTerminal,
    },
    gruvbox: {
      id: "orphix.gruvbox",
      themeId: "orphix",
      variantId: "gruvbox",
      name: "Gruvbox Dark",
      colors: gruvboxColors,
      fonts: orphixDefaultFonts,
      icons: orphixDefaultIcons,
      terminal: gruvboxTerminal,
    },
    catppuccin: {
      id: "orphix.catppuccin",
      themeId: "orphix",
      variantId: "catppuccin",
      name: "Catppuccin Mocha",
      colors: catppuccinColors,
      fonts: orphixDefaultFonts,
      icons: orphixDefaultIcons,
      terminal: catppuccinTerminal,
    },
    "one-dark": {
      id: "orphix.one-dark",
      themeId: "orphix",
      variantId: "one-dark",
      name: "One Dark",
      colors: oneDarkColors,
      fonts: orphixDefaultFonts,
      icons: orphixDefaultIcons,
      terminal: oneDarkTerminal,
    },
    "solarized-dark": {
      id: "orphix.solarized-dark",
      themeId: "orphix",
      variantId: "solarized-dark",
      name: "Solarized Dark",
      colors: solarizedDarkColors,
      fonts: orphixDefaultFonts,
      icons: orphixDefaultIcons,
      terminal: solarizedDarkTerminal,
    },
    "rose-pine": {
      id: "orphix.rose-pine",
      themeId: "orphix",
      variantId: "rose-pine",
      name: "Rose Pine",
      colors: rosePineColors,
      fonts: orphixDefaultFonts,
      icons: orphixDefaultIcons,
      terminal: rosePineTerminal,
    },
    "github-dark": {
      id: "orphix.github-dark",
      themeId: "orphix",
      variantId: "github-dark",
      name: "GitHub Dark",
      colors: githubDarkColors,
      fonts: orphixDefaultFonts,
      icons: orphixDefaultIcons,
      terminal: githubDarkTerminal,
    },
  },
};
