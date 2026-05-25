import type { ReactNode } from "react";
import { TerminalRuntimeProvider } from "../../../terminal/renderer/context/TerminalRuntimeProvider";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <TerminalRuntimeProvider>{children}</TerminalRuntimeProvider>;
}
