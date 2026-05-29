import { useRef, useEffect, useCallback, memo } from "react";
import { getLineCount, tokenizeRange, type Token } from "../lib/tokenizer";

// ── Token type → CSS variable mapping ────────────────────────────────
const TOKEN_COLOR_VARS: Record<string, string> = {
  comment: "--orphix-editor-token-comment",
  string: "--orphix-editor-token-string",
  keyword: "--orphix-editor-token-keyword",
  function: "--orphix-editor-token-function",
  type: "--orphix-editor-token-type",
  number: "--orphix-editor-token-number",
  operator: "--orphix-editor-token-operator",
  tag: "--orphix-editor-token-tag",
  attribute: "--orphix-editor-token-attribute",
  error: "--orphix-editor-token-error",
};

function getCssVar(varName: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

// ── Minimap rendering constants ──────────────────────────────────────
const MINIMAP_CHAR_WIDTH = 1.6; // px per character in minimap
const MINIMAP_LINE_HEIGHT = 3;  // px per line in minimap
const MINIMAP_MAX_WIDTH = 140;  // max minimap canvas width

interface MinimapCanvasProps {
  content: string;
  language: string;
  width: number;
  height: number;
  viewportHeight: number;
  contentHeight: number;
  onClick: (targetScrollTop: number) => void;
  onDrag: (targetScrollTop: number) => void;
}

export const MinimapCanvas = memo(function MinimapCanvas({
  content,
  language,
  width,
  height,
  viewportHeight,
  contentHeight,
  onClick,
  onDrag,
}: MinimapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const colorCache = useRef<Map<string, string>>(new Map());
  const lastRenderKey = useRef("");

  // Resolve token colors once per theme change
  const resolveColors = useCallback(() => {
    const cache = new Map<string, string>();
    // Default color for plain text
    const muted = getCssVar("--orphix-editor-muted") || "#888";
    cache.set("plain", muted);

    for (const [tokenType, varName] of Object.entries(TOKEN_COLOR_VARS)) {
      const color = getCssVar(varName) || muted;
      cache.set(tokenType, color);
    }
    colorCache.current = cache;
    return cache;
  }, []);

  // Render the minimap
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = width;
    const h = height;

    // Set canvas size for HiDPI
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
    }

    // Clear
    ctx.clearRect(0, 0, w, h);

    if (!content) return;

    const lines = content.split("\n");
    const totalLines = lines.length;
    if (totalLines === 0) return;

    // Calculate how many minimap pixels per file line
    const minimapLineHeight = Math.max(0.5, Math.min(MINIMAP_LINE_HEIGHT, h / totalLines));

    // Color cache
    const colors = colorCache.current.size > 0 ? colorCache.current : resolveColors();
    const plainColor = colors.get("plain") || "#888";

    // Batch tokenize for syntax colors — only tokenize lines that fit in the canvas
    const maxVisibleMinimapLines = Math.ceil(h / minimapLineHeight);
    const linesToRender = Math.min(totalLines, maxVisibleMinimapLines);

    // For small files, render every line with syntax colors
    // For large files, render plain blocks for performance
    const useSyntaxColors = totalLines <= 5000;

    if (useSyntaxColors) {
      // Tokenize all lines for syntax coloring
      const allTokens = tokenizeRange(content, language, 0, Math.min(totalLines, linesToRender));

      for (let i = 0; i < allTokens.length; i++) {
        const y = i * minimapLineHeight;
        if (y > h) break;

        const lineTokens = allTokens[i];
        let x = 0;

        for (const token of lineTokens) {
          const tokenColor = colors.get(token.type) || plainColor;
          const tokenWidth = token.text.length * MINIMAP_CHAR_WIDTH;

          if (token.type !== "plain" && token.text.trim().length > 0) {
            ctx.fillStyle = tokenColor;
            ctx.globalAlpha = 0.6;
            ctx.fillRect(x, y, Math.min(tokenWidth, w - x), minimapLineHeight);
          } else if (token.text.trim().length > 0) {
            // Plain code — faint block
            ctx.fillStyle = plainColor;
            ctx.globalAlpha = 0.2;
            ctx.fillRect(x, y, Math.min(tokenWidth, w - x), minimapLineHeight);
          }

          x += tokenWidth;
          if (x >= w) break;
        }
      }
    } else {
      // Large file: render simple blocks without tokenization
      for (let i = 0; i < linesToRender; i++) {
        const y = i * minimapLineHeight;
        if (y > h) break;

        const line = lines[i];
        if (line.trim().length === 0) continue;

        // Indentation
        const indent = line.search(/\S/);
        const indentX = indent >= 0 ? indent * MINIMAP_CHAR_WIDTH : 0;
        const lineLen = Math.min(line.length * MINIMAP_CHAR_WIDTH, w - indentX);

        ctx.fillStyle = plainColor;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(indentX, y, lineLen, minimapLineHeight);
      }
    }

    ctx.globalAlpha = 1;
  }, [content, language, width, height, resolveColors]);

  // Re-render when content or dimensions change
  useEffect(() => {
    const key = `${content.length}-${language}-${width}-${height}`;
    if (key !== lastRenderKey.current) {
      lastRenderKey.current = key;
      render();
    }
  }, [content, language, width, height, render]);

  // Re-resolve colors on theme change
  useEffect(() => {
    const observer = new MutationObserver(() => {
      resolveColors();
      lastRenderKey.current = ""; // force re-render
      render();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, [resolveColors, render]);

  // Handle click → scroll to position
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging.current = true;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const y = e.clientY - rect.top;
      const ratio = Math.max(0, Math.min(1, y / height));
      const maxScrollTop = Math.max(0, contentHeight - viewportHeight);
      const targetScrollTop = ratio * contentHeight - viewportHeight / 2;
      onClick(Math.max(0, Math.min(maxScrollTop, targetScrollTop)));

      // Capture pointer for drag
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [height, contentHeight, viewportHeight, onClick],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const y = e.clientY - rect.top;
      const ratio = Math.max(0, Math.min(1, y / height));
      const maxScrollTop = Math.max(0, contentHeight - viewportHeight);
      const targetScrollTop = ratio * contentHeight - viewportHeight / 2;
      onDrag(Math.max(0, Math.min(maxScrollTop, targetScrollTop)));
    },
    [height, contentHeight, viewportHeight, onDrag],
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="editor-minimap-canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        display: "block",
      }}
    />
  );
});
