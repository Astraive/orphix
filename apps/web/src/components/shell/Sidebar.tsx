import { NavLink } from "react-router-dom";
import { Terminal, Monitor, Settings, LogOut, StickyNote, LayoutDashboard } from "lucide-react";
import { Button } from "@orphix/ui";
import { Separator } from "@orphix/ui";
import { Avatar, AvatarImage, AvatarFallback } from "@orphix/ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@orphix/ui";

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

export default function Sidebar({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col border-r border-border bg-card">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Terminal className="h-4 w-4 text-primary" />
        </div>
        <span className="text-base font-semibold tracking-tight text-foreground">Orphix</span>
      </div>

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
          <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50">
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={onLogout} className="shrink-0 text-muted-foreground hover:text-destructive">
                  <LogOut />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Log out</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </aside>
  );
}
