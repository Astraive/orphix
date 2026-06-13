import { useState, useEffect, useCallback } from "react";
import { X, User, Palette, Keyboard, Monitor, Info, Ruler, ALargeSmall, Code, Link2, Shield, RotateCcw, Download } from "lucide-react";
import { useSizingStore, PRESETS, type PresetId, type SizingValues } from "../stores/sizing-store";
import { useTheme } from "@/providers/ThemeProvider";
import { ThemeStore } from "@/features/themes/ThemeStore";
import { useThemeStore } from "@/features/themes/theme-store";
import { useTerminalFontStore } from "@/features/terminal/stores/terminal-font-store";
import { useTerminalSettingsStore, type TerminalHeaderPosition } from "@/features/terminal/stores/terminal-settings-store";
import { useEditorSettingsStore } from "@/features/editor/stores/editor-settings-store";
import { useFileTreeFontStore } from "@/features/workspace/stores/file-tree-font-store";
import { MONOSPACE_FONTS } from "@/lib/google-fonts";

interface SettingsPopupProps {
  onClose: () => void;
}

type Section = "general" | "link" | "themes" | "colors" | "fonts" | "sizing" | "keybindings" | "editor" | "terminal" | "accessibility" | "about";
type LinkSettings = Window["orphix"] extends { link: { getSettings(): Promise<infer T> } } ? T : never;

const SECTIONS: { id: Section; label: string; icon: typeof User; group?: string }[] = [
  { id: "general", label: "General", icon: User, group: "App" },
  { id: "themes", label: "Themes", icon: Palette, group: "Appearance" },
  { id: "colors", label: "Colors", icon: Palette, group: "Appearance" },
  { id: "fonts", label: "Fonts", icon: ALargeSmall, group: "Appearance" },
  { id: "sizing", label: "Sizing", icon: Ruler, group: "Appearance" },
  { id: "accessibility", label: "Accessibility", icon: Monitor, group: "Appearance" },
  { id: "editor", label: "Editor", icon: Code, group: "Editor & Terminal" },
  { id: "terminal", label: "Terminal", icon: Monitor, group: "Editor & Terminal" },
  { id: "link", label: "Link", icon: Link2, group: "Connection" },
  { id: "keybindings", label: "Keybindings", icon: Keyboard, group: "Connection" },
  { id: "about", label: "About", icon: Info, group: "Info" },
];

export function SettingsPopup({ onClose }: SettingsPopupProps) {
  const [active, setActive] = useState<Section>("general");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center anim-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative flex overflow-hidden anim-pop-in"
        style={{
          width: "860px", height: "640px", borderRadius: "16px",
          background: "color-mix(in srgb, var(--orphix-color-base-background) 95%, transparent)",
          border: "1px solid var(--orphix-color-base-border)",
          backdropFilter: "blur(32px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-[200px] shrink-0 flex flex-col border-r border-ox-border">
          <div className="px-4 py-3 border-b border-ox-border flex items-center justify-between">
            <span className="text-sm font-semibold text-ox-accent tracking-wider uppercase">Settings</span>
            <button onClick={onClose} className="text-ox-muted hover:text-ox-text transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-auto py-2">
            {(() => {
              let lastGroup = "";
              return SECTIONS.map(({ id, label, icon: Icon, group }) => {
                const showGroup = group && group !== lastGroup;
                if (group) lastGroup = group;
                return (
                  <div key={id}>
                    {showGroup && (
                      <div className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-ox-muted/40">
                        {group}
                      </div>
                    )}
                    <button
                      onClick={() => setActive(id)}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors"
                      style={{
                        color: active === id ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)",
                        background: active === id ? "color-mix(in srgb, var(--orphix-color-primary) 8%, transparent)" : "transparent",
                        borderRight: active === id ? `2px solid var(--orphix-color-primary)` : "2px solid transparent",
                      }}
                    >
                      <Icon size={14} />
                      <span>{label}</span>
                    </button>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 anim-stagger">
          {active === "general" && <GeneralSection />}
          {active === "link" && <LinkSection />}
          {active === "themes" && <ThemesSection onNavigate={setActive} />}
          {active === "colors" && <ColorsSection />}
          {active === "fonts" && <FontsSection />}
          {active === "sizing" && <SizingSection />}
          {active === "accessibility" && <AccessibilitySection />}
          {active === "keybindings" && <KeybindingsSection />}
          {active === "editor" && <EditorSection />}
          {active === "terminal" && <TerminalSection />}
          {active === "about" && <AboutSection />}
        </div>
      </div>
    </div>
  );
}

function Title({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-ox-accent">{children}</h3>
      {subtitle && <p className="text-xs text-ox-muted/50 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function SectionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="text-xs font-semibold uppercase tracking-wider text-ox-muted/50 mb-3">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ label, children, description }: { label: string; children: React.ReactNode; description?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-ox-border/20">
      <div className="flex-1 mr-4">
        <span className="text-sm text-ox-text-dim">{label}</span>
        {description && <div className="text-[11px] text-ox-muted/40 mt-0.5">{description}</div>}
      </div>
      {children}
    </div>
  );
}

function ToggleButton({ enabled, onClick, locked = false }: { enabled: boolean; onClick: () => void; locked?: boolean }) {
  return (
    <button
      onClick={locked ? undefined : onClick}
      className="relative w-10 h-5 rounded-full transition-colors"
      style={{
        background: enabled ? "var(--orphix-color-primary)" : "var(--orphix-color-base-border)",
        opacity: locked ? 0.5 : 1,
      }}
    >
      <div
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
        style={{ transform: enabled ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function SliderRow({ label, value, min, max, step, onChange, unit = "", description }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; unit?: string; description?: string;
}) {
  return (
    <Row label={label} description={description}>
      <div className="flex items-center gap-3">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-28 h-1 rounded-full cursor-pointer"
          style={{ accentColor: "var(--orphix-color-primary)" }}
        />
        <span className="text-xs text-ox-text font-mono w-14 text-right tabular-nums">{value}{unit}</span>
      </div>
    </Row>
  );
}

function FontSelect({ value, onChange, defaultLabel }: { value: string; onChange: (v: string) => void; defaultLabel: string }) {
  return (
    <select
      className="bg-transparent border border-ox-border rounded px-2 py-1 text-sm font-mono text-ox-text outline-none max-w-[180px]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{defaultLabel}</option>
      {MONOSPACE_FONTS.map((f) => (
        <option key={f.name} value={f.name} style={{ background: "var(--orphix-color-base-surface)", color: "var(--orphix-color-text)" }}>
          {f.name}
        </option>
      ))}
    </select>
  );
}

function ButtonGroup({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="px-3 py-1 rounded text-sm font-mono transition-colors"
          style={{
            background: value === opt.value ? "color-mix(in srgb, var(--orphix-color-primary) 15%, transparent)" : "transparent",
            color: value === opt.value ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)",
            border: `1px solid ${value === opt.value ? "var(--orphix-color-primary)" : "var(--orphix-color-base-border)"}`,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Row label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border border-ox-border"
        />
        <span className="text-xs text-ox-text font-mono w-20">{value}</span>
      </div>
    </Row>
  );
}

// ── Sections ─────────────────────────────────────────────────────────

function GeneralSection() {
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [startMinimized, setStartMinimized] = useState(false);
  const [showNotifications, setShowNotifications] = useState(true);

  return (
    <div>
      <Title subtitle="Application preferences">General</Title>

      <SectionGroup title="Application">
        <Row label="Version"><span className="text-sm text-ox-text font-mono">v0.1.0</span></Row>
        <Row label="Platform"><span className="text-sm text-ox-text font-mono">{navigator.platform}</span></Row>
        <Row label="Electron"><span className="text-sm text-ox-text font-mono">35.x</span></Row>
        <Row label="Node"><span className="text-sm text-ox-text font-mono">{process?.versions?.node ?? "N/A"}</span></Row>
      </SectionGroup>

      <SectionGroup title="Startup">
        <Row label="Start minimized" description="Launch to system tray">
          <ToggleButton enabled={startMinimized} onClick={() => setStartMinimized(!startMinimized)} />
        </Row>
        <Row label="Check for updates" description="Automatically check on launch">
          <ToggleButton enabled={autoUpdate} onClick={() => setAutoUpdate(!autoUpdate)} />
        </Row>
        <Row label="Show notifications" description="System notifications for events">
          <ToggleButton enabled={showNotifications} onClick={() => setShowNotifications(!showNotifications)} />
        </Row>
      </SectionGroup>

      <SectionGroup title="Data">
        <Row label="Export settings" description="Download all preferences as JSON">
          <button className="px-3 py-1 rounded text-sm font-mono border border-ox-border text-ox-muted hover:text-ox-text transition-colors flex items-center gap-1.5">
            <Download size={12} /> Export
          </button>
        </Row>
        <Row label="Reset all settings" description="Restore defaults">
          <button className="px-3 py-1 rounded text-sm font-mono border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5">
            <RotateCcw size={12} /> Reset
          </button>
        </Row>
      </SectionGroup>
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
        <Title subtitle="Remote connection settings">Link</Title>
        <div className="text-sm text-ox-text-dim">Loading...</div>
      </div>
    );
  }

  const modeOptions: Array<{ value: LinkSettings["transport"]["mode"]; label: string; desc: string }> = [
    { value: "auto", label: "Auto", desc: "Best available" },
    { value: "webrtc", label: "Direct P2P", desc: "Lowest latency" },
    { value: "websocket", label: "Relay", desc: "Most reliable" },
    { value: "local", label: "Local/LAN", desc: "Same network" },
  ];

  return (
    <div>
      <Title subtitle="Remote connection settings">Link</Title>

      <SectionGroup title="Connection Mode">
        <div className="grid grid-cols-2 gap-2 mb-2">
          {modeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => save({ transport: { mode: option.value } })}
              className="px-3 py-2.5 rounded-lg text-left transition-colors"
              style={{
                border: `1px solid ${settings.transport.mode === option.value ? "var(--orphix-color-primary)" : "var(--orphix-color-base-border)"}`,
                background: settings.transport.mode === option.value ? "color-mix(in srgb, var(--orphix-color-primary) 8%, transparent)" : "var(--orphix-color-base-surface)",
              }}
            >
              <div className="text-sm font-mono" style={{ color: settings.transport.mode === option.value ? "var(--orphix-color-primary)" : "var(--orphix-color-text)" }}>
                {option.label}
              </div>
              <div className="text-[11px] text-ox-muted/50 mt-0.5">{option.desc}</div>
            </button>
          ))}
        </div>
      </SectionGroup>

      <SectionGroup title="Security">
        <Row label="End-to-end encryption" description="Encrypt all peer-to-peer traffic">
          <ToggleButton
            enabled={settings.encryption.e2ee}
            onClick={() => save({ encryption: { ...settings.encryption, e2ee: !settings.encryption.e2ee } })}
            locked={settings.encryption.securityMode === "E2EE_REQUIRED"}
          />
        </Row>
        <Row label="Allow unencrypted relay" description="Permit plaintext through relay servers">
          <ToggleButton
            enabled={settings.encryption.allowPlainRelay}
            onClick={() => save({ encryption: { ...settings.encryption, allowPlainRelay: !settings.encryption.allowPlainRelay, securityMode: settings.encryption.allowPlainRelay ? "E2EE_REQUIRED" : "DEV_PLAINTEXT_ALLOWED" } })}
          />
        </Row>
        <Row label="Require encrypted relay" description="Reject relay if not E2E encrypted">
          <ToggleButton
            enabled={settings.websocket.requireE2ee}
            onClick={() => save({ websocket: { ...settings.websocket, requireE2ee: !settings.websocket.requireE2ee } })}
          />
        </Row>
      </SectionGroup>
    </div>
  );
}

function ThemesSection({ onNavigate }: { onNavigate: (s: Section) => void }) {
  const {
    activeColorId, activeFontId, activeIconId,
    setColor, setFont, setIcon,
    colorThemes, fontThemes, iconThemes,
  } = useTheme();
  const [tab, setTab] = useState<"colors" | "icons" | "community">("colors");

  return (
    <div>
      <Title subtitle="Visual appearance">Themes</Title>

      <div className="flex gap-0 mb-5" style={{ borderBottom: "1px solid var(--orphix-color-base-border)" }}>
        {(["colors", "icons", "community"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="px-3 py-1.5 text-sm font-mono uppercase tracking-wider transition-colors" style={{ color: tab === t ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)", borderBottom: tab === t ? "2px solid var(--orphix-color-primary)" : "2px solid transparent" }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "colors" && (
        <div className="space-y-2 max-h-[460px] overflow-auto pr-1">
          {colorThemes.map((c) => {
            const isActive = c.id === activeColorId;
            const colors = c.colors;
            return (
              <button key={c.id} onClick={() => setColor(c.id)} className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all" style={{ background: colors.base.background, borderColor: isActive ? colors.brand.primary : "var(--orphix-color-base-border)", boxShadow: isActive ? `0 0 0 1px ${colors.brand.primary}33, 0 4px 12px ${colors.brand.primary}11` : "none" }}>
                <div className="flex flex-col gap-1">
                  <div className="w-5 h-5 rounded-full" style={{ background: colors.brand.primary }} />
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors.status.success }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors.status.warning }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors.status.danger }} />
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-mono" style={{ color: colors.text.text }}>{c.name}</div>
                  <div className="text-xs font-mono mt-0.5" style={{ color: colors.text.textMuted }}>{colors.mode} · {c.id.split('.')[1]}</div>
                </div>
                {isActive && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ color: colors.brand.primary, background: `${colors.brand.primary}18` }}>
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {tab === "icons" && (
        <div className="space-y-2 max-h-[460px] overflow-auto pr-1">
          {iconThemes.map((ic) => {
            const isActive = ic.id === activeIconId;
            return (
              <button key={ic.id} onClick={() => setIcon(ic.id)} className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all" style={{ borderColor: isActive ? "var(--orphix-color-primary)" : "var(--orphix-color-base-border)", background: isActive ? "color-mix(in srgb, var(--orphix-color-primary) 5%, transparent)" : "var(--orphix-color-base-surface)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--orphix-color-base-surface-elevated)" }}>
                  <div className="flex items-center gap-0.5 text-ox-muted">
                    <span className="text-xs">▪</span>
                    <span className="text-sm">●</span>
                    <span className="text-xs">◆</span>
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-mono text-ox-text">{ic.name}</div>
                  <div className="text-xs font-mono text-ox-muted mt-0.5">{ic.icons.meta.style} · {ic.icons.meta.defaultSize}px · stroke {ic.icons.meta.stroke.regular}</div>
                </div>
                {isActive && <span className="text-xs font-mono px-2 py-0.5 rounded-full text-ox-accent" style={{ background: "color-mix(in srgb, var(--orphix-color-primary) 10%, transparent)" }}>Active</span>}
              </button>
            );
          })}
        </div>
      )}

      {tab === "community" && <ThemeStore onOpenFonts={() => onNavigate("fonts")} />}
    </div>
  );
}

function ColorsSection() {
  const { activeTheme } = useTheme();
  const colors = activeTheme.colors;

  return (
    <div>
      <Title subtitle="Customize individual colors">Colors</Title>

      <SectionGroup title="Brand">
        <ColorPicker label="Primary" value={colors.brand.primary} onChange={() => {}} />
        <ColorPicker label="Secondary" value={colors.brand.secondary} onChange={() => {}} />
        <ColorPicker label="Accent" value={colors.brand.accent} onChange={() => {}} />
      </SectionGroup>

      <SectionGroup title="Status">
        <ColorPicker label="Success" value={colors.status.success} onChange={() => {}} />
        <ColorPicker label="Warning" value={colors.status.warning} onChange={() => {}} />
        <ColorPicker label="Danger" value={colors.status.danger} onChange={() => {}} />
        <ColorPicker label="Info" value={colors.status.info} onChange={() => {}} />
      </SectionGroup>

      <SectionGroup title="Background">
        <ColorPicker label="Background" value={colors.base.background} onChange={() => {}} />
        <ColorPicker label="Surface" value={colors.base.surface} onChange={() => {}} />
        <ColorPicker label="Border" value={colors.base.border} onChange={() => {}} />
      </SectionGroup>

      <SectionGroup title="Text">
        <ColorPicker label="Text" value={colors.text.text} onChange={() => {}} />
        <ColorPicker label="Muted" value={colors.text.textMuted} onChange={() => {}} />
      </SectionGroup>
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
      <Title subtitle="Typography settings">Fonts</Title>

      <div className="mb-5 p-4 rounded-xl border border-ox-border" style={{ background: "var(--orphix-color-base-surface)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-ox-muted/50 uppercase tracking-wider">Current</span>
          {selectedFont && (
            <button onClick={() => setSelectedFont(null)} className="text-xs text-ox-accent hover:underline">Reset to theme</button>
          )}
        </div>
        <div className="text-2xl font-mono text-ox-accent" style={{ fontFamily: loadedFonts.has(currentFont) ? `"${currentFont}", monospace` : undefined }}>
          {currentFont}
        </div>
        <div className="text-xs text-ox-muted/40 mt-1">
          {selectedFont ? "Custom override" : "Inherited from theme"}
        </div>
      </div>

      {previewFont && (
        <div className="mb-5 p-4 rounded-xl border border-ox-border" style={{ background: "var(--orphix-color-base-surface)" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-ox-text-dim">Preview: {previewFont}</span>
            <div className="flex gap-2">
              <button onClick={() => setSelectedFont(previewFont)} className="px-3 py-1.5 text-sm font-mono rounded-lg transition-colors" style={{ border: "1px solid var(--orphix-color-primary)", background: "color-mix(in srgb, var(--orphix-color-primary) 10%, transparent)", color: "var(--orphix-color-primary)" }}>
                Apply
              </button>
              <button onClick={() => setPreviewFont(null)} className="px-3 py-1.5 text-sm font-mono rounded-lg border border-ox-border text-ox-muted hover:text-ox-text transition-colors">
                Close
              </button>
            </div>
          </div>
          <div className="text-sm text-ox-text leading-relaxed p-3 rounded-lg" style={{ fontFamily: loadedFonts.has(previewFont) ? `"${previewFont}", monospace` : undefined, background: "var(--orphix-color-base-surface-deep)" }}>
            <div className="text-ox-accent mb-1 font-bold">The quick brown fox jumps over the lazy dog</div>
            <div>0123456789 !@#$%^&amp;*() {'{}'} [] &lt;&gt; | / ~`</div>
            <div className="text-ox-muted mt-1">const greeting = (name: string) =&gt; {'{'}<br />&nbsp;&nbsp;return `Hello, ${'{'}name{'}'}!`;<br />{'}'};</div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-ox-border mb-4" style={{ background: "var(--orphix-color-base-surface)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ox-muted/40">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input type="text" value={fontSearch} onChange={(e) => setFontSearch(e.target.value)} placeholder="Search Google Fonts..." className="flex-1 bg-transparent text-sm text-ox-text outline-none placeholder:text-ox-muted/30" />
        <span className="text-xs text-ox-muted/30 font-mono">{filteredFonts.length}</span>
      </div>

      <div className="max-h-[340px] overflow-auto rounded-xl border border-ox-border">
        <button onClick={() => setSelectedFont(null)} className="w-full px-4 py-3 text-sm text-left flex items-center justify-between hover:bg-orphix-hover-subtle transition-colors" style={{ background: !selectedFont ? "color-mix(in srgb, var(--orphix-color-primary) 8%, transparent)" : undefined }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-ox-accent/10 flex items-center justify-center text-ox-accent text-sm font-bold">T</div>
            <div>
              <div className="text-ox-text">{defaultFont}</div>
              <div className="text-xs text-ox-muted/40">Theme default</div>
            </div>
          </div>
          {!selectedFont && <span className="text-ox-accent text-sm">&#10003;</span>}
        </button>

        {filteredFonts.map((font) => {
          const isLoaded = loadedFonts.has(font.name);
          const isSelected = selectedFont === font.name;
          return (
            <button key={font.name} onClick={() => setPreviewFont(font.name)} className="w-full px-4 py-3 text-sm text-left flex items-center justify-between hover:bg-orphix-hover-subtle transition-colors border-t border-ox-border/20" style={{ background: isSelected ? "color-mix(in srgb, var(--orphix-color-primary) 8%, transparent)" : undefined }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: isSelected ? "color-mix(in srgb, var(--orphix-color-primary) 15%, transparent)" : "var(--orphix-color-base-surface-elevated)", color: isSelected ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)", fontFamily: isLoaded ? `"${font.name}", monospace` : undefined }}>
                  Aa
                </div>
                <div>
                  <div className="text-ox-text" style={{ fontFamily: isLoaded ? `"${font.name}", monospace` : undefined }}>{font.name}</div>
                  <div className="flex items-center gap-2 text-xs text-ox-muted/40">
                    <span>{font.weights.length} weights</span>
                    {font.variable && <span className="px-1 py-0.5 rounded bg-ox-accent/10 text-ox-accent/50">var</span>}
                  </div>
                </div>
              </div>
              {isSelected && <span className="text-ox-accent text-sm">&#10003;</span>}
            </button>
          );
        })}

        {filteredFonts.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-ox-muted/40">No fonts found</div>
        )}
      </div>
    </div>
  );
}

const PRESET_LABELS: Record<string, string> = { xs: "XS", s: "S", m: "M", l: "L", xl: "XL" };

function SizingSection() {
  const { preset, overrides, values, setPreset, setOverride, resetToPreset } = useSizingStore();
  const hasOverrides = Object.keys(overrides).length > 0;

  const controls: { key: keyof SizingValues; label: string; min: number; max: number; step: number; desc?: string }[] = [
    { key: "textBase", label: "Base text size", min: 11, max: 22, step: 1, desc: "Root font size" },
    { key: "textCaption", label: "Caption size", min: 10, max: 16, step: 1 },
    { key: "textUi", label: "UI text size", min: 11, max: 18, step: 1 },
    { key: "textHeading", label: "Heading size", min: 14, max: 24, step: 1 },
    { key: "icon", label: "Icon size", min: 12, max: 24, step: 1 },
    { key: "sidebar", label: "Sidebar width", min: 48, max: 120, step: 4, desc: "File explorer / panels" },
    { key: "toolbar", label: "Toolbar height", min: 28, max: 52, step: 2 },
    { key: "popupWidth", label: "Popup width", min: 20, max: 40, step: 2, desc: "Settings, dialogs" },
    { key: "gap", label: "Gap / spacing", min: 4, max: 16, step: 1 },
    { key: "radius", label: "Border radius", min: 0, max: 20, step: 1 },
  ];

  return (
    <div>
      <Title subtitle="Adjust spacing and proportions">Sizing</Title>

      <SectionGroup title="Preset">
        <div className="flex gap-2 mb-3">
          {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((id) => (
            <button
              key={id}
              onClick={() => setPreset(id)}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm font-mono transition-all"
              style={{
                border: `1px solid ${preset === id ? "var(--orphix-color-primary)" : "var(--orphix-color-base-border)"}`,
                background: preset === id ? "color-mix(in srgb, var(--orphix-color-primary) 10%, transparent)" : "var(--orphix-color-base-surface)",
                color: preset === id ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)",
              }}
            >
              {PRESET_LABELS[id]}
            </button>
          ))}
        </div>
        {hasOverrides && (
          <button onClick={resetToPreset} className="text-xs text-ox-accent/60 hover:text-ox-accent transition-colors">
            Reset overrides
          </button>
        )}
      </SectionGroup>

      <SectionGroup title="Custom Values">
        {controls.map(({ key, label, min, max, step, desc }) => (
          <SliderRow key={key} label={label} value={values[key]} min={min} max={max} step={step} onChange={(v) => setOverride(key, v)} unit={key === "popupWidth" ? "rem" : "px"} description={desc} />
        ))}
      </SectionGroup>
    </div>
  );
}

function AccessibilitySection() {
  return (
    <div>
      <Title subtitle="Visual comfort settings">Accessibility</Title>

      <SectionGroup title="Motion">
        <Row label="Reduce animations" description="Disable transitions and motion effects">
          <ToggleButton enabled={false} onClick={() => {}} />
        </Row>
        <Row label="Reduce transparency" description="Replace blur effects with solid backgrounds">
          <ToggleButton enabled={false} onClick={() => {}} />
        </Row>
      </SectionGroup>

      <SectionGroup title="Focus">
        <Row label="Focus ring width" description="Width of keyboard focus indicator">
          <div className="flex items-center gap-3">
            <input type="range" min={1} max={4} step={1} value={2} className="w-28 h-1" style={{ accentColor: "var(--orphix-color-primary)" }} />
            <span className="text-xs text-ox-text font-mono w-8 text-right">2px</span>
          </div>
        </Row>
        <Row label="High contrast focus" description="Use stronger focus indicators">
          <ToggleButton enabled={false} onClick={() => {}} />
        </Row>
      </SectionGroup>

      <SectionGroup title="Reading">
        <Row label="Font smoothing" description="Antialiased text rendering">
          <ToggleButton enabled={true} onClick={() => {}} />
        </Row>
        <Row label="Ligatures" description="Enable coding ligatures (fira-code, etc)">
          <ToggleButton enabled={true} onClick={() => {}} />
        </Row>
      </SectionGroup>
    </div>
  );
}

function KeybindingsSection() {
  const shortcuts = [
    { group: "Window", items: [
      ["Alt + Enter", "Split focused pane"],
      ["Alt + N", "New window"],
      ["Alt + Shift + N", "New workspace"],
      ["Alt + Q", "Close pane"],
      ["Alt + Shift + Q", "Close window"],
    ]},
    { group: "Navigation", items: [
      ["Alt + H / L", "Focus pane left / right"],
      ["Alt + K / J", "Focus pane up / down"],
      ["Alt + Shift + ←/→", "Switch window"],
      ["Alt + Shift + ↑/↓", "Switch workspace"],
      ["Alt + 1-9", "Jump to workspace"],
      ["Alt + O", "Toggle overview"],
    ]},
    { group: "Editor", items: [
      ["Ctrl + S", "Save file"],
      ["Ctrl + F", "Find in file"],
      ["Ctrl + Z", "Undo"],
      ["Ctrl + Shift + Z", "Redo"],
      ["Tab", "Insert indent"],
      ["Shift + Tab", "Outdent"],
    ]},
  ];

  return (
    <div>
      <Title subtitle="Keyboard shortcuts reference">Keybindings</Title>

      {shortcuts.map((group) => (
        <SectionGroup key={group.group} title={group.group}>
          {group.items.map(([keys, desc]) => (
            <div key={keys} className="flex items-center justify-between py-1.5">
              <span className="text-ox-accent font-mono text-xs bg-ox-surface/40 px-2 py-0.5 rounded">{keys}</span>
              <span className="text-sm text-ox-text-dim">{desc}</span>
            </div>
          ))}
        </SectionGroup>
      ))}
    </div>
  );
}

function TerminalSection() {
  const termSettings = useTerminalSettingsStore();
  const termFont = useTerminalFontStore();
  const { activeTheme } = useTheme();
  const defaultFont = activeTheme.fonts.fonts.families.terminal.family;

  return (
    <div>
      <Title subtitle="Terminal emulator settings">Terminal</Title>

      <SectionGroup title="Font">
        <Row label="Font Family">
          <FontSelect value={termFont.selectedFont ?? ""} onChange={(v) => termFont.setSelectedFont(v || null)} defaultLabel={`Theme (${defaultFont})`} />
        </Row>
        <SliderRow label="Font Size" value={termSettings.fontSize} min={10} max={24} step={1} onChange={termSettings.setFontSize} unit="px" />
      </SectionGroup>

      <SectionGroup title="Cursor">
        <Row label="Style">
          <ButtonGroup options={[{ value: "block", label: "Block" }, { value: "bar", label: "Bar" }, { value: "underline", label: "Underline" }]} value={termSettings.cursorStyle} onChange={(v) => termSettings.setCursorStyle(v as any)} />
        </Row>
        <Row label="Blink">
          <ToggleButton enabled={termSettings.cursorBlink} onClick={() => termSettings.setCursorBlink(!termSettings.cursorBlink)} />
        </Row>
      </SectionGroup>

      <SectionGroup title="Display">
        <Row label="Header Position">
          <ButtonGroup options={[{ value: "top", label: "Top" }, { value: "bottom", label: "Bottom" }, { value: "hidden", label: "Hidden" }]} value={termSettings.headerPosition} onChange={(v) => termSettings.setHeaderPosition(v as any)} />
        </Row>
        <SliderRow label="Scrollback Lines" value={termSettings.scrollbackLines} min={1000} max={50000} step={1000} onChange={termSettings.setScrollbackLines} />
        <SliderRow label="Opacity" value={termSettings.opacity} min={50} max={100} step={5} onChange={termSettings.setOpacity} unit="%" />
      </SectionGroup>
    </div>
  );
}

function EditorSection() {
  const settings = useEditorSettingsStore();
  const treeFont = useFileTreeFontStore();
  const { activeTheme } = useTheme();
  const defaultCodeFont = activeTheme.fonts.fonts.families.code.family;
  const defaultTerminalFont = activeTheme.fonts.fonts.families.terminal.family;

  return (
    <div>
      <Title subtitle="Code editor settings">Editor</Title>

      <SectionGroup title="Font">
        <Row label="Font Family">
          <FontSelect value={settings.fontFamily} onChange={settings.setFontFamily} defaultLabel={`Theme (${defaultTerminalFont})`} />
        </Row>
        <SliderRow label="Font Size" value={settings.fontSize} min={10} max={24} step={1} onChange={settings.setFontSize} unit="px" />
        <SliderRow label="Line Height" value={settings.lineHeight} min={1.0} max={2.5} step={0.1} onChange={settings.setLineHeight} unit="x" />
      </SectionGroup>

      <SectionGroup title="Indentation">
        <Row label="Tab Size">
          <ButtonGroup options={[{ value: "2", label: "2" }, { value: "4", label: "4" }, { value: "8", label: "8" }]} value={String(settings.tabSize)} onChange={(v) => settings.setTabSize(Number(v))} />
        </Row>
        <Row label="Word Wrap">
          <ToggleButton enabled={settings.wordWrap} onClick={() => settings.setWordWrap(!settings.wordWrap)} />
        </Row>
      </SectionGroup>

      <SectionGroup title="Display">
        <Row label="Show Minimap">
          <ToggleButton enabled={settings.showMinimap} onClick={() => settings.setShowMinimap(!settings.showMinimap)} />
        </Row>
        <Row label="Show Line Numbers">
          <ToggleButton enabled={settings.showLineNumbers} onClick={() => settings.setShowLineNumbers(!settings.showLineNumbers)} />
        </Row>
        <Row label="Render Whitespace" description="Show spaces, tabs, newlines">
          <ToggleButton enabled={settings.renderWhitespace} onClick={() => settings.setRenderWhitespace(!settings.renderWhitespace)} />
        </Row>
        <Row label="Bracket Pair Colorization" description="Color matching brackets">
          <ToggleButton enabled={settings.bracketPairColorization} onClick={() => settings.setBracketPairColorization(!settings.bracketPairColorization)} />
        </Row>
      </SectionGroup>

      <SectionGroup title="Cursor">
        <Row label="Style">
          <ButtonGroup options={[{ value: "block", label: "Block" }, { value: "line", label: "Line" }, { value: "underline", label: "Underline" }]} value={settings.cursorStyle} onChange={(v) => settings.setCursorStyle(v as any)} />
        </Row>
        <Row label="Blink">
          <ToggleButton enabled={settings.cursorBlink} onClick={() => settings.setCursorBlink(!settings.cursorBlink)} />
        </Row>
        <SliderRow label="Width" value={settings.cursorWidth} min={1} max={4} step={1} onChange={settings.setCursorWidth} unit="px" />
      </SectionGroup>

      <SectionGroup title="Behavior">
        <Row label="Open Files">
          <ButtonGroup options={[{ value: "split", label: "Split" }, { value: "new-window", label: "New Window" }]} value={settings.openMode} onChange={(v) => settings.setOpenMode(v as any)} />
        </Row>
      </SectionGroup>

      <div className="my-4 border-t border-ox-border" />
      <Title subtitle="File explorer tree settings">File Tree</Title>

      <SectionGroup title="Font">
        <Row label="Font Family">
          <FontSelect value={treeFont.selectedFont ?? ""} onChange={(v) => treeFont.setSelectedFont(v || null)} defaultLabel={`Theme (${defaultCodeFont})`} />
        </Row>
      </SectionGroup>
    </div>
  );
}

function AboutSection() {
  return (
    <div>
      <Title subtitle="Application information">About</Title>

      <div className="p-5 rounded-xl border border-ox-border mb-6" style={{ background: "var(--orphix-color-base-surface)" }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--orphix-color-primary) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--orphix-color-primary) 20%, transparent)" }}>
            <span className="text-2xl font-bold" style={{ color: "var(--orphix-color-primary)" }}>O</span>
          </div>
          <div>
            <div className="text-xl font-mono font-bold text-ox-accent">Orphix</div>
            <div className="text-sm text-ox-muted font-mono">v0.1.0 · Electron 35.x</div>
          </div>
        </div>
        <p className="text-sm text-ox-text-dim leading-relaxed">
          Terminal-first, Electron-powered desktop command center for AI coding agents.
          Built with React, xterm.js, and Rust.
        </p>
      </div>

      <SectionGroup title="System">
        <Row label="Platform"><span className="text-sm text-ox-text font-mono">{navigator.platform}</span></Row>
        <Row label="User Agent"><span className="text-xs text-ox-text font-mono truncate max-w-[300px] block">{navigator.userAgent.split(') ').pop()}</span></Row>
      </SectionGroup>
    </div>
  );
}
