import { create } from "zustand";

// ── Preset definitions ──

type PresetId = "xs" | "s" | "m" | "l" | "xl";

interface SizingValues {
  textBase: number;       // px
  textCaption: number;    // px
  textUi: number;         // px
  textHeading: number;    // px
  icon: number;           // px
  sidebar: number;        // px
  toolbar: number;        // px
  popupWidth: number;     // rem
  gap: number;            // px
  radius: number;         // px
}

const PRESETS: Record<PresetId, SizingValues> = {
  xs: { textBase: 12, textCaption: 10, textUi: 11, textHeading: 15, icon: 14, sidebar: 52, toolbar: 30, popupWidth: 22, gap: 6, radius: 6 },
  s:  { textBase: 14, textCaption: 12, textUi: 13, textHeading: 17, icon: 16, sidebar: 64, toolbar: 36, popupWidth: 28, gap: 8, radius: 8 },
  m:  { textBase: 16, textCaption: 13, textUi: 15, textHeading: 20, icon: 18, sidebar: 72, toolbar: 40, popupWidth: 30, gap: 10, radius: 10 },
  l:  { textBase: 18, textCaption: 15, textUi: 17, textHeading: 22, icon: 20, sidebar: 80, toolbar: 44, popupWidth: 32, gap: 12, radius: 12 },
  xl: { textBase: 20, textCaption: 16, textUi: 18, textHeading: 24, icon: 22, sidebar: 88, toolbar: 48, popupWidth: 34, gap: 14, radius: 14 },
};

const PRESET_IDS: PresetId[] = ["xs", "s", "m", "l", "xl"];

// ── CSS variable keys ──

const CSS_VAR_MAP: Record<keyof SizingValues, string> = {
  textBase:    "--orphix-size-text-base",
  textCaption: "--orphix-size-text-caption",
  textUi:      "--orphix-size-text-ui",
  textHeading: "--orphix-size-text-heading",
  icon:        "--orphix-size-icon",
  sidebar:     "--orphix-size-sidebar",
  toolbar:     "--orphix-size-toolbar",
  popupWidth:  "--orphix-size-popup-width",
  gap:         "--orphix-size-gap",
  radius:      "--orphix-size-radius",
};

// ── Helpers ──

function formatValue(key: keyof SizingValues, value: number): string {
  if (key === "popupWidth") return `${value}rem`;
  return `${value}px`;
}

function loadPreset(): PresetId {
  try {
    const saved = localStorage.getItem("orphix-sizing-preset");
    if (saved && PRESET_IDS.includes(saved as PresetId)) return saved as PresetId;
  } catch {}
  return "s";
}

function loadOverrides(): Partial<SizingValues> {
  try {
    const raw = localStorage.getItem("orphix-sizing-overrides");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function savePreset(preset: PresetId) {
  try { localStorage.setItem("orphix-sizing-preset", preset); } catch {}
}

function saveOverrides(overrides: Partial<SizingValues>) {
  try { localStorage.setItem("orphix-sizing-overrides", JSON.stringify(overrides)); } catch {}
}

// ── Store ──

interface SizingStore {
  preset: PresetId;
  overrides: Partial<SizingValues>;
  values: SizingValues;

  setPreset: (preset: PresetId) => void;
  setOverride: (key: keyof SizingValues, value: number) => void;
  resetToPreset: () => void;
  apply: () => void;
}

export const useSizingStore = create<SizingStore>()((set, get) => {
  const initialPreset = loadPreset();
  const initialOverrides = loadOverrides();
  const values = mergeValues(initialPreset, initialOverrides);

  return {
    preset: initialPreset,
    overrides: initialOverrides,
    values,

    setPreset: (preset) => {
      savePreset(preset);
      const values = mergeValues(preset, get().overrides);
      set({ preset, values });
      applyCssVars(values);
    },

    setOverride: (key, value) => {
      const overrides = { ...get().overrides, [key]: value };
      saveOverrides(overrides);
      const values = mergeValues(get().preset, overrides);
      set({ overrides, values });
      applyCssVars(values);
    },

    resetToPreset: () => {
      saveOverrides({});
      const values = mergeValues(get().preset, {});
      set({ overrides: {}, values });
      applyCssVars(values);
    },

    apply: () => {
      applyCssVars(get().values);
    },
  };
});

function mergeValues(preset: PresetId, overrides: Partial<SizingValues>): SizingValues {
  return { ...PRESETS[preset], ...overrides };
}

function applyCssVars(values: SizingValues) {
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
    const value = values[key as keyof SizingValues];
    root.style.setProperty(cssVar, formatValue(key as keyof SizingValues, value));
  }
}

export type { PresetId, SizingValues };
export { PRESETS, PRESET_IDS, CSS_VAR_MAP };
