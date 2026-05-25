import { useState, useEffect, useCallback } from "react";
import type { ShellInfo } from "@terminal/shared/types";

interface TerminalPickerProps {
  shells: ShellInfo[];
  onSelect: (shell: ShellInfo) => void;
  onClose: () => void;
}

export function TerminalPicker({ shells, onSelect, onClose }: TerminalPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(shells.length - 1, i + 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (shells[selectedIndex]) {
          onSelect(shells[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [shells, selectedIndex, onSelect, onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative overflow-hidden"
        style={{
          width: "400px",
          borderRadius: "16px",
          background: "rgba(5, 13, 16, 0.97)",
          border: "1px solid var(--ox-border)",
          backdropFilter: "blur(32px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-ox-border">
          <span className="text-xs font-semibold text-ox-accent tracking-wider uppercase font-mono">
            Select Terminal Profile
          </span>
        </div>

        {/* Shell list */}
        <div className="max-h-[300px] overflow-auto py-1">
          {shells.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <span className="text-[10px] text-ox-muted/40 font-mono">No shells found</span>
            </div>
          ) : (
            shells.map((shell, idx) => (
              <button
                key={shell.id}
                onClick={() => onSelect(shell)}
                className="w-full px-4 py-2 flex items-center gap-3 text-left transition-colors"
                style={{
                  background: idx === selectedIndex ? "rgba(50, 224, 196, 0.1)" : "transparent",
                  color: idx === selectedIndex ? "var(--ox-accent)" : "var(--ox-text-dim)",
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                {/* Terminal icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" x2="20" y1="19" y2="19" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono font-medium truncate">{shell.label}</div>
                  <div className="text-[10px] font-mono opacity-50 truncate">
                    {shell.description || [shell.command, ...shell.args].join(" ")}
                  </div>
                </div>
                {idx === selectedIndex && (
                  <span className="text-[9px] text-ox-muted font-mono">Enter</span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-ox-border flex items-center gap-4">
          <span className="text-[9px] text-ox-muted/50 font-mono">↑↓ Navigate</span>
          <span className="text-[9px] text-ox-muted/50 font-mono">Enter Select</span>
          <span className="text-[9px] text-ox-muted/50 font-mono">Esc Close</span>
        </div>
      </div>
    </div>
  );
}
