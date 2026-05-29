import { useEffect, useState } from "react";
import { Download, Trash2, Check, Loader2, ExternalLink, ALargeSmall } from "lucide-react";
import { useThemeStore } from "./theme-store";
import { useTerminalFontStore } from "@/features/terminal/stores/terminal-font-store";
import { MONOSPACE_FONTS } from "@/lib/google-fonts";

interface ThemeStoreProps {
  onOpenFonts?: () => void;
}

export function ThemeStore({ onOpenFonts }: ThemeStoreProps) {
  const {
    available,
    installedIds,
    loading,
    error,
    fetchCatalog,
    installTheme,
    uninstallTheme,
  } = useThemeStore();

  const { selectedFont, loadedFonts, loadingFonts, ensureFontLoaded } = useTerminalFontStore();
  const [fontsExpanded, setFontsExpanded] = useState(false);

  useEffect(() => {
    if (available.length === 0) {
      fetchCatalog();
    }
  }, [available.length, fetchCatalog]);

  // Pre-load a few fonts for the preview
  useEffect(() => {
    MONOSPACE_FONTS.slice(0, 5).forEach((f) => ensureFontLoaded(f.name));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Google Fonts section */}
      <div>
        <button
          onClick={() => setFontsExpanded(!fontsExpanded)}
          className="w-full flex items-center justify-between mb-2"
        >
          <div className="flex items-center gap-2">
            <ALargeSmall size={16} className="text-[var(--orphix-color-primary)]" />
            <span className="text-sm font-mono text-[var(--orphix-color-text)]">
              Google Fonts
            </span>
            {selectedFont && (
              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--orphix-color-primary)_10%,transparent)] text-[var(--orphix-color-primary)]">
                {selectedFont}
              </span>
            )}
          </div>
          <span className="text-sm font-mono text-[var(--orphix-color-text-subtle)]">
            {fontsExpanded ? "▲" : "▼"}
          </span>
        </button>

        {fontsExpanded && (
          <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto rounded-lg border border-[var(--orphix-color-base-border)]">
            {/* Default font */}
            <button
              onClick={onOpenFonts}
              className="flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-[var(--orphix-color-base-surface-hover)] transition-colors"
            >
              <div className="w-6 h-6 rounded bg-[var(--orphix-color-primary)] bg-opacity-10 flex items-center justify-center">
                <span className="text-xs font-bold text-[var(--orphix-color-primary)]">T</span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-mono" style={{ color: "var(--orphix-color-text)" }}>Theme Default</div>
              </div>
              {!selectedFont && <Check size={14} className="text-[var(--orphix-color-primary)]" />}
            </button>

            {/* Google Fonts */}
            {MONOSPACE_FONTS.map((font) => {
              const isActive = selectedFont === font.name;
              const isLoading = loadingFonts.has(font.name);
              const isLoaded = loadedFonts.has(font.name);

              return (
                <button
                  key={font.name}
                  onClick={onOpenFonts}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-[var(--orphix-color-base-surface-hover)] transition-colors"
                >
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                    style={{
                      background: isActive ? "rgba(50,224,196,0.15)" : "var(--orphix-color-base-surface-elevated)",
                      color: isActive ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)",
                      fontFamily: isLoaded ? `"${font.name}", monospace` : undefined,
                    }}
                  >
                    Aa
                  </div>
                  <div className="flex-1">
                    <div
                      className="text-sm font-mono"
                      style={{
                        color: isActive ? "var(--orphix-color-primary)" : "var(--orphix-color-text)",
                        fontFamily: isLoaded ? `"${font.name}", monospace` : undefined,
                      }}
                    >
                      {font.name}
                    </div>
                    <div className="text-xs font-mono" style={{ color: "var(--orphix-color-text-subtle)" }}>
                      {font.weights.length} weights · {font.variable ? "variable" : "static"}
                    </div>
                  </div>
                  {isActive && <Check size={14} className="text-[var(--orphix-color-primary)]" />}
                </button>
              );
            })}

            <div className="px-3 py-2 text-center">
              <button
                onClick={onOpenFonts}
                className="text-xs font-mono text-[var(--orphix-color-primary)] hover:underline"
              >
                Open Fonts Explorer →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-[var(--orphix-color-base-border)]" />

      {/* Community themes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-mono text-[var(--orphix-color-text-muted)]">
            Community Themes
          </span>
          <a
            href="https://github.com/Astraive/orphix-themes"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-mono text-[var(--orphix-color-text-subtle)] hover:text-[var(--orphix-color-primary)] transition-colors"
          >
            <ExternalLink size={14} />
            GitHub
          </a>
        </div>

      {error && (
        <div className="text-sm font-mono text-[var(--orphix-color-danger)] px-2 py-1 rounded"
          style={{ background: "color-mix(in srgb, var(--orphix-color-danger) 10%, transparent)" }}
        >
          {error}
        </div>
      )}

      {loading && available.length === 0 && (
        <div className="flex items-center justify-center py-8 text-[var(--orphix-color-text-muted)]">
          <Loader2 size={16} className="animate-spin" />
        </div>
      )}

      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto anim-stagger">
        {available.map((theme) => {
          const isInstalled = installedIds.has(theme.id);
          return (
            <div
              key={theme.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors"
              style={{
                borderColor: isInstalled
                  ? "color-mix(in srgb, var(--orphix-color-primary) 20%, transparent)"
                  : "var(--orphix-color-base-border)",
                background: isInstalled
                  ? "color-mix(in srgb, var(--orphix-color-primary) 5%, transparent)"
                  : "transparent",
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-mono" style={{ color: "var(--orphix-color-text)" }}>
                  {theme.name}
                </div>
                <div className="text-sm font-mono truncate" style={{ color: "var(--orphix-color-text-subtle)" }}>
                  {theme.description}
                </div>
                {theme.tags && theme.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {theme.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-sm font-mono px-1.5 py-0.5 rounded"
                        style={{
                          color: "var(--orphix-color-text-muted)",
                          background: "var(--orphix-color-base-surface-muted)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => isInstalled ? uninstallTheme(theme.id) : installTheme(theme.id)}
                disabled={loading}
                className="flex items-center gap-1 px-2 py-1 text-sm font-mono rounded transition-colors"
                style={{
                  color: isInstalled ? "var(--orphix-color-text-subtle)" : "var(--orphix-color-primary)",
                  background: isInstalled ? "transparent" : "color-mix(in srgb, var(--orphix-color-primary) 10%, transparent)",
                  border: isInstalled ? "1px solid var(--orphix-color-base-border)" : "none",
                }}
              >
                {loading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : isInstalled ? (
                  <>
                    <Trash2 size={15} />
                    Remove
                  </>
                ) : (
                  <>
                    <Download size={15} />
                    Install
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
