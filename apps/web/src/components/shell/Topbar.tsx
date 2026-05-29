import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Home",
  "/dashboard/devices": "Devices",
  "/dashboard/notes": "Notes",
  "/dashboard/settings": "Settings",
};

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? "Orphix";

  return (
    <div className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card/80 backdrop-blur-sm px-4">
      <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onMenuClick}>
        <Menu className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium text-foreground lg:hidden">Orphix</span>
      <div className="hidden lg:flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
    </div>
  );
}
