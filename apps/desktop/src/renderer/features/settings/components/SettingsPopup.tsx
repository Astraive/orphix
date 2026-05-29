import { useState, useEffect } from "react";
import { X, User, Palette, Keyboard, Monitor, Info, Ruler, ALargeSmall, Code, Link2, Shield } from "lucide-react";
import { useSizingStore, PRESETS, type PresetId, type SizingValues } from "../stores/sizing-store";
import { useTheme } from "@/providers/ThemeProvider";
import { ThemeStore } from "@/features/themes/ThemeStore";
import { useThemeStore } from "@/features/themes/theme-store";
import { useTerminalFontStore } from "@/features/terminal/stores/terminal-font-store";
import { useTerminalSettingsStore, type TerminalHeaderPosition } from "@/features/terminal/stores/terminal-settings-store";
import { useEditorSettingsStore } from "@/features/editor/stores/editor-settings-store";
import { MONOSPACE_FONTS } from "@/lib/google-fonts";

interface SettingsPopupProps {
  onClose: () => void;
}

type Section = "general" | "link" | "themes" | "fonts" | "sizing" | "keybindings" | "editor" | "terminal" | "about";
type LinkSettings = Window["orphix"] extends { link: { getSettings(): Promise<infer T> } } ? T : never;

const SECTIONS: { id: Section; label: string; icon: typeof User }[] = [
  { id: "general", label: "General", icon: User },
  { id: "link", label: "Link", icon: Link2 },
  { id: "themes", label: "Themes", icon: Palette },
  { id: "fonts", label: "Fonts", icon: ALargeSmall },
  { id: "sizing", label: "Sizing", icon: Ruler },
  { id: "keybindings", label: "Keybindings", icon: Keyboard },
  { id: "editor", label: "Editor", icon: Code },
  { id: "terminal", label: "Terminal", icon: Monitor },
  { id: "about", label: "About", icon: Info },
];

export function SettingsPopup({ onClose }: SettingsPopupProps) {
  const [active, setActive] = useState<Section>("general");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center anim-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative flex overflow-hidden anim-pop-in"
        style={{
          width: "800px", height: "600px", borderRadius: "16px",
          background: "color-mix(in srgb, var(--orphix-color-base-background) 95%, transparent)",
          border: "1px solid var(--orphix-color-base-border)",
          backdropFilter: "blur(32px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-[180px] shrink-0 flex flex-col border-r border-ox-border">
          <div className="px-4 py-3 border-b border-ox-border flex items-center justify-between">
            <span className="text-sm font-semibold text-ox-accent tracking-wider uppercase">Settings</span>
            <button onClick={onClose} className="toolbar-btn !w-7 !h-7"><X size={14} /></button>
          </div>
          <div className="flex-1 py-2">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`w-full px-4 py-2 flex items-center gap-2 text-sm font-mono transition-colors ${
                  active === id ? "bg-ox-accent/10 text-ox-accent" : "text-ox-text-dim hover:bg-orphix-hover-subtle"
                }`}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 anim-stagger">
          {active === "general" && <GeneralSection />}
          {active === "link" && <LinkSection />}
          {active === "themes" && <ThemesSection onNavigate={setActive} />}
          {active === "fonts" && <FontsSection />}
          {active === "sizing" && <SizingSection />}
          {active === "keybindings" && <KeybindingsSection />}
          {active === "editor" && <EditorSection />}
          {active === "terminal" && <TerminalSection />}
          {active === "about" && <AboutSection />}
        </div>
      </div>
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-ox-accent mb-4">{children}</h3>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-ox-border/30">
      <span className="text-sm text-ox-text-dim">{label}</span>
      {children}
    </div>
  );
}

function GeneralSection() {
  return (
    <div>
      <Title>General</Title>
      <Row label="Application"><span className="text-sm text-ox-text font-mono">Orphix v0.1.0</span></Row>
      <Row label="Platform"><span className="text-sm text-ox-text font-mono">{navigator.platform}</span></Row>
    </div>
  );
}

function LinkSection() {
  const [settings, setSettings] = useState<LinkSettings | null>(null);

  useEffect(() => {
    window.orphix.link.getSettings().then(setSettings).catch(() => {});
  }, []);

  const save = (next: Partial<LinkSettings>) => {
    window.orphix.link.updateSettings(next).then(setSettings).catch(() => {});
  };

  if (!settings) {
    return (
      <div>
        <Title>Link</Title>
        <div className="text-sm text-ox-text-dim">Loading...</div>
      </div>
    );
  }

  const modeOptions: Array<{ value: LinkSettings["transport"]["mode"]; label: string }> = [
    { value: "auto", label: "Auto" },
    { value: "webrtc", label: "Direct P2P" },
    { value: "websocket", label: "Reliable Relay" },
    { value: "local", label: "Local/LAN" },
  ];

  return (
    <div>
      <Title>Link</Title>
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-ox-text-dim">
            <Link2 size={14} />
            <span>Connection Mode</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {modeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => save({ transport: { mode: option.value } })}
                className="px-3 py-2 rounded text-sm font-mono transition-colors"
                style={{
                  border: `1px solid ${settings.transport.mode === option.value ? "var(--orphix-color-primary)" : "var(--orphix-color-base-border)"}`,
                  color: settings.transport.mode === option.value ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)",
                  background: settings.transport.mode === option.value ? "color-mix(in srgb, var(--orphix-color-primary) 12%, transparent)" : "transparent",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-ox-text-dim">
            <Shield size={14} />
            <span>Security</span>
          </div>
          <Row label="End-to-end encryption">
            <ToggleButton
              enabled={settings.encryption.e2ee}
              onClick={() => save({ encryption: { ...settings.encryption, e2ee: !settings.encryption.e2ee } })}
              locked={settings.encryption.securityMode === "E2EE_REQUIRED"}
            />
          </Row>
          <Row label="Allow unencrypted relay traffic">
            <ToggleButton
              enabled={settings.encryption.allowPlainRelay}
              onClick={() => save({ encryption: { ...settings.encryption, allowPlainRelay: !settings.encryption.allowPlainRelay, securityMode: settings.encryption.allowPlainRelay ? "E2EE_REQUIRED" : "DEV_PLAINTEXT_ALLOWED" } })}
            />
          </Row>
          <Row label="Require encrypted relay">
            <ToggleButton
              enabled={settings.websocket.requireE2ee}
              onClick={() => save({ websocket: { ...settings.websocket, requireE2ee: !settings.websocket.requireE2ee } })}
            />
          </Row>
        </div>
      </div>
    </div>
  );
}

function ToggleButton({ enabled, onClick, locked = false }: { enabled: boolean; onClick: () => void; locked?: boolean }) {
  return (
    <button
      onClick={locked ? undefined : onClick}
      className="px-3 py-1 rounded text-sm font-mono transition-colors"
      style={{
        background: enabled ? "color-mix(in srgb, var(--orphix-color-primary) 15%, transparent)" : "transparent",
        color: enabled ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)",
        border: `1px solid ${enabled ? "var(--orphix-color-primary)" : "var(--orphix-color-base-border)"}`,
        opacity: locked ? 0.7 : 1,
      }}
    >
      {enabled ? "On" : "Off"}
    </button>
  );
}

const PRESET_LABELS: Record<string, string> = { xs: "XS", s: "S", m: "M", l: "L", xl: "XL" };

const SIZE_CONTROLS: { key: keyof SizingValues; label: string; min: number; max: number; step: number }[] = [
  { key: "textBase",    label: "Text size",      min: 11, max: 22, step: 1 },
  { key: "textCaption", label: "Caption size",    min: 10, max: 16, step: 1 },
  { key: "textUi",      label: "UI text size",    min: 11, max: 18, step: 1 },
  { key: "textHeading", label: "Heading size",    min: 14, max: 24, step: 1 },
  { key: "icon",        label: "Icon size",       min: 12, max: 24, step: 1 },
  { key: "sidebar",     label: "Sidebar width",   min: 48, max: 100, step: 4 },
  { key: "toolbar",     label: "Toolbar height",  min: 28, max: 52, step: 2 },
  { key: "popupWidth",  label: "Popup width",     min: 20, max: 36, step: 2 },
  { key: "gap",         label: "Gap/spacing",     min: 4,  max: 16, step: 1 },
  { key: "radius",      label: "Border radius",   min: 4,  max: 16, step: 1 },
];

function SizingSection() {
  const { preset, overrides, values, setPreset, setOverride, resetToPreset } = useSizingStore();
  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <div>
      <Title>Sizing</Title>

      {/* Preset picker */}
      <div className="mb-6">
        <div className="text-sm text-ox-text-dim mb-3">Preset</div>
        <div className="flex gap-2">
          {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((id) => (
            <button
              key={id}
              onClick={() => setPreset(id)}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-mono transition-all"
              style={{
                border: `1px solid ${preset === id ? "var(--orphix-color-primary)" : "var(--orphix-color-base-border)"}`,
                background: preset === id ? "color-mix(in srgb, var(--orphix-color-primary) 12%, transparent)" : "transparent",
                color: preset === id ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)",
              }}
            >
              {PRESET_LABELS[id]}
            </button>
          ))}
        </div>
        {hasOverrides && (
          <button
            onClick={resetToPreset}
            className="mt-2 text-sm font-mono transition-colors hover:text-ox-accent"
            style={{ color: "var(--orphix-color-text-subtle)" }}
          >
            Reset to preset
          </button>
        )}
      </div>

      {/* Individual controls */}
      <div className="space-y-3">
        {SIZE_CONTROLS.map(({ key, label, min, max, step }) => (
          <div key={key} className="flex items-center gap-4">
            <span className="text-sm text-ox-text-dim w-32 shrink-0">{label}</span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={values[key]}
              onChange={(e) => setOverride(key, Number(e.target.value))}
              className="flex-1 accent-ox-accent h-1 rounded-full cursor-pointer"
              style={{ accentColor: "var(--orphix-color-primary)" }}
            />
            <span className="text-sm font-mono text-ox-text w-14 text-right">
              {values[key]}{key === "popupWidth" ? "rem" : "px"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FontsSection() {
  const { selectedFont, setSelectedFont, loadingFonts, loadedFonts, ensureFontLoaded } = useTerminalFontStore();
  const { activeTheme } = useTheme();
  const defaultFont = activeTheme.fonts.fonts.families.terminal.family;
  const currentFont = selectedFont ?? defaultFont;
  const [fontSearch, setFontSearch] = useState("");
  const [previewFont, setPreviewFont] = useState<string | null>(null);

  useEffect(() => {
    if (selectedFont) ensureFontLoaded(selectedFont);
  }, [selectedFont]);

  const filteredFonts = MONOSPACE_FONTS.filter((f) =>
    f.name.toLowerCase().includes(fontSearch.toLowerCase())
  );

  return (
    <div>
      <Title>Fonts</Title>

      {/* Current font */}
      <div className="mb-5">
        <div className="text-sm text-ox-text-dim mb-1">Terminal Font</div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-mono text-ox-accent">{currentFont}</span>
          {!selectedFont && <span className="text-xs text-ox-muted/50">(theme default)</span>}
          {selectedFont && (
            <button
              onClick={() => setSelectedFont(null)}
              className="text-xs text-ox-accent hover:underline cursor-pointer ml-2"
            >
              reset
            </button>
          )}
        </div>
      </div>

      {/* Preview */}
      {previewFont && (
        <div className="mb-5 p-4 rounded-xl border border-ox-border bg-ox-bg/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-ox-text-dim">{previewFont}</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setSelectedFont(previewFont); }}
                className="px-3 py-1.5 text-sm font-mono rounded-lg transition-colors"
                style={{
                  border: "1px solid var(--orphix-color-primary)",
                  background: "rgba(50,224,196,0.1)",
                  color: "var(--orphix-color-primary)",
                }}
              >
                Apply
              </button>
              <button
                onClick={() => setPreviewFont(null)}
                className="px-3 py-1.5 text-sm font-mono rounded-lg border border-ox-border text-ox-muted hover:text-ox-text transition-colors"
              >
                Close
              </button>
            </div>
          </div>
          <div
            className="text-sm text-ox-text leading-relaxed p-3 rounded-lg"
            style={{
              fontFamily: loadedFonts.has(previewFont) ? `"${previewFont}", monospace` : undefined,
              background: "var(--orphix-color-base-surface-deep)",
            }}
          >
            <div className="text-ox-accent mb-1 font-bold">The quick brown fox jumps over the lazy dog</div>
            <div>0123456789 !@#$%^&amp;*() {'{}'} [] &lt;&gt; | / ~`</div>
            <div className="text-ox-muted mt-1">
              const greeting = (name: string) =&gt; {'{'}
              <br />&nbsp;&nbsp;return `Hello, ${'{'}name{'}'}!`;
              <br />{'}'};
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-ox-border bg-orphix-hover-subtle mb-4">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ox-muted/40">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={fontSearch}
          onChange={(e) => setFontSearch(e.target.value)}
          placeholder="Search Google Fonts..."
          className="flex-1 bg-transparent text-sm text-ox-text outline-none placeholder:text-ox-muted/30"
        />
        <span className="text-xs text-ox-muted/30 font-mono">{filteredFonts.length} fonts</span>
      </div>

      {/* Google Fonts badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-ox-muted/40">Powered by</span>
        <span className="text-sm font-bold text-ox-accent/60">Google Fonts</span>
      </div>

      {/* Font list */}
      <div className="max-h-[380px] overflow-auto rounded-xl border border-ox-border">
        {/* Default (theme) option */}
        <button
          onClick={() => setSelectedFont(null)}
          className="w-full px-4 py-3 text-sm text-left flex items-center justify-between hover:bg-orphix-hover-subtle transition-colors"
          style={{
            background: !selectedFont ? "color-mix(in srgb, var(--orphix-color-primary) 8%, transparent)" : undefined,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-ox-accent/10 flex items-center justify-center text-ox-accent text-sm font-bold">T</div>
            <div>
              <div className="text-ox-text">{defaultFont}</div>
              <div className="text-xs text-ox-muted/40">Theme default</div>
            </div>
          </div>
          {!selectedFont && <span className="text-ox-accent text-sm">&#10003;</span>}
        </button>

        {/* Google Fonts */}
        {filteredFonts.map((font) => {
          const isLoading = loadingFonts.has(font.name);
          const isLoaded = loadedFonts.has(font.name);
          const isSelected = selectedFont === font.name;

          return (
            <button
              key={font.name}
              onClick={() => setPreviewFont(font.name)}
              className="w-full px-4 py-3 text-sm text-left flex items-center justify-between hover:bg-orphix-hover-subtle transition-colors border-t border-ox-border/20"
              style={{
                background: isSelected ? "color-mix(in srgb, var(--orphix-color-primary) 8%, transparent)" : undefined,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{
                    background: isSelected ? "rgba(50,224,196,0.15)" : "var(--orphix-color-base-surface-elevated)",
                    color: isSelected ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)",
                    fontFamily: isLoaded ? `"${font.name}", monospace` : undefined,
                  }}
                >
                  Aa
                </div>
                <div>
                  <div
                    className="text-ox-text"
                    style={{ fontFamily: isLoaded ? `"${font.name}", monospace` : undefined }}
                  >
                    {font.name}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-ox-muted/40">
                    <span>{font.weights.length} weights</span>
                    {font.variable && (
                      <span className="px-1 py-0.5 rounded bg-ox-accent/10 text-ox-accent/50">variable</span>
                    )}
                    {isLoading && <span className="text-ox-accent animate-pulse">loading...</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSelected && <span className="text-ox-accent text-sm">&#10003;</span>}
                <span className="text-ox-muted/20">&rsaquo;</span>
              </div>
            </button>
          );
        })}

        {filteredFonts.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-ox-muted/40">
            No fonts found for "{fontSearch}"
          </div>
        )}
      </div>
    </div>
  );
}

function ThemesSection({ onNavigate }: { onNavigate: (s: Section) => void }) {
  const {
    activeColorId, activeFontId, activeIconId,
    setColor, setFont, setIcon,
    colorThemes, fontThemes, iconThemes,
    bumpThemeVersion,
  } = useTheme();
  const { installTheme, uninstallTheme, installedIds } = useThemeStore();
  const [tab, setTab] = useState<"colors" | "icons" | "community">("colors");

  return (
    <div>
      <Title>Themes</Title>

      {/* Tab bar */}
      <div className="flex gap-0 mb-4" style={{ borderBottom: "1px solid var(--orphix-color-base-border)" }}>
        {(["colors", "icons", "community"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-1.5 text-sm font-mono uppercase tracking-wider transition-colors"
            style={{
              color: tab === t ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)",
              borderBottom: tab === t ? "2px solid var(--orphix-color-primary)" : "2px solid transparent",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Colors */}
      {tab === "colors" && (
        <div className="space-y-2">
          {colorThemes.map((c) => {
            const isActive = c.id === activeColorId;
            const colors = c.colors;
            return (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg border transition-colors"
                style={{
                  background: colors.base.background,
                  borderColor: isActive ? colors.brand.primary : "var(--orphix-color-base-border)",
                  boxShadow: isActive ? `0 0 0 1px ${colors.brand.primary}33` : "none",
                }}
              >
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded-full" style={{ background: colors.brand.primary }} />
                  <div className="w-4 h-4 rounded-full" style={{ background: colors.brand.secondary }} />
                  <div className="w-4 h-4 rounded-full" style={{ background: colors.brand.accent }} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-mono" style={{ color: colors.text.text }}>{c.name}</div>
                  <div className="text-sm font-mono" style={{ color: colors.text.textMuted }}>{c.id}</div>
                </div>
                {isActive && (
                  <span className="text-sm font-mono px-1.5 py-0.5 rounded" style={{ color: colors.brand.primary, background: `${colors.brand.primary}18` }}>
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Icons */}
      {tab === "icons" && (
        <div className="space-y-2">
          {iconThemes.map((ic) => {
            const isActive = ic.id === activeIconId;
            return (
              <button
                key={ic.id}
                onClick={() => setIcon(ic.id)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg border transition-colors"
                style={{
                  borderColor: isActive ? "var(--orphix-color-primary)" : "var(--orphix-color-base-border)",
                  background: isActive ? "color-mix(in srgb, var(--orphix-color-primary) 5%, transparent)" : "var(--orphix-color-base-surface)",
                }}
              >
                <div className="flex items-center gap-1.5 text-ox-muted">
                  <span className="text-sm">▪</span>
                  <span className="text-sm">●</span>
                  <span className="text-sm">◆</span>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-mono text-ox-text">{ic.name}</div>
                  <div className="text-sm font-mono text-ox-muted">
                    {ic.icons.meta.style} · {ic.icons.meta.defaultSize} · stroke {ic.icons.meta.stroke.regular}
                  </div>
                </div>
                {isActive && (
                  <span className="text-sm font-mono px-1.5 py-0.5 rounded text-ox-accent" style={{ background: "color-mix(in srgb, var(--orphix-color-primary) 10%, transparent)" }}>
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Community themes */}
      {tab === "community" && (
        <div>
          <ThemeStore onOpenFonts={() => onNavigate("fonts")} />
        </div>
      )}
    </div>
  );
}

function KeybindingsSection() {
  const shortcuts = [
    ["Alt + Enter", "Split focused pane"],
    ["Alt + N", "New window"],
    ["Alt + Shift + N", "New workspace"],
    ["Alt + Q", "Close pane"],
    ["Alt + Shift + Q", "Close window"],
    ["Alt + H/L", "Focus pane left/right"],
    ["Alt + K/J", "Focus pane up/down"],
    ["Alt + Shift + ←/→", "Switch window"],
    ["Alt + Shift + ↑/↓", "Switch workspace"],
    ["Alt + 1-9", "Jump to workspace"],
    ["Alt + O", "Toggle overview"],
  ];
  return (
    <div>
      <Title>Keybindings</Title>
      <div className="space-y-1.5">
        {shortcuts.map(([keys, desc]) => (
          <div key={keys} className="flex items-center justify-between py-1">
            <span className="text-ox-accent font-mono text-sm bg-ox-surface/40 px-2 py-0.5 rounded">{keys}</span>
            <span className="text-sm text-ox-text-dim">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TerminalSection() {
  const { selectedFont, setSelectedFont } = useTerminalFontStore();
  const termSettings = useTerminalSettingsStore();
  const { activeTheme } = useTheme();
  const defaultFont = activeTheme.fonts.fonts.families.terminal.family;
  const currentFont = selectedFont ?? defaultFont;

  const headerOptions: { value: TerminalHeaderPosition; label: string }[] = [
    { value: "top", label: "Top" },
    { value: "bottom", label: "Bottom" },
    { value: "hidden", label: "Disabled" },
  ];

  return (
    <div>
      <Title>Terminal</Title>
      <Row label="Font Family">
        <select
          className="bg-transparent border border-ox-border rounded px-2 py-1 text-sm font-mono text-ox-text outline-none"
          value={selectedFont ?? ""}
          onChange={(e) => setSelectedFont(e.target.value || null)}
        >
          <option value="">Theme default ({defaultFont})</option>
          {MONOSPACE_FONTS.map((f) => (
            <option key={f.name} value={f.name} style={{ background: "var(--orphix-color-base-surface)", color: "var(--orphix-color-text)" }}>
              {f.name}
            </option>
          ))}
        </select>
      </Row>
      <Row label="Font Size">
        <span className="text-sm text-ox-text font-mono">{useSizingStore.getState().values.textBase}px</span>
      </Row>
      <Row label="Header Position">
        <div className="flex items-center gap-1">
          {headerOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => termSettings.setHeaderPosition(opt.value)}
              className="px-3 py-1 rounded text-sm font-mono transition-colors"
              style={{
                background: termSettings.headerPosition === opt.value ? "color-mix(in srgb, var(--orphix-color-primary) 15%, transparent)" : "transparent",
                color: termSettings.headerPosition === opt.value ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)",
                border: `1px solid ${termSettings.headerPosition === opt.value ? "var(--orphix-color-primary)" : "var(--orphix-color-base-border)"}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Row>
      <Row label="Cursor Style">
        <span className="text-sm text-ox-text font-mono">Block</span>
      </Row>
      <Row label="Scrollback">
        <span className="text-sm text-ox-text font-mono">10000 lines</span>
      </Row>
      <div className="mt-4 px-1">
        <p className="text-xs text-ox-muted/40">Change fonts in the Fonts section above.</p>
      </div>
    </div>
  );
}

function EditorSection() {
  const settings = useEditorSettingsStore();
  const { activeTheme } = useTheme();
  const defaultFont = activeTheme.fonts.fonts.families.terminal.family;

  return (
    <div>
      <Title>Editor</Title>
      <Row label="Font Family">
        <select
          className="bg-transparent border border-ox-border rounded px-2 py-1 text-sm font-mono text-ox-text outline-none"
          value={settings.fontFamily}
          onChange={(e) => settings.setFontFamily(e.target.value)}
        >
          <option value="">Theme default ({defaultFont})</option>
          {MONOSPACE_FONTS.map((f) => (
            <option key={f.name} value={f.name} style={{ background: "var(--orphix-color-base-surface)", color: "var(--orphix-color-text)" }}>
              {f.name}
            </option>
          ))}
        </select>
      </Row>
      <Row label="Font Size">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={10}
            max={24}
            step={1}
            value={settings.fontSize}
            onChange={(e) => settings.setFontSize(Number(e.target.value))}
            className="w-32 accent-ox-accent"
          />
          <span className="text-sm text-ox-text font-mono w-8 text-right">{settings.fontSize}</span>
        </div>
      </Row>
      <Row label="Line Height">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1.2}
            max={2.2}
            step={0.1}
            value={settings.lineHeight}
            onChange={(e) => settings.setLineHeight(Number(e.target.value))}
            className="w-32 accent-ox-accent"
          />
          <span className="text-sm text-ox-text font-mono w-8 text-right">{settings.lineHeight.toFixed(1)}</span>
        </div>
      </Row>
      <Row label="Tab Size">
        <div className="flex items-center gap-1">
          {[2, 4].map((size) => (
            <button
              key={size}
              onClick={() => settings.setTabSize(size)}
              className="px-3 py-1 rounded text-sm font-mono transition-colors"
              style={{
                background: settings.tabSize === size ? "color-mix(in srgb, var(--orphix-color-primary) 15%, transparent)" : "transparent",
                color: settings.tabSize === size ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)",
                border: `1px solid ${settings.tabSize === size ? "var(--orphix-color-primary)" : "var(--orphix-color-base-border)"}`,
              }}
            >
              {size}
            </button>
          ))}
        </div>
      </Row>
      <Row label="Word Wrap">
        <button
          onClick={() => settings.setWordWrap(!settings.wordWrap)}
          className="px-3 py-1 rounded text-sm font-mono transition-colors"
          style={{
            background: settings.wordWrap ? "color-mix(in srgb, var(--orphix-color-primary) 15%, transparent)" : "transparent",
            color: settings.wordWrap ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)",
            border: `1px solid ${settings.wordWrap ? "var(--orphix-color-primary)" : "var(--orphix-color-base-border)"}`,
          }}
        >
          {settings.wordWrap ? "On" : "Off"}
        </button>
      </Row>
      <Row label="Open Files">
        <div className="flex items-center gap-1">
          {(["split", "new-window"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => settings.setOpenMode(mode)}
              className="px-3 py-1 rounded text-sm font-mono transition-colors"
              style={{
                background: settings.openMode === mode ? "color-mix(in srgb, var(--orphix-color-primary) 15%, transparent)" : "transparent",
                color: settings.openMode === mode ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)",
                border: `1px solid ${settings.openMode === mode ? "var(--orphix-color-primary)" : "var(--orphix-color-base-border)"}`,
              }}
            >
              {mode === "split" ? "Split" : "New Window"}
            </button>
          ))}
        </div>
      </Row>
    </div>
  );
}

function AboutSection() {
  return (
    <div>
      <Title>About</Title>
      <div className="space-y-4">
        <div>
          <div className="text-lg font-mono text-ox-accent font-bold">Orphix</div>
          <div className="text-sm text-ox-muted font-mono">v0.1.0</div>
        </div>
        <p className="text-sm text-ox-text-dim leading-relaxed">
          Terminal-first, Electron-powered desktop command center for AI coding agents.
          Built with React, xterm.js, and Rust.
        </p>
      </div>
    </div>
  );
}
