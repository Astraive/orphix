import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Terminal as XtermTerminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import type { SearchAddon } from "@xterm/addon-search";
import { useTerminalRuntime } from "../hooks/useTerminalRuntime";
import { useTerminalFit } from "../hooks/useTerminalFit";
import { createXterm } from "../xterm/createXterm";
import { useTheme } from "@/providers/ThemeProvider";
import { DEFAULT_TERMINAL_CONFIG } from "@/config/terminal";
import { useTerminalFontStore } from "../stores/terminal-font-store";
import type { TerminalSessionSnapshot } from "@shared/terminal/types";

interface TerminalViewportProps {
  terminalId: string;
  isActive: boolean;
}

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 32;
const FONT_STEP = 1;
const WHEEL_FONT_STEP = 1;

const getStatusLabel = (
  session: TerminalSessionSnapshot | undefined,
): string => {
  if (!session) return "starting...";
  if (session.status === "running") return "";
  if (session.status === "exited") return `exited (${session.exitCode ?? 0})`;
  if (session.status === "error") return session.errorMessage ?? "failed to start";
  return "starting...";
};

// Ctrl+Shift+C = copy (Ctrl+C is always SIGINT in a terminal)
const isCopyShortcut = (event: KeyboardEvent): boolean =>
  event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "c";

// Ctrl+V and Ctrl+Shift+V = paste (handled natively by xterm's hidden textarea;
// we do NOT intercept these here — the custom handler only exists for copy + zoom)

export const TerminalViewport: React.FC<TerminalViewportProps> = ({ terminalId, isActive }) => {
  const { sessions, getBufferedOutput, registerOutputSink, writeTerminal, resizeTerminal } = useTerminalRuntime();
  const { activeTheme, xtermTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<XtermTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const fontSizeRef = useRef<number>(14);
  const bootstrappedRef = useRef(false);
  const hideScrollbarTimerRef = useRef<number | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [fitVersion, setFitVersion] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const session = sessions[terminalId];

  const adjustFontSize = useCallback((delta: number) => {
    const terminal = xtermRef.current;
    const fitAddon = fitAddonRef.current;
    if (!terminal || !fitAddon) return;
    const next = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, fontSizeRef.current + delta));
    if (next === fontSizeRef.current) return;
    fontSizeRef.current = next;
    terminal.options.fontSize = next;
    fitAddon.fit();
    try { localStorage.setItem("orphix-terminal-font-size", String(next)); } catch {}
  }, []);

  const handleFitResize = useCallback(({ cols, rows }: { cols: number; rows: number }) => {
    resizeTerminal({ terminalId, cols, rows }).catch(() => {});
  }, [resizeTerminal, terminalId]);

  useTerminalFit({
    containerRef,
    terminalRef: xtermRef,
    fitAddonRef,
    onResize: handleFitResize,
    version: fitVersion,
  });

  // Create xterm and wire up I/O
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const terminalFont = activeTheme.fonts.fonts.families.terminal;
    const themeFontSize = Number.parseInt(activeTheme.fonts.fonts.sizes.terminal, 10);
    const terminalFontStore = useTerminalFontStore.getState();
    if (terminalFontStore.selectedFont) {
      terminalFontStore.ensureFontLoaded(terminalFontStore.selectedFont);
    }
    const resolvedFontFamily = terminalFontStore.getFontFamily(terminalFont.family);
    let initialFontSize = themeFontSize;
    try {
      const saved = localStorage.getItem("orphix-terminal-font-size");
      if (saved) { const n = Number(saved); if (n >= MIN_FONT_SIZE && n <= MAX_FONT_SIZE) initialFontSize = n; }
    } catch {}
    fontSizeRef.current = initialFontSize;
    const { terminal, fitAddon, searchAddon } = createXterm({
      theme: xtermTheme,
      fontFamily: resolvedFontFamily,
      fontSize: initialFontSize,
      lineHeight: Number.parseFloat(terminalFont.lineHeight ?? "1.25"),
      scrollback: DEFAULT_TERMINAL_CONFIG.scrollback,
    });
    terminal.open(container);
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;
    setFitVersion((version) => version + 1);

    terminal.attachCustomKeyEventHandler((event) => {
      if (event.type !== "keydown") return true;

      // Ctrl+- / Ctrl+=: zoom terminal text
      if (event.ctrlKey && !event.shiftKey && !event.altKey) {
        if (event.key === "-" || event.key === "_") {
          adjustFontSize(-FONT_STEP);
          return false;
        }
        if (event.key === "=" || event.key === "+") {
          adjustFontSize(FONT_STEP);
          return false;
        }
      }

      if (isCopyShortcut(event)) {
        if (terminal.hasSelection()) {
          navigator.clipboard.writeText(terminal.getSelection()).catch(() => {});
        }
        // Ctrl+Shift+C never sends SIGINT — always consume
        return false;
      }

      // Ctrl+Shift+F: open terminal search
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "f") {
        setSearchOpen(true);
        return false;
      }

      return true;
    });

    // Replay buffered output for late-joining xterm instances
    const buffered = getBufferedOutput(terminalId);
    if (buffered) {
      terminal.write(buffered);
    }

    // Register output sink for live data
    const detachOutput = registerOutputSink(terminalId, (data) => {
      terminal.write(data);
    });

    // Keyboard input -> PTY
    const inputDisposable = terminal.onData((data) => {
      writeTerminal({ terminalId, data }).catch(() => {});
    });

    // Scroll activity for custom scrollbar styling
    const viewport = container.querySelector(".xterm-viewport");
    const onViewportActivity = (): void => {
      setIsScrolling(true);
      if (hideScrollbarTimerRef.current !== null) {
        window.clearTimeout(hideScrollbarTimerRef.current);
      }
      hideScrollbarTimerRef.current = window.setTimeout(() => {
        setIsScrolling(false);
        hideScrollbarTimerRef.current = null;
      }, 700);
    };
    if (viewport instanceof HTMLElement) {
      viewport.addEventListener("wheel", onViewportActivity, { passive: true });
      viewport.addEventListener("scroll", onViewportActivity, { passive: true });
    }

    // Ctrl+scroll: zoom terminal text
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      adjustFontSize(e.deltaY < 0 ? WHEEL_FONT_STEP : -WHEEL_FONT_STEP);
    };
    container.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      if (viewport instanceof HTMLElement) {
        viewport.removeEventListener("wheel", onViewportActivity);
        viewport.removeEventListener("scroll", onViewportActivity);
      }
      container.removeEventListener("wheel", onWheel);
      if (hideScrollbarTimerRef.current !== null) {
        window.clearTimeout(hideScrollbarTimerRef.current);
        hideScrollbarTimerRef.current = null;
      }
      inputDisposable.dispose();
      detachOutput();
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      searchAddonRef.current = null;
      bootstrappedRef.current = false;
    };
  }, [terminalId, getBufferedOutput, registerOutputSink, writeTerminal]);

  // Focus when active
  useEffect(() => {
    if (isActive && xtermRef.current) {
      xtermRef.current.focus();
    }
  }, [isActive]);

  const statusLabel = getStatusLabel(session);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  }, [searchOpen]);

  const handleSearch = useCallback((text: string, direction: "next" | "previous") => {
    const sa = searchAddonRef.current;
    if (!sa || !text) return;
    if (direction === "next") {
      sa.findNext(text);
    } else {
      sa.findPrevious(text);
    }
  }, []);

  const handleSearchClose = useCallback(() => {
    const sa = searchAddonRef.current;
    if (sa) sa.clearDecorations();
    setSearchOpen(false);
    setSearchText("");
    xtermRef.current?.focus();
  }, []);

  return (
    <div className={`relative w-full h-full terminal-viewport-shell ${isScrolling ? "is-scrolling" : ""}`}>
      {searchOpen && (
        <div
          className="absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded-md px-2 py-1.5 shadow-md"
          style={{
            background: "var(--orphix-terminal-status-bg)",
            border: "1px solid var(--orphix-terminal-border, rgba(255,255,255,0.1))",
          }}
        >
          <input
            ref={searchInputRef}
            type="text"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              handleSearch(e.target.value, "next");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch(searchText, e.shiftKey ? "previous" : "next");
              } else if (e.key === "Escape") {
                handleSearchClose();
              }
            }}
            placeholder="Search..."
            className="w-48 bg-transparent text-sm outline-none"
            style={{ color: "var(--orphix-terminal-status-fg)" }}
          />
          <button
            onClick={() => handleSearch(searchText, "previous")}
            className="px-1 text-xs opacity-70 hover:opacity-100"
            style={{ color: "var(--orphix-terminal-status-fg)" }}
            title="Previous (Shift+Enter)"
          >
            ▲
          </button>
          <button
            onClick={() => handleSearch(searchText, "next")}
            className="px-1 text-xs opacity-70 hover:opacity-100"
            style={{ color: "var(--orphix-terminal-status-fg)" }}
            title="Next (Enter)"
          >
            ▼
          </button>
          <button
            onClick={handleSearchClose}
            className="px-1 text-xs opacity-70 hover:opacity-100"
            style={{ color: "var(--orphix-terminal-status-fg)" }}
            title="Close (Escape)"
          >
            ✕
          </button>
        </div>
      )}
      <div ref={containerRef} className="terminal-xterm-host" />
      {statusLabel && (
        <div
          className="absolute right-2 bottom-1.5 rounded px-1.5 py-0.5 text-sm font-mono tracking-wider pointer-events-none"
          style={{
            color: "var(--orphix-terminal-status-fg)",
            background: "var(--orphix-terminal-status-bg)",
          }}
        >
          {statusLabel}
        </div>
      )}
    </div>
  );
};
