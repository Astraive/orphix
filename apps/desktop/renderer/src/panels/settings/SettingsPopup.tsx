import { useState } from "react";
import { X, User, Palette, Keyboard, Monitor, Info } from "lucide-react";

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
          background: "rgba(5, 13, 16, 0.95)",
          border: "1px solid var(--ox-border)",
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
                className={`w-full px-4 py-2 flex items-center gap-2 text-xs font-mono transition-colors ${
                  active === id ? "bg-ox-accent/10 text-ox-accent" : "text-ox-text-dim hover:bg-white/5"
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
      <span className="text-xs text-ox-text-dim">{label}</span>
      {children}
    </div>
  );
}

function GeneralSection() {
  return (
    <div>
      <Title>General</Title>
      <Row label="Application"><span className="text-xs text-ox-text font-mono">Orphix v0.1.0</span></Row>
      <Row label="Platform"><span className="text-xs text-ox-text font-mono">{navigator.platform}</span></Row>
    </div>
  );
}

function ThemesSection() {
  const themes = [
    { id: "default", name: "Orphix Default", bg: "#050D10", accent: "#32E0C4", secondary: "#0D7377" },
    { id: "abyss-green", name: "Abyss Green", bg: "#040D12", accent: "#93B1A6", secondary: "#183D3D" },
  ];
  return (
    <div>
      <Title>Themes</Title>
      <div className="space-y-3">
        {themes.map((t) => (
          <button key={t.id} className="w-full flex items-center gap-3 p-3 rounded-lg border border-ox-border hover:border-ox-accent/30 transition-colors" style={{ background: t.bg }}>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded-full" style={{ background: t.accent }} />
              <div className="w-4 h-4 rounded-full" style={{ background: t.secondary }} />
            </div>
            <div className="flex-1 text-left">
              <div className="text-xs text-ox-text font-mono">{t.name}</div>
              <div className="text-[10px] text-ox-muted font-mono">{t.bg} · {t.accent}</div>
            </div>
          </button>
        ))}
      </div>
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
            <span className="text-ox-accent font-mono text-[10px] bg-ox-surface/40 px-2 py-0.5 rounded">{keys}</span>
            <span className="text-xs text-ox-text-dim">{desc}</span>
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
      <Row label="Font Size"><span className="text-xs text-ox-text font-mono">12px</span></Row>
      <Row label="Font Family"><span className="text-xs text-ox-text font-mono">JetBrains Mono</span></Row>
      <Row label="Cursor Style"><span className="text-xs text-ox-text font-mono">Block</span></Row>
      <Row label="Scrollback"><span className="text-xs text-ox-text font-mono">5000 lines</span></Row>
      <Row label="Renderer"><span className="text-xs text-ox-text font-mono">WebGL</span></Row>
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
          <div className="text-xs text-ox-muted font-mono">v0.1.0</div>
        </div>
        <p className="text-xs text-ox-text-dim leading-relaxed">
          Terminal-first, Electron-powered desktop command center for AI coding agents.
          Built with React, xterm.js, and Rust.
        </p>
      </div>
    </div>
  );
}
