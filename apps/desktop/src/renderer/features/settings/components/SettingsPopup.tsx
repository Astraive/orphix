import { useState } from "react";
import { X, User, Palette, Keyboard, Monitor, Info } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";
import { ThemeStore } from "@/features/themes/ThemeStore";
import { useThemeStore } from "@/features/themes/theme-store";

interface SettingsPopupProps {
  onClose: () => void;
}

type Section = "general" | "themes" | "keybindings" | "terminal" | "about";

const SECTIONS: { id: Section; label: string; icon: typeof User }[] = [
  { id: "general", label: "General", icon: User },
  { id: "themes", label: "Themes", icon: Palette },
  { id: "keybindings", label: "Keybindings", icon: Keyboard },
  { id: "terminal", label: "Terminal", icon: Monitor },
  { id: "about", label: "About", icon: Info },
];

export function SettingsPopup({ onClose }: SettingsPopupProps) {
  const [active, setActive] = useState<Section>("general");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative flex overflow-hidden"
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
            <button onClick={onClose} className="toolbar-btn !w-6 !h-6"><X size={12} /></button>
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
        <div className="flex-1 overflow-auto p-6">
          {active === "general" && <GeneralSection />}
          {active === "themes" && <ThemesSection />}
          {active === "keybindings" && <KeybindingsSection />}
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

function ThemesSection() {
  const {
    activeColorId, activeFontId, activeIconId,
    setColor, setFont, setIcon,
    colorThemes, fontThemes, iconThemes,
    bumpThemeVersion,
  } = useTheme();
  const { installTheme, uninstallTheme, installedIds } = useThemeStore();
  const [tab, setTab] = useState<"colors" | "fonts" | "icons" | "community">("colors");

  return (
    <div>
      <Title>Themes</Title>

      {/* Tab bar */}
      <div className="flex gap-0 mb-4" style={{ borderBottom: "1px solid var(--orphix-color-base-border)" }}>
        {(["colors", "fonts", "icons", "community"] as const).map((t) => (
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

      {/* Fonts */}
      {tab === "fonts" && (
        <div className="space-y-2">
          {fontThemes.map((f) => {
            const isActive = f.id === activeFontId;
            return (
              <button
                key={f.id}
                onClick={() => setFont(f.id)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg border transition-colors"
                style={{
                  borderColor: isActive ? "var(--orphix-color-primary)" : "var(--orphix-color-base-border)",
                  background: isActive ? "color-mix(in srgb, var(--orphix-color-primary) 5%, transparent)" : "var(--orphix-color-base-surface)",
                }}
              >
                <div
                  className="text-sm font-mono"
                  style={{ fontFamily: f.fonts.families.mono.family }}
                >
                  Aa
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-mono text-ox-text">{f.name}</div>
                  <div className="text-sm font-mono text-ox-muted">
                    {f.fonts.families.mono.family} · {f.fonts.sizes.terminal}
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
          <ThemeStore />
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
  return (
    <div>
      <Title>Terminal</Title>
      <Row label="Font Size"><span className="text-sm text-ox-text font-mono">12px</span></Row>
      <Row label="Font Family"><span className="text-sm text-ox-text font-mono">JetBrains Mono</span></Row>
      <Row label="Cursor Style"><span className="text-sm text-ox-text font-mono">Block</span></Row>
      <Row label="Scrollback"><span className="text-sm text-ox-text font-mono">5000 lines</span></Row>
      <Row label="Renderer"><span className="text-sm text-ox-text font-mono">WebGL</span></Row>
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
