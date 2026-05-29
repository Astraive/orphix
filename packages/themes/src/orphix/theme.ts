import type { OrphixThemeFamily } from "../types";

import { orphixDarkColors } from "./colors/dark";
import { orphixLightColors } from "./colors/light";
import { orphixMonochromeDarkColors } from "./colors/monochrome-dark";
import { orphixMonochromeLightColors } from "./colors/monochrome-light";
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
  },
};
