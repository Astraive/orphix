import { CanvasContainer } from "@/canvas/CanvasContainer";
import { TerminalRuntimeProvider } from "@terminal/renderer/context/TerminalRuntimeProvider";

export function App() {
  return (
    <TerminalRuntimeProvider>
      <CanvasContainer />
    </TerminalRuntimeProvider>
  );
}
