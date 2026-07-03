import { Bell, CheckCheck, CircleAlert, CircleCheckBig, Info, TerminalSquare, Trash2, TriangleAlert } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Separator } from "@orphix/ui";
import {
  getUnreadCount,
  useNotificationStore,
  type DesktopNotification,
} from "./notification-store";

function formatRelativeTime(value: string): string {
  const deltaMs = Date.now() - new Date(value).getTime();
  const deltaMinutes = Math.max(0, Math.floor(deltaMs / 60_000));

  if (deltaMinutes < 1) return "just now";
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;

  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays}d ago`;
}

function getSeverityIcon(severity: DesktopNotification["severity"]) {
  switch (severity) {
    case "error":
      return <CircleAlert className="text-red-400" size={16} />;
    case "warning":
      return <TriangleAlert className="text-amber-400" size={16} />;
    case "success":
      return <CircleCheckBig className="text-emerald-400" size={16} />;
    case "info":
    default:
      return <Info className="text-cyan-400" size={16} />;
  }
}

function getBadgeVariant(severity: DesktopNotification["severity"]): "default" | "secondary" | "destructive" | "outline" {
  switch (severity) {
    case "error":
      return "destructive";
    case "warning":
      return "outline";
    case "success":
      return "default";
    case "info":
    default:
      return "secondary";
  }
}

export function NotificationsPopup() {
  const notifications = useNotificationStore((state) => state.notifications);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const clear = useNotificationStore((state) => state.clear);
  const unreadCount = getUnreadCount(notifications);

  return (
    <div className="flex h-full flex-col bg-transparent">
      <Card className="h-full rounded-none border-0 bg-transparent shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-ox-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-ox-accent" />
            <CardTitle className="text-sm tracking-[0.12em] uppercase text-ox-text">Notifications</CardTitle>
            {unreadCount > 0 && <Badge variant="secondary">{unreadCount} unread</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
              <CheckCheck data-icon="inline-start" />
              Read
            </Button>
            <Button variant="ghost" size="sm" onClick={clear} disabled={notifications.length === 0}>
              <Trash2 data-icon="inline-start" />
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto px-0 py-0">
          {notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <Bell size={24} className="text-ox-muted opacity-50" />
              <p className="text-sm text-ox-muted">No recent terminal or device alerts.</p>
            </div>
          ) : (
            notifications.map((notification, index) => (
              <div key={notification.id}>
                <div
                  className="flex items-start gap-3 px-4 py-3 transition-colors"
                  style={{
                    background: notification.read
                      ? "transparent"
                      : "color-mix(in srgb, var(--orphix-color-primary) 7%, transparent)",
                  }}
                >
                  <div className="mt-0.5">{getSeverityIcon(notification.severity)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ox-text">{notification.title}</p>
                      <Badge variant={getBadgeVariant(notification.severity)}>{notification.severity}</Badge>
                      {!notification.read && <span className="size-2 rounded-full bg-ox-accent" />}
                    </div>
                    <p className="mt-1 text-sm text-ox-muted">{notification.message}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-ox-muted/70">
                      <span>{formatRelativeTime(notification.createdAt)}</span>
                      {notification.terminalId && (
                        <span className="inline-flex items-center gap-1">
                          <TerminalSquare size={12} />
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
        </CardContent>
      </Card>
    </div>
  );
}
