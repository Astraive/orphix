import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { useTerminal } from "../hooks/use-terminal";

interface TerminalPaneProps {
  className?: string;
}

export function TerminalPane({ className }: TerminalPaneProps) {
  const { containerRef, session, isReady, createSession, killSession } = useTerminal();

  useEffect(() => {
    createSession();
  }, [createSession]);

  return (
    <div className={cn("flex flex-col h-full w-full", className)}>
      <div className="flex-1 min-h-0">
        <div
          ref={containerRef}
          className="h-full w-full p-2"
        />
      </div>
      {session && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-ox-surface/60 border-t border-ox-border text-xs text-ox-text-dim shrink-0">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                isReady ? "bg-green-400" : "bg-yellow-400"
              )} />
              {session.shell}
            </span>
            <span className="truncate max-w-[300px]">{session.cwd}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>{session.cols}x{session.rows}</span>
            <span className="text-ox-muted">{session.kind}</span>
            <button
              onClick={killSession}
              className="px-2 py-0.5 rounded bg-ox-surface hover:bg-ox-muted/30 transition-colors"
            >
              Kill
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
