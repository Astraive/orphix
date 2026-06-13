import { useEffect } from "react";
import { Bell, CheckCheck, CircleAlert, CircleCheckBig, Info, Terminal, Trash2, TriangleAlert } from "lucide-react";
import { Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Separator } from "@orphix/ui";
import {
  getWebUnreadCount,
  useWebNotificationStore,
  type WebNotification,
} from "./notification-store";

function formatAge(value: string): string {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function severityIcon(severity: WebNotification["severity"]) {
  switch (severity) {
    case "error":
      return <CircleAlert className="h-4 w-4 text-destructive" />;
    case "warning":
      return <TriangleAlert className="h-4 w-4 text-accent" />;
    case "success":
      return <CircleCheckBig className="h-4 w-4 text-primary" />;
    case "info":
    default:
      return <Info className="h-4 w-4 text-muted-foreground" />;
  }
}

export function NotificationBell() {
  const notifications = useWebNotificationStore((state) => state.notifications);
  const markAllRead = useWebNotificationStore((state) => state.markAllRead);
  const clear = useWebNotificationStore((state) => state.clear);
  const unreadCount = getWebUnreadCount(notifications);

  useEffect(() => {
    const baseTitle = "Orphix";
    document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;
  }, [unreadCount]);

  return (
    <Dialog onOpenChange={(open) => { if (open) markAllRead(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[75vh] overflow-hidden sm:max-w-xl">
        <DialogHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-2">
            <DialogTitle>Notifications</DialogTitle>
            {unreadCount > 0 && <Badge>{unreadCount} unread</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
              <CheckCheck className="mr-1 h-4 w-4" />
              Read
            </Button>
            <Button variant="ghost" size="sm" onClick={clear} disabled={notifications.length === 0}>
              <Trash2 className="mr-1 h-4 w-4" />
              Clear
            </Button>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
              <Bell className="h-5 w-5" />
              No recent activity.
            </div>
          ) : (
            notifications.map((notification, index) => (
              <div key={notification.id}>
                <div className={`flex items-start gap-3 px-1 py-3 ${notification.read ? "" : "rounded-lg bg-primary/5"}`}>
                  <div className="mt-0.5">{severityIcon(notification.severity)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{notification.title}</p>
                      {!notification.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatAge(notification.createdAt)}</span>
                      {notification.terminalId && (
                        <span className="inline-flex items-center gap-1">
                          <Terminal className="h-3 w-3" />
                          {notification.terminalId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {index < notifications.length - 1 && <Separator />}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
