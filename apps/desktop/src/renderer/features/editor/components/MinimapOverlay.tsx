import { memo } from "react";

interface MinimapOverlayProps {
  minimapHeight: number;
  contentHeight: number;
  scrollTop: number;
  viewportHeight: number;
  scrollbarWidth: number;
}

export const MinimapOverlay = memo(function MinimapOverlay({
  minimapHeight,
  contentHeight,
  scrollTop,
  viewportHeight,
  scrollbarWidth,
}: MinimapOverlayProps) {
  if (contentHeight <= 0 || minimapHeight <= 0) return null;

  // Exact mapping: minimap represents the full file, overlay represents the visible viewport
  const minimapScale = minimapHeight / contentHeight;
  const overlayTop = scrollTop * minimapScale;
  const overlayHeight = viewportHeight * minimapScale;

  // Clamp to minimap bounds — don't let it extend past bottom
  const clampedTop = Math.max(0, Math.min(minimapHeight - overlayHeight, overlayTop));
  const clampedHeight = Math.min(overlayHeight, minimapHeight - clampedTop);

  return (
    <div
      className="editor-minimap-viewport"
      style={{
        position: "absolute",
        top: `${clampedTop}px`,
        left: 0,
        right: `${scrollbarWidth}px`,
        height: `${clampedHeight}px`,
        background: "var(--orphix-editor-minimap-viewport)",
        border: "1px solid var(--orphix-editor-minimap-viewport-border)",
        borderRadius: "1px",
        pointerEvents: "none",
        zIndex: 10,
      }}
    />
  );
});
