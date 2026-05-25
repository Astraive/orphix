import { TerminalViewport } from "@terminal/renderer/components/TerminalViewport";

interface TerminalPaneProps {
  paneId: string;
  sessionId: string | null;
  isActive: boolean;
  onFocus: () => void;
}

export function TerminalPane({ sessionId, isActive, onFocus }: TerminalPaneProps) {
  if (!sessionId) {
    return (
      <div
        className="w-full h-full min-w-0 min-h-0 overflow-hidden flex items-center justify-center"
        style={{
          background: "#0D1F23",
          borderRadius: "10px",
          border: "1.5px solid rgba(50, 224, 196, 0.06)",
          boxSizing: "border-box",
        }}
        onClick={onFocus}
      >
        <span className="text-[10px] text-ox-muted/40 font-mono tracking-wider">
          Alt+Enter to open terminal
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onFocus}
      className="w-full h-full min-w-0 min-h-0 overflow-hidden"
      style={{
        position: "relative",
        borderRadius: "10px",
        border: isActive
          ? "1.5px solid rgba(50, 224, 196, 0.9)"
          : "1.5px solid rgba(50, 224, 196, 0.06)",
        background: "#0D1F23",
        cursor: "text",
        transition: "border-color 0.2s",
        boxSizing: "border-box",
        boxShadow: isActive ? "0 0 20px rgba(50, 224, 196, 0.06)" : "none",
      }}
    >
      <TerminalViewport terminalId={sessionId} isActive={isActive} />
    </div>
  );
}
