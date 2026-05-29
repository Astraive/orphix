import type { ReactNode } from "react";
import { TerminalRuntimeProvider } from "@/features/terminal/stores/TerminalRuntimeProvider";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <TerminalRuntimeProvider>{children}</TerminalRuntimeProvider>;
}
