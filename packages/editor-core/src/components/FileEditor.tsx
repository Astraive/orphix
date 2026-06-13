import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tokenizeRange, getLineCount, findMatchingBracket, type Token } from "../lib/tokenizer";
import type { EditorInstance, EditorStore } from "../stores/editor-store";
import { useEditorSettingsStore } from "../stores/editor-settings-store";

interface FileEditorProps {
  paneId: string;
  filePath: string;
  isActive: boolean;
  onFocus: () => void;
  editorStore: EditorStore;
  onClose?: () => void;
  onSave?: () => void;
  monoFont?: string;
}

const OVERSCAN = 20;

export function FileEditor({ paneId, filePath, isActive, onFocus, editorStore, onClose, onSave, monoFont: monoFontProp }: FileEditorProps) {
  const editorId = paneId;
  const instance = editorStore((s) => s.instances[editorId]);
  const openFile = editorStore((s) => s.openFile);
  const updateContent = editorStore((s) => s.updateContent);
  const saveFile = editorStore((s) => s.saveFile);
  const togglePreview = editorStore((s) => s.togglePreview);

  const { fontSize, fontFamily, tabSize, wordWrap, lineHeight, showLineNumbers, cursorStyle, cursorBlink, cursorWidth } = useEditorSettingsStore();
  const monoFont = monoFontProp || fontFamily || "var(--orphix-font-code, var(--orphix-font-mono, monospace))";

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const [cursorLine, setCursorLine] = useState(1);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewHeight, setViewHeight] = useState(800);
  const [matchBracket, setMatchBracket] = useState<{ a: number; b: number } | null>(null);

  useEffect(() => {
    if (!instance) openFile(editorId, filePath);
  }, [editorId, filePath, instance, openFile]);

  const lineH = useMemo(() => Math.round(fontSize * lineHeight), [fontSize, lineHeight]);
  const totalLines = useMemo(() => instance ? getLineCount(instance.content) : 1, [instance?.content]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    if (gutterRef.current) gutterRef.current.scrollTop = el.scrollTop;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const updateCursor = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const text = ta.value.substring(0, pos);
    const lines = text.split("\n");
    setCursorLine(lines.length);

    const char = ta.value[pos] ?? ta.value[pos - 1];
    if (char && /[(){}\[\]]/.test(char)) {
      const matchPos = char === ta.value[pos] ? pos : pos - 1;
      const match = findMatchingBracket(ta.value, matchPos);
      if (match) {
        let endPos = 0;
        let line = 0;
        let col = 0;
        for (let i = 0; i < ta.value.length; i++) {
          if (line === match.line && col === match.col) { endPos = i; break; }
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveFile(editorId);
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
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + tabSize; });
    } else if (e.key === "Enter") {
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const lineStart = ta.value.lastIndexOf("\n", start - 1) + 1;
      const line = ta.value.substring(lineStart, start);
      const indent = line.match(/^(\s*)/)?.[1] ?? "";
      if (start > 0 && ta.value[start - 1] === "{") {
        e.preventDefault();
        const spaces = " ".repeat(tabSize);
        const insert = `\n${indent}${spaces}\n${indent}`;
        const newValue = ta.value.substring(0, start) + insert + ta.value.substring(start);
        updateContent(editorId, newValue);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 1 + indent.length + tabSize; });
      } else if (indent) {
        e.preventDefault();
        const insert = `\n${indent}`;
        const newValue = ta.value.substring(0, start) + insert + ta.value.substring(start);
        updateContent(editorId, newValue);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + insert.length; });
      }
    }
  }, [editorId, tabSize, updateContent, saveFile]);

  const handleEditorClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && instance) {
      const ta = e.currentTarget;
      const pos = ta.selectionStart;
      const textBefore = ta.value.substring(0, pos);
      const wordMatch = textBefore.match(/[\w.]+$/);
      if (wordMatch) {
        const word = wordMatch[0];
        const allText = instance.content;
        const idx = allText.lastIndexOf(word, pos);
        if (idx !== -1 && idx !== pos - word.length) {
          setCursorLine(allText.substring(0, idx).split("\n").length);
        }
      }
    }
  }, [instance]);

  const visibleStart = Math.max(0, Math.floor(scrollTop / lineH) - OVERSCAN);
  const visibleEnd = Math.min(totalLines, Math.ceil((scrollTop + viewHeight) / lineH) + OVERSCAN);

  const visibleTokens: Token[][] = useMemo(() => {
    if (!instance || visibleEnd - visibleStart <= 0) return [];
    return tokenizeRange(instance.content, instance.language, visibleStart, visibleEnd);
  }, [instance?.content, instance?.language, visibleStart, visibleEnd]);

  const highlightedContent = useMemo(() => {
    const bracketMatchSet = new Set<number>();
    if (matchBracket) {
      bracketMatchSet.add(matchBracket.a);
      bracketMatchSet.add(matchBracket.b);
    }
    let globalOffset = 0;
    return (
      <>
        {visibleStart > 0 && <span style={{ display: "block", height: `${visibleStart * lineH}px` }} />}
        {visibleTokens.map((lineTokens, i) => {
          const lineOffset = globalOffset;
          const spans = lineTokens.map((token, j) => {
            const classes: string[] = [];
            if (token.type !== "plain") classes.push(`editor-tok-${token.type}`);
            if (bracketMatchSet.size > 0 && token.type === "bracket") {
              for (let k = 0; k < token.text.length; k++) {
                if (bracketMatchSet.has(lineOffset + k)) { classes.push("editor-bracket-match"); break; }
              }
            }
            return <span key={j} className={classes.length > 0 ? classes.join(" ") : undefined}>{token.text}</span>;
          });
          globalOffset += lineTokens.reduce((sum, t) => sum + t.text.length, 0) + 1;
          return <span key={visibleStart + i}>{spans}{"\n"}</span>;
        })}
        {visibleEnd < totalLines && <span style={{ display: "block", height: `${(totalLines - visibleEnd) * lineH}px` }} />}
      </>
    );
  }, [visibleTokens, visibleStart, visibleEnd, totalLines, lineH, matchBracket]);

  const gutterContent = useMemo(() => {
    if (!showLineNumbers) return null;
    const lines: React.ReactElement[] = [];
    for (let i = visibleStart; i < visibleEnd; i++) {
      const lineNum = i + 1;
      const isCurrent = lineNum === cursorLine;
      lines.push(
        <div key={lineNum} className="px-2 text-right" style={{
          fontSize: `${fontSize}px`, lineHeight: `${lineH}px`,
          color: isCurrent ? "var(--orphix-editor-text)" : "var(--orphix-editor-muted)",
          background: isCurrent ? "var(--orphix-editor-current-line)" : "transparent",
          height: `${lineH}px`,
        }}>{lineNum}</div>,
      );
    }
    return (
      <>
        {visibleStart > 0 && <div style={{ height: `${visibleStart * lineH}px` }} />}
        {lines}
        {visibleEnd < totalLines && <div style={{ height: `${(totalLines - visibleEnd) * lineH}px` }} />}
      </>
    );
  }, [visibleStart, visibleEnd, cursorLine, fontSize, lineH, showLineNumbers]);

  const gutterWidth = showLineNumbers ? String(totalLines).length * 9 + 20 : 0;

  if (!instance) {
    return <div className="flex items-center justify-center h-full" style={{ background: "var(--orphix-editor-bg)", color: "var(--orphix-editor-muted)" }}><span className="text-sm">Loading...</span></div>;
  }

  const isMd = /\.mdx?$/i.test(filePath);
  const showPreview = instance.previewMode === "preview";

  return (
    <div className="flex flex-col h-full min-w-0 min-h-0" style={{ background: "var(--orphix-editor-bg)", borderLeft: isActive ? "2px solid var(--orphix-editor-caret)" : "2px solid transparent" }} onClick={onFocus}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 shrink-0" style={{ background: "var(--orphix-editor-header-bg)", borderBottom: "1px solid var(--orphix-editor-border)", minHeight: "36px" }}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: instance.dirty ? "var(--orphix-color-warning)" : "transparent" }} />
        <span className="text-sm font-medium truncate" style={{ color: "var(--orphix-editor-text)", fontFamily: monoFont }}>{instance.fileName}</span>
        <span className="text-xs truncate hidden sm:inline" style={{ color: "var(--orphix-editor-muted)", fontFamily: monoFont }}>{filePath}</span>
        <div className="flex-1" />
        {instance.dirty && onSave && (
          <button onClick={() => onSave()} className="px-2 py-1 rounded text-xs font-mono" style={{ color: "var(--orphix-color-primary)", border: "1px solid var(--orphix-color-primary)" }}>
            Save
          </button>
        )}
        {isMd && (
          <button onClick={() => togglePreview(editorId)} className="px-2 py-1 rounded text-xs font-mono" style={{ color: showPreview ? "var(--orphix-color-primary)" : "var(--orphix-editor-muted)" }}>
            {showPreview ? "Code" : "Preview"}
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className="px-2 py-1 rounded text-xs font-mono" style={{ color: "var(--orphix-editor-muted)" }}>×</button>
        )}
      </div>

      {showPreview ? (
        <div className="flex-1 flex items-center justify-center" style={{ background: "var(--orphix-editor-bg)", color: "var(--orphix-editor-muted)" }}>
          <span className="text-sm">Markdown preview not available</span>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 min-w-0" ref={editorWrapRef}>
          {showLineNumbers && (
            <div ref={gutterRef} className="shrink-0 overflow-hidden select-none" style={{ width: `${gutterWidth}px`, background: "var(--orphix-editor-gutter-bg)", borderRight: "1px solid var(--orphix-editor-border)", paddingTop: "8px", paddingBottom: "8px", fontFamily: monoFont }}>
              {gutterContent}
            </div>
          )}
          <div className="flex-1 relative min-w-0 min-h-0">
            <pre ref={preRef} className="absolute inset-0 overflow-hidden pointer-events-none" style={{ fontSize: `${fontSize}px`, lineHeight: `${lineH}px`, fontFamily: monoFont, color: "var(--orphix-editor-text)", margin: 0, padding: "8px", tabSize, whiteSpace: wordWrap ? "pre-wrap" : "pre", wordBreak: wordWrap ? "break-word" : "normal" }} aria-hidden="true">
              {highlightedContent}
            </pre>
            <textarea ref={textareaRef} className="absolute inset-0 w-full h-full" style={{
              fontSize: `${fontSize}px`, lineHeight: `${lineH}px`, fontFamily: monoFont, padding: "8px", tabSize,
              whiteSpace: wordWrap ? "pre-wrap" : "pre", wordBreak: wordWrap ? "break-word" : "normal",
              overflowX: wordWrap ? "hidden" : "auto", overflowY: "auto",
              caretColor: cursorStyle === "line" ? "var(--orphix-editor-caret)" : undefined,
            }}
              value={instance.content}
              onChange={(e) => updateContent(editorId, e.target.value)}
              onKeyDown={handleKeyDown}
              onKeyUp={updateCursor}
              onMouseUp={updateCursor}
              onClick={handleEditorClick}
              onScroll={handleScroll}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              data-gramm="false"
            />
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 shrink-0 text-[10px] font-mono" style={{ background: "var(--orphix-editor-status-bg)", borderTop: "1px solid var(--orphix-editor-border)", color: "var(--orphix-editor-muted)" }}>
        <span>Ln {cursorLine}, Col {instance.content.substring(0, textareaRef.current?.selectionStart ?? 0).split("\n").pop()?.length ?? 0}</span>
        <span>{instance.language}</span>
        <span>UTF-8</span>
      </div>
    </div>
  );
}
