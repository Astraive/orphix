import { AppProviders } from "@/providers/AppProviders";
import { CanvasContainer } from "@/features/workspace/components/CanvasContainer";
import { TerminalRuntimeProvider } from "@/features/terminal/stores/TerminalRuntimeProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";

export function App() {
  return (
    <AppProviders>
      <ThemeProvider>
        <TerminalRuntimeProvider>
          <CanvasContainer />
        </TerminalRuntimeProvider>
      </ThemeProvider>
    </AppProviders>
  );
}
