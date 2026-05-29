import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Save, Code, Eye, Copy, Scissors, Clipboard, Search, FileText } from "lucide-react";
import { useEditorStore, isMarkdownFile } from "../stores/editor-store";
import { useEditorSettingsStore } from "../stores/editor-settings-store";
import { useCanvasStore } from "@/features/workspace/stores/canvas-store";
import { tokenizeRange, getLineCount, type Token } from "../lib/tokenizer";
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

  const { fontSize, fontFamily, tabSize, wordWrap, lineHeight } = useEditorSettingsStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewHeight, setViewHeight] = useState(800);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

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

  // Update cursor position
  const updateCursor = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const text = ta.value.substring(0, pos);
    const lines = text.split("\n");
    setCursorLine(lines.length);
    setCursorCol(lines[lines.length - 1].length + 1);
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
    return (
      <>
        {/* Spacer to push visible lines to correct position */}
        {visibleStart > 0 && <span style={{ display: "block", height: `${visibleStart * lineH}px` }} />}
        {visibleTokens.map((lineTokens, i) => (
          <span key={visibleStart + i}>
            {lineTokens.map((token, j) => (
              <span key={j} className={token.type !== "plain" ? `editor-tok-${token.type}` : undefined}>
                {token.text}
              </span>
            ))}
            {"\n"}
          </span>
        ))}
        {/* Spacer for lines below */}
        {visibleEnd < totalLines && <span style={{ display: "block", height: `${(totalLines - visibleEnd) * lineH}px` }} />}
      </>
    );
  }, [visibleTokens, visibleStart, visibleEnd, totalLines, lineH]);

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
  const gutterWidth = String(totalLines).length * 9 + 20;

  // Handle tab key in textarea
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    }
    updateCursor();
  }, [editorId, tabSize, updateContent, updateCursor]);

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
    <div
      className="flex flex-col h-full min-w-0 min-h-0"
      style={{
        background: "var(--orphix-editor-bg)",
        borderLeft: isActive ? "2px solid var(--orphix-color-primary)" : "2px solid transparent",
      }}
      onClick={onFocus}
      onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
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
                tabSize: tabSize,
                whiteSpace: wordWrap ? "pre-wrap" : "pre",
                wordBreak: wordWrap ? "break-word" : "normal",
                overflowX: wordWrap ? "hidden" : "auto",
                overflowY: "auto",
              }}
              value={instance.content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onKeyUp={updateCursor}
              onMouseUp={updateCursor}
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
              minimapWidth={MINIMAP_WIDTH}
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

      {/* Context menu */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-[199]" onClick={() => setCtxMenu(null)} />
          <div
            className="fixed z-[200] min-w-[200px] py-1.5 rounded-xl shadow-xl anim-scale-in"
            style={{
              left: ctxMenu.x, top: ctxMenu.y,
              background: "color-mix(in srgb, var(--orphix-color-base-background) 95%, transparent)",
              border: "1px solid var(--orphix-color-base-border)",
              backdropFilter: "blur(16px)",
            }}
          >
            <CtxItem icon={<Copy size={16} />} label="Copy" shortcut="Ctrl+C" onClick={() => { document.execCommand("copy"); setCtxMenu(null); }} />
            <CtxItem icon={<Scissors size={16} />} label="Cut" shortcut="Ctrl+X" onClick={() => { document.execCommand("cut"); setCtxMenu(null); }} />
            <CtxItem icon={<Clipboard size={16} />} label="Paste" shortcut="Ctrl+V" onClick={async () => { const text = await navigator.clipboard.readText(); if (text) { textareaRef.current?.setRangeText(text, textareaRef.current.selectionStart, textareaRef.current.selectionEnd, "end"); updateContent(editorId, textareaRef.current!.value); } setCtxMenu(null); }} />
            <div className="h-px my-1" style={{ background: "var(--orphix-color-base-border)" }} />
            <CtxItem icon={<Search size={16} />} label="Find" shortcut="Ctrl+F" onClick={() => { setCtxMenu(null); }} />
            <CtxItem icon={<FileText size={16} />} label="Select All" shortcut="Ctrl+A" onClick={() => { textareaRef.current?.select(); setCtxMenu(null); }} />
            <div className="h-px my-1" style={{ background: "var(--orphix-color-base-border)" }} />
            <CtxItem icon={<Save size={16} />} label="Save" shortcut="Ctrl+S" onClick={() => { saveFile(editorId); setCtxMenu(null); }} />
          </div>
        </>
      )}
    </div>
  );
}

function CtxItem({ icon, label, shortcut, onClick }: { icon?: React.ReactNode; label: string; shortcut?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-2 min-h-[32px] text-sm font-mono text-left flex items-center gap-3 hover:bg-ox-accent/10 transition-colors"
      style={{ color: "var(--orphix-color-text-subtle)" }}
    >
      {icon && <span className="w-4 flex items-center justify-center shrink-0">{icon}</span>}
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-ox-muted/50 ml-4 text-xs">{shortcut}</span>}
    </button>
  );
}
