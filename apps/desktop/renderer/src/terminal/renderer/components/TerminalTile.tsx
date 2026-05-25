import { useRef } from "react";
import { cn } from "@/lib/cn";
import { useTerminalStore } from "../stores/terminal-store";
import { useTerminalInstance } from "../hooks/use-terminal-instance";

interface TerminalTileProps {
  terminalId: string;
  isActive: boolean;
  className?: string;
}

export function TerminalTile({ terminalId, isActive, className }: TerminalTileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const session = useTerminalStore((s) => s.sessions.find((ses) => ses.id === terminalId));

  const { terminal, fitAddon, isReady } = useTerminalInstance({
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    sessionId: terminalId,
  });

  if (!session) {
    return (
      <div className={cn("h-full w-full flex items-center justify-center bg-ox-bg text-ox-muted text-sm", className)}>
        Loading terminal...
      </div>
    );
  }

  return (
    <div className={cn("h-full w-full flex flex-col bg-ox-bg", className)}>
      {/* Tile header */}
      <div className="flex items-center gap-2 px-3 py-1 bg-ox-surface/40 border-b border-ox-border text-xs shrink-0">
        <span className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          session.status === "running" ? "bg-green-400" : session.status === "exited" ? "bg-red-400" : "bg-yellow-400",
        )} />
        <span className="text-ox-text-dim font-medium truncate">{session.shell}</span>
        <span className="text-ox-muted truncate hidden sm:inline">{session.cwd}</span>
        <span className="ml-auto text-ox-muted">{session.cols}x{session.rows}</span>
      </div>
      {/* Terminal container */}
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  );
}
