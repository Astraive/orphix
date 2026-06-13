import { NavLink } from "react-router-dom";
import { Terminal, Monitor, Settings, LogOut, StickyNote, LayoutDashboard, X } from "lucide-react";
import { Button } from "@orphix/ui";
import { Separator } from "@orphix/ui";
import { Avatar, AvatarImage, AvatarFallback } from "@orphix/ui";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@orphix/ui";

interface User {
  id: string;
  githubUsername: string;
  displayName: string | null;
  avatarUrl: string | null;
}

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/devices", label: "Devices", icon: Monitor },
  { href: "/dashboard/notes", label: "Notes", icon: StickyNote },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface Props {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onLogout: () => void;
}

export default function MobileSidebar({ open, onClose, user, onLogout }: Props) {
  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-border px-5 h-14 flex flex-row items-center justify-between space-y-0 p-0">
          <SheetTitle className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Terminal className="h-4 w-4 text-primary" />
            </div>
            <span className="text-base font-semibold tracking-tight text-foreground">Orphix</span>
          </SheetTitle>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X />
          </Button>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Navigation
          </p>
          <div className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <NavLink key={item.href} to={item.href} end={item.href === "/dashboard"}>
                {({ isActive }) => (
                  <div className="relative">
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-primary" />
                    )}
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3 text-sm pl-3"
                      onClick={onClose}
                    >
                      <item.icon data-icon="inline-start" />
                      {item.label}
                    </Button>
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        <Separator />

        <div className="shrink-0 p-3">
          {user && (
            <div className="flex items-center gap-3 rounded-lg p-2">
              <Avatar className="size-8 shrink-0">
                <AvatarImage src={user.avatarUrl ?? undefined} />
                <AvatarFallback className="text-xs">{user.githubUsername[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium leading-none text-foreground">
                  {user.displayName ?? user.githubUsername}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  @{user.githubUsername}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onLogout} className="shrink-0 text-muted-foreground hover:text-destructive">
                <LogOut />
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
