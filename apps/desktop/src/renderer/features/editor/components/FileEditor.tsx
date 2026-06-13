import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Save, Code, Eye, Copy, Scissors, Clipboard, Search, FileText, ArrowUp, ArrowDown } from "lucide-react";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@orphix/ui";
import { useEditorStore, isMarkdownFile } from "../stores/editor-store";
import { useEditorSettingsStore } from "../stores/editor-settings-store";
import { useEditorRevealStore } from "../stores/editor-reveal-store";
import { useCanvasStore } from "@/features/workspace/stores/canvas-store";
import { resolveDefinition } from "../lib/definition";
import { invoke } from "@/lib/ipc-client";
import { CHANNELS } from "@shared/ipc/channels";
import { tokenizeRange, getLineCount, findMatchingBracket, type Token } from "../lib/tokenizer";
import { MinimapCanvas } from "./MinimapCanvas";
import { EditorScrollbar } from "./EditorScrollbar";
import { MinimapOverlay } from "./MinimapOverlay";

const MarkdownPreview = lazy(() => import("./MarkdownPreview").then((m) => ({ default: m.MarkdownPreview })));

interface FileEditorProps {
  paneId: string;
  filePath: string;
  isActive: boolean;
  onFocus: () => void;
}

// How many extra lines to tokenize above/below viewport
const OVERSCAN = 20;
const MINIMAP_WIDTH = 110; // px — compressed code preview
const SCROLLBAR_WIDTH = 10; // px — overlaid on minimap right edge

export function FileEditor({ paneId, filePath, isActive, onFocus }: FileEditorProps) {
  const editorId = paneId;
  const instance = useEditorStore((s) => s.instances[editorId]);
  const openFile = useEditorStore((s) => s.openFile);
  const updateContent = useEditorStore((s) => s.updateContent);
  const saveFile = useEditorStore((s) => s.saveFile);
  const togglePreview = useEditorStore((s) => s.togglePreview);
  const closeEditorPane = useCanvasStore((s) => s.closeEditorPane);
  const openEditorPane = useCanvasStore((s) => s.openEditorPane);
  const reveal = useEditorRevealStore((s) => s.reveal);
  const revealTarget = useEditorRevealStore((s) => s.target);
  const [ctrlHeld, setCtrlHeld] = useState(false);
  const lastRevealNonce = useRef(0);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);

  const { fontSize, fontFamily, tabSize, wordWrap, lineHeight, showMinimap, showLineNumbers, cursorStyle, cursorBlink, cursorWidth, renderWhitespace } = useEditorSettingsStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewHeight, setViewHeight] = useState(800);
  const [matchBracket, setMatchBracket] = useState<{ a: number; b: number } | null>(null);

  // Load file on mount
  useEffect(() => {
    if (!instance) {
      openFile(editorId, filePath);
    }
  }, [editorId, filePath, instance, openFile]);

  // Keyboard shortcuts
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveFile(editorId);
      }
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [editorId, saveFile]);

  // Track viewport height
  useEffect(() => {
    const el = editorWrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Core dimensions ─────────────────────────────────────────────────
  const lineH = fontSize * lineHeight;
  const totalLines = instance ? getLineCount(instance.content) : 0;
  const contentHeight = totalLines * lineH;
  const maxScrollTop = Math.max(0, contentHeight - viewHeight);

  // ── Scroll sync: textarea → state ──────────────────────────────────
  const handleScroll = useCallback(() => {
    const ta = textareaRef.current;
    const pre = preRef.current;
    const gutter = gutterRef.current;
    if (!ta || !pre || !gutter) return;
    pre.scrollTop = ta.scrollTop;
    pre.scrollLeft = ta.scrollLeft;
    gutter.scrollTop = ta.scrollTop;
    setScrollTop(ta.scrollTop);
  }, []);

  // ── Programmatic scroll (from minimap/scrollbar) → textarea ────────
  const scrollTo = useCallback(
    (nextScrollTop: number) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const clamped = Math.max(0, Math.min(maxScrollTop, nextScrollTop));
      ta.scrollTop = clamped;
      const pre = preRef.current;
      const gutter = gutterRef.current;
      if (pre) pre.scrollTop = clamped;
      if (gutter) gutter.scrollTop = clamped;
      setScrollTop(clamped);
    },
    [maxScrollTop],
  );

  // Minimap click/drag → scroll editor
  const handleMinimapScroll = useCallback(
    (targetScrollTop: number) => {
      scrollTo(targetScrollTop);
    },
    [scrollTo],
  );

  // Scrollbar drag → scroll editor
  const handleScrollbarScroll = useCallback(
    (targetScrollTop: number) => {
      scrollTo(targetScrollTop);
    },
    [scrollTo],
  );

  // Update cursor position and bracket matching
  const updateCursor = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const text = ta.value.substring(0, pos);
    const lines = text.split("\n");
    setCursorLine(lines.length);
    setCursorCol(lines[lines.length - 1].length + 1);

    // Bracket matching — only when cursor is on a bracket
    const char = ta.value[pos] ?? ta.value[pos - 1];
    if (char && /[(){}\[\]]/.test(char)) {
      const matchPos = char === ta.value[pos] ? pos : pos - 1;
      const match = findMatchingBracket(ta.value, matchPos);
      if (match) {
        let endPos = 0;
        let line = 0;
        let col = 0;
        for (let i = 0; i < ta.value.length; i++) {
          if (line === match.line && col === match.col) {
            endPos = i;
            break;
          }
          if (ta.value[i] === "\n") { line++; col = 0; } else { col++; }
        }
        setMatchBracket({ a: matchPos, b: endPos });
      } else {
        setMatchBracket(null);
      }
    } else {
      setMatchBracket(null);
    }
  }, []);

  // Scroll the editor so `line` (1-based) sits ~a third from the top, caret on it.
  const scrollToLine = useCallback((line: number) => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.scrollTop = Math.max(0, (line - 1) * lineH - viewHeight / 3);
    handleScroll();
    let pos = 0;
    for (let i = 1; i < line; i++) {
      const nl = ta.value.indexOf("\n", pos);
      if (nl === -1) { pos = ta.value.length; break; }
      pos = nl + 1;
    }
    ta.focus();
    ta.setSelectionRange(pos, pos);
    setCursorLine(line);
    setCursorCol(1);
  }, [lineH, viewHeight, handleScroll]);

  // Ctrl/Cmd+click → go to definition (local jump or open imported file).
  const handleEditorClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    const ta = textareaRef.current;
    if (!ta || !instance) return;
    const result = resolveDefinition(instance.content, instance.language, ta.selectionStart);
    if (!result) return;
    e.preventDefault();
    if (result.kind === "local") {
      scrollToLine(result.line);
      return;
    }
    void (async () => {
      const res = await invoke<{ path: string | null; line: number }>(
        CHANNELS.EDITOR_GOTO_DEFINITION,
        { fromPath: instance.filePath, specifier: result.specifier, symbol: result.symbol },
      );
      if (!res?.path) return;
      const fileName = res.path.split(/[/\\]/).pop() ?? res.path;
      openEditorPane(res.path, fileName);
      reveal(res.path, res.line);
    })();
  }, [instance, scrollToLine, openEditorPane, reveal]);

  // Consume a cross-pane reveal request targeting this file.
  useEffect(() => {
    if (!instance || !revealTarget) return;
    if (revealTarget.filePath !== filePath) return;
    if (revealTarget.nonce === lastRevealNonce.current) return;
    lastRevealNonce.current = revealTarget.nonce;
    scrollToLine(revealTarget.line);
  }, [revealTarget, instance, filePath, scrollToLine]);

  // Track Ctrl/Cmd for the "clickable identifier" cursor affordance.
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.ctrlKey || e.metaKey) setCtrlHeld(true); };
    const up = (e: KeyboardEvent) => { if (!e.ctrlKey && !e.metaKey) setCtrlHeld(false); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // ── Find (Ctrl+F) ────────────────────────────────────────────────────
  // Select a [start,end) range and scroll it into view. `focusEditor=false`
  // keeps focus in the find box so the user can keep navigating matches.
  const selectRange = useCallback((start: number, end: number, focusEditor: boolean) => {
    const ta = textareaRef.current;
    if (!ta) return;
    let line = 1;
    for (let i = 0; i < start && i < ta.value.length; i++) {
      if (ta.value.charCodeAt(i) === 10) line++;
    }
    ta.scrollTop = Math.max(0, (line - 1) * lineH - viewHeight / 3);
    handleScroll();
    if (focusEditor) ta.focus();
    ta.setSelectionRange(start, end);
    setCursorLine(line);
  }, [lineH, viewHeight, handleScroll]);

  const matches = useMemo(() => {
    if (!findOpen || !findQuery || !instance) return [] as number[];
    const hay = instance.content.toLowerCase();
    const needle = findQuery.toLowerCase();
    const out: number[] = [];
    let idx = hay.indexOf(needle);
    while (idx !== -1 && out.length < 5000) {
      out.push(idx);
      idx = hay.indexOf(needle, idx + Math.max(1, needle.length));
    }
    return out;
  }, [findOpen, findQuery, instance?.content]);

  const gotoMatch = useCallback((i: number, focusEditor = false) => {
    if (matches.length === 0) return;
    const n = ((i % matches.length) + matches.length) % matches.length;
    selectRange(matches[n], matches[n] + findQuery.length, focusEditor);
    setMatchIndex(n);
  }, [matches, findQuery, selectRange]);

  // Jump to the first hit as the query changes (without stealing find-box focus).
  useEffect(() => {
    if (findOpen && matches.length > 0) gotoMatch(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  const openFind = useCallback(() => {
    setFindOpen(true);
    requestAnimationFrame(() => findInputRef.current?.select());
  }, []);

  // Calculate visible line range (for virtualized rendering)
  const visibleStart = Math.max(0, Math.floor(scrollTop / lineH) - OVERSCAN);
  const visibleEnd = Math.min(totalLines, Math.ceil((scrollTop + viewHeight) / lineH) + OVERSCAN);
  const visibleCount = visibleEnd - visibleStart;

  // Tokenize only visible lines
  const visibleTokens: Token[][] = useMemo(() => {
    if (!instance || visibleCount <= 0) return [];
    return tokenizeRange(instance.content, instance.language, visibleStart, visibleEnd);
  }, [instance?.content, instance?.language, visibleStart, visibleEnd]);

  // Render highlighted lines (only visible)
  const highlightedContent = useMemo(() => {
    // Build a set of bracket-match positions (absolute offsets)
    const bracketMatchSet = new Set<number>();
    if (matchBracket) {
      bracketMatchSet.add(matchBracket.a);
      bracketMatchSet.add(matchBracket.b);
    }

    let globalOffset = 0;

    return (
      <>
        {/* Spacer to push visible lines to correct position */}
        {visibleStart > 0 && <span style={{ display: "block", height: `${visibleStart * lineH}px` }} />}
        {visibleTokens.map((lineTokens, i) => {
          const lineOffset = globalOffset;
          const spans = lineTokens.map((token, j) => {
            const isBracketMatch = bracketMatchSet.size > 0 && token.type === "bracket";
            const classes: string[] = [];
            if (token.type !== "plain") classes.push(`editor-tok-${token.type}`);

            // Check if this bracket token is the matched one
            if (isBracketMatch) {
              const tokenStart = lineOffset;
              for (let k = 0; k < token.text.length; k++) {
                if (bracketMatchSet.has(tokenStart + k)) {
                  classes.push("editor-bracket-match");
                  break;
                }
              }
            }

            const result = (
              <span key={j} className={classes.length > 0 ? classes.join(" ") : undefined}>
                {token.text}
              </span>
            );
            return result;
          });
          globalOffset += lineTokens.reduce((sum, t) => sum + t.text.length, 0) + 1; // +1 for \n
          return (
            <span key={visibleStart + i}>
              {spans}
              {"\n"}
            </span>
          );
        })}
        {/* Spacer for lines below */}
        {visibleEnd < totalLines && <span style={{ display: "block", height: `${(totalLines - visibleEnd) * lineH}px` }} />}
      </>
    );
  }, [visibleTokens, visibleStart, visibleEnd, totalLines, lineH, matchBracket]);

  // Gutter line numbers (only visible)
  const gutterContent = useMemo(() => {
    const lines: React.ReactElement[] = [];
    for (let i = visibleStart; i < visibleEnd; i++) {
      const lineNum = i + 1;
      const isCurrent = lineNum === cursorLine;
      lines.push(
        <div
          key={lineNum}
          className="px-2 text-right"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: `${lineH}px`,
            color: isCurrent ? "var(--orphix-editor-text)" : "var(--orphix-editor-muted)",
            background: isCurrent ? "var(--orphix-editor-current-line)" : "transparent",
            height: `${lineH}px`,
          }}
        >
          {lineNum}
        </div>,
      );
    }
    return (
      <>
        {visibleStart > 0 && <div style={{ height: `${visibleStart * lineH}px` }} />}
        {lines}
        {visibleEnd < totalLines && <div style={{ height: `${(totalLines - visibleEnd) * lineH}px` }} />}
      </>
    );
  }, [visibleStart, visibleEnd, cursorLine, fontSize, lineH]);

  // Gutter width
  const gutterWidth = showLineNumbers ? String(totalLines).length * 9 + 20 : 0;

  // Handle tab key in textarea
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
      e.preventDefault();
      openFind();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const spaces = " ".repeat(tabSize);
      const newValue = ta.value.substring(0, start) + spaces + ta.value.substring(end);
      updateContent(editorId, newValue);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + tabSize;
      });
    } else if (e.key === "Enter") {
      // Auto-indent: carry the current line's leading whitespace to the new line.
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const lineStart = ta.value.lastIndexOf("\n", start - 1) + 1;
      const indent = (ta.value.slice(lineStart, start).match(/^[ \t]*/) ?? [""])[0];
      if (indent) {
        e.preventDefault();
        const insert = "\n" + indent;
        const newValue = ta.value.substring(0, start) + insert + ta.value.substring(end);
        updateContent(editorId, newValue);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + insert.length;
        });
      }
    }
    updateCursor();
  }, [editorId, tabSize, updateContent, updateCursor, openFind]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateContent(editorId, e.target.value);
    updateCursor();
  }, [editorId, updateContent, updateCursor]);

  if (!instance) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ background: "var(--orphix-editor-bg)", color: "var(--orphix-editor-muted)" }}
      >
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  const isMd = isMarkdownFile(filePath);
  const showPreview = instance.previewMode === "preview";
  const monoFont = fontFamily || "var(--orphix-font-code, var(--orphix-font-mono))";
  const showScrollbar = maxScrollTop > 0;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
    <div
      className="flex flex-col h-full min-w-0 min-h-0"
      style={{
        background: "var(--orphix-editor-bg)",
        borderLeft: isActive ? "2px solid var(--orphix-color-primary)" : "2px solid transparent",
      }}
      onClick={onFocus}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 shrink-0"
        style={{
          background: "var(--orphix-editor-header-bg)",
          borderBottom: "1px solid var(--orphix-editor-border)",
          minHeight: "36px",
        }}
      >
        {/* Dirty dot */}
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            background: instance.dirty ? "var(--orphix-color-warning)" : "transparent",
          }}
        />

        {/* Filename */}
        <span
          className="text-sm font-medium truncate"
          style={{ color: "var(--orphix-editor-text)", fontFamily: monoFont }}
        >
          {instance.fileName}
        </span>

        {/* Path */}
        <span
          className="text-xs truncate hidden sm:inline"
          style={{ color: "var(--orphix-editor-muted)", fontFamily: monoFont }}
        >
          {filePath}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Save button */}
        {instance.dirty && (
          <button
            onClick={() => saveFile(editorId)}
            className="toolbar-btn !w-6 !h-6"
            title="Save (Ctrl+S)"
            style={{ color: "var(--orphix-color-accent)" }}
          >
            <Save size={14} />
          </button>
        )}

        {/* Preview toggle for markdown */}
        {isMd && (
          <button
            onClick={() => togglePreview(editorId)}
            className="toolbar-btn !w-6 !h-6"
            title={showPreview ? "Raw" : "Preview"}
            style={{
              color: showPreview ? "var(--orphix-color-accent)" : "var(--orphix-editor-muted)",
            }}
          >
            {showPreview ? <Code size={14} /> : <Eye size={14} />}
          </button>
        )}

        {/* Close button */}
        <button
          onClick={() => closeEditorPane(paneId)}
          className="toolbar-btn !w-6 !h-6"
          title="Close"
          style={{ color: "var(--orphix-editor-muted)" }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Preview mode for markdown */}
      {showPreview ? (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center" style={{ background: "var(--orphix-editor-bg)", color: "var(--orphix-editor-muted)" }}><span className="text-sm">Loading preview...</span></div>}>
          <MarkdownPreview content={instance.content} />
        </Suspense>
      ) : (
        <div className="flex-1 flex min-h-0 min-w-0" ref={editorWrapRef}>
          {/* Gutter */}
          <div
            ref={gutterRef}
            className="shrink-0 overflow-hidden select-none editor-scroll"
            style={{
              width: `${gutterWidth}px`,
              background: "var(--orphix-editor-gutter-bg)",
              borderRight: "1px solid var(--orphix-editor-border)",
              paddingTop: "8px",
              paddingBottom: "8px",
              fontFamily: monoFont,
            }}
          >
            {gutterContent}
          </div>

          {/* Editor area */}
          <div className="flex-1 relative min-w-0 min-h-0">
            {/* Find bar (Ctrl+F) */}
            {findOpen && (
              <div
                className="absolute top-2 right-2 z-20 flex items-center gap-1.5 rounded-lg border border-border bg-popover px-2 py-1.5 shadow-xl anim-scale-in"
                style={{ fontFamily: monoFont }}
              >
                <Search size={13} className="text-[var(--orphix-color-text-muted)] shrink-0" />
                <input
                  ref={findInputRef}
                  value={findQuery}
                  onChange={(e) => setFindQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      gotoMatch(matchIndex + (e.shiftKey ? -1 : 1));
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setFindOpen(false);
                      textareaRef.current?.focus();
                    }
                  }}
                  placeholder="Find"
                  spellCheck={false}
                  className="w-40 bg-transparent text-xs outline-none text-[var(--orphix-color-text)] placeholder:text-[var(--orphix-color-text-subtle)]"
                />
                <span className="text-[10px] tabular-nums text-[var(--orphix-color-text-muted)] min-w-[44px] text-right shrink-0">
                  {matches.length ? `${matchIndex + 1}/${matches.length}` : findQuery ? "0/0" : ""}
                </span>
                <button onClick={() => gotoMatch(matchIndex - 1)} disabled={!matches.length} className="toolbar-btn !w-6 !h-6 disabled:opacity-40" title="Previous (Shift+Enter)"><ArrowUp size={13} /></button>
                <button onClick={() => gotoMatch(matchIndex + 1)} disabled={!matches.length} className="toolbar-btn !w-6 !h-6 disabled:opacity-40" title="Next (Enter)"><ArrowDown size={13} /></button>
                <button onClick={() => { setFindOpen(false); textareaRef.current?.focus(); }} className="toolbar-btn !w-6 !h-6" title="Close (Esc)"><X size={13} /></button>
              </div>
            )}
            {/* Highlighted pre (display layer) */}
            <pre
              ref={preRef}
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: `${lineH}px`,
                fontFamily: monoFont,
                color: "var(--orphix-editor-text)",
                margin: 0,
                padding: "8px",
                tabSize: tabSize,
                whiteSpace: wordWrap ? "pre-wrap" : "pre",
                wordBreak: wordWrap ? "break-word" : "normal",
              }}
              aria-hidden="true"
            >
              {highlightedContent}
            </pre>

            {/* Textarea (input layer) */}
            <textarea
              ref={textareaRef}
              className="editor-textarea absolute inset-0 w-full h-full"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: `${lineH}px`,
                fontFamily: monoFont,
                padding: "8px",
                paddingLeft: showLineNumbers ? "8px" : "8px",
                tabSize: tabSize,
                whiteSpace: wordWrap ? "pre-wrap" : "pre",
                wordBreak: wordWrap ? "break-word" : "normal",
                overflowX: wordWrap ? "hidden" : "auto",
                overflowY: "auto",
                caretColor: cursorStyle === "line" ? "var(--orphix-editor-caret)" : cursorStyle === "underline" ? "transparent" : undefined,
                cursor: ctrlHeld ? "pointer" : cursorStyle === "line" ? "text" : undefined,
                textUnderlineOffset: cursorStyle === "underline" ? "0" : undefined,
                textDecoration: cursorStyle === "underline" ? "underline" : undefined,
                textDecorationColor: cursorStyle === "underline" ? "var(--orphix-editor-caret)" : undefined,
                textDecorationThickness: cursorStyle === "underline" ? `${cursorWidth}px` : undefined,
              }}
              value={instance.content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onKeyUp={updateCursor}
              onMouseUp={updateCursor}
              onClick={handleEditorClick}
              onScroll={handleScroll}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
            />
          </div>

          {/* ── Minimap + Scrollbar area ────────────────────────────── */}
          <div
            className="editor-minimap-area shrink-0 hidden lg:block"
            style={{
              position: "relative",
              width: `${MINIMAP_WIDTH}px`,
              height: "100%",
              overflow: "hidden",
              background: "var(--orphix-editor-gutter-bg)",
              borderLeft: "1px solid var(--orphix-editor-border)",
              userSelect: "none",
            }}
          >
            {/* Minimap canvas (full-file compressed preview) */}
            <MinimapCanvas
              content={instance.content}
              language={instance.language}
              width={MINIMAP_WIDTH}
              height={viewHeight}
              viewportHeight={viewHeight}
              contentHeight={contentHeight}
              onClick={handleMinimapScroll}
              onDrag={handleMinimapScroll}
            />

            {/* Viewport highlight overlay */}
            <MinimapOverlay
              minimapHeight={viewHeight}
              contentHeight={contentHeight}
              scrollTop={scrollTop}
              viewportHeight={viewHeight}
              scrollbarWidth={SCROLLBAR_WIDTH}
            />

            {/* Scrollbar thumb (overlays minimap) */}
            <EditorScrollbar
              viewportHeight={viewHeight}
              contentHeight={contentHeight}
              scrollTop={scrollTop}
              onScroll={handleScrollbarScroll}
              visible={showScrollbar}
            />
          </div>
        </div>
      )}

      {/* Status bar */}
      <div
        className="flex items-center gap-4 px-3 py-1 shrink-0 text-xs"
        style={{
          background: "var(--orphix-editor-status-bg)",
          borderTop: "1px solid var(--orphix-editor-border)",
          color: "var(--orphix-editor-muted)",
          fontFamily: monoFont,
          minHeight: "24px",
        }}
      >
        <span>Ln {cursorLine}, Col {cursorCol}</span>
        <span>{instance.language}</span>
        <span>UTF-8</span>
        <span>Spaces: {tabSize}</span>
        {instance.dirty && (
          <span style={{ color: "var(--orphix-color-warning)" }}>Modified</span>
        )}
      </div>

    </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="font-mono">
        <ContextMenuItem onSelect={() => { navigator.clipboard.writeText(document.getSelection()?.toString() ?? ""); }}>
          <Copy size={15} /> Copy <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => { const sel = document.getSelection()?.toString() ?? ""; navigator.clipboard.writeText(sel); textareaRef.current?.setRangeText("", textareaRef.current.selectionStart, textareaRef.current.selectionEnd, "end"); }}>
          <Scissors size={15} /> Cut <ContextMenuShortcut>Ctrl+X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={async () => {
            const text = await navigator.clipboard.readText();
            const ta = textareaRef.current;
            if (text && ta) {
              ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, "end");
              updateContent(editorId, ta.value);
            }
          }}
        >
          <Clipboard size={15} /> Paste <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => textareaRef.current?.select()}>
          <FileText size={15} /> Select All <ContextMenuShortcut>Ctrl+A</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => requestAnimationFrame(openFind)}>
          <Search size={15} /> Find <ContextMenuShortcut>Ctrl+F</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => saveFile(editorId)}>
          <Save size={15} /> Save <ContextMenuShortcut>Ctrl+S</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
