import { cn } from "@/lib/cn";

interface TerminalStatusBarProps {
  shell?: string;
  cwd?: string;
  status?: string;
  className?: string;
}

export function TerminalStatusBar({ shell, cwd, status, className }: TerminalStatusBarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-1 bg-ox-surface/40 border-t border-ox-border text-xs text-ox-text-dim",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {status && (
          <span className={cn(
            "w-1.5 h-1.5 rounded-full",
            status === "running" ? "bg-green-400" : "bg-yellow-400"
          )} />
        )}
        {shell && <span>{shell}</span>}
      </div>
      {cwd && <span className="truncate max-w-[400px]">{cwd}</span>}
    </div>
  );
}
