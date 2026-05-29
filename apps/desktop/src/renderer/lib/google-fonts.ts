// Popular programming/monospace fonts from Google Fonts
export interface GoogleFont {
  name: string;
  category: "monospace" | "sans-serif" | "serif";
  weights: number[];
  variable: boolean;
}

export const MONOSPACE_FONTS: GoogleFont[] = [
  { name: "JetBrains Mono", category: "monospace", weights: [400, 500, 600, 700], variable: true },
  { name: "Fira Code", category: "monospace", weights: [300, 400, 500, 600, 700], variable: true },
  { name: "Source Code Pro", category: "monospace", weights: [200, 300, 400, 500, 600, 700, 900], variable: true },
  { name: "Cascadia Code", category: "monospace", weights: [200, 300, 400, 600, 700], variable: true },
  { name: "IBM Plex Mono", category: "monospace", weights: [100, 200, 300, 400, 500, 600, 700], variable: false },
  { name: "Ubuntu Mono", category: "monospace", weights: [400, 700], variable: false },
  { name: "Roboto Mono", category: "monospace", weights: [100, 200, 300, 400, 500, 600, 700], variable: true },
  { name: "Inconsolata", category: "monospace", weights: [200, 300, 400, 500, 600, 700, 800, 900], variable: true },
  { name: "Space Mono", category: "monospace", weights: [400, 700], variable: false },
  { name: "Overpass Mono", category: "monospace", weights: [300, 400, 500, 600, 700], variable: true },
  { name: "Bungee Mono", category: "monospace", weights: [400], variable: false },
  { name: "Nova Mono", category: "monospace", weights: [400], variable: false },
  { name: "Share Tech Mono", category: "monospace", weights: [400], variable: false },
  { name: "Courier Prime", category: "monospace", weights: [400, 700], variable: false },
  { name: "Fantasque Sans Mono", category: "monospace", weights: [400, 700], variable: false },
  { name: "Hack", category: "monospace", weights: [400, 700], variable: false },
  { name: "DM Mono", category: "monospace", weights: [300, 400, 500], variable: false },
  { name: "Azeret Mono", category: "monospace", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], variable: true },
  { name: "Geist Mono", category: "monospace", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], variable: true },
  { name: "Martian Mono", category: "monospace", weights: [100, 200, 300, 400, 500, 600, 700, 800], variable: true },
  { name: "Red Hat Mono", category: "monospace", weights: [300, 400, 500, 600, 700], variable: false },
  { name: "Oxanium", category: "monospace", weights: [200, 300, 400, 500, 600, 700, 800], variable: true },
];

const loadedFonts = new Set<string>();

export function buildGoogleFontsUrl(fonts: GoogleFont[]): string {
  const families = fonts.map((f) => {
    const name = f.name.replace(/ /g, "+");
    if (f.variable) return `family=${name}:wght@${Math.min(...f.weights)}..${Math.max(...f.weights)}`;
    return `family=${name}:wght@${f.weights.join(";")}`;
  });
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

export async function loadGoogleFont(font: GoogleFont): Promise<void> {
  if (loadedFonts.has(font.name)) return;

  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = buildGoogleFontsUrl([font]);
    link.onload = () => {
      loadedFonts.add(font.name);
      resolve();
    };
    link.onerror = reject;
    document.head.appendChild(link);
  });
}

export async function loadGoogleFontByName(name: string): Promise<void> {
  const font = MONOSPACE_FONTS.find((f) => f.name === name);
  if (font) await loadGoogleFont(font);
}

export function getFontCssFamily(font: GoogleFont): string {
  return `"${font.name}", ui-monospace, monospace`;
}

export function getSystemMonospaceFonts(): string[] {
  return ["Cascadia Code", "Fira Code", "Consolas", "Courier New", "monospace"];
}
