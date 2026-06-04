import { TooltipProvider } from "@orphix/ui";
import { AppProviders } from "@/providers/AppProviders";
import { CanvasContainer } from "@/features/workspace/components/CanvasContainer";
import { TerminalRuntimeProvider } from "@/features/terminal/stores/TerminalRuntimeProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { NotificationBridge } from "@/features/notifications/NotificationBridge";

export function App() {
  return (
    <AppProviders>
      <ThemeProvider>
        <TooltipProvider delayDuration={300} skipDelayDuration={150}>
          <TerminalRuntimeProvider>
            <NotificationBridge />
            <CanvasContainer />
          </TerminalRuntimeProvider>
        </TooltipProvider>
      </ThemeProvider>
    </AppProviders>
  );
}
