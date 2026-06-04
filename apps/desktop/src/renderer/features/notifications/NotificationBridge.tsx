import { useEffect } from "react";
import {
  getHighestUnreadSeverity,
  getUnreadCount,
  useNotificationStore,
} from "./notification-store";

export function NotificationBridge() {
  const notifications = useNotificationStore((state) => state.notifications);

  useEffect(() => {
    const count = getUnreadCount(notifications);
    const severity = getHighestUnreadSeverity(notifications);
    window.orphix.system.setBadge({ count, severity }).catch(() => {});
  }, [notifications]);

  return null;
}
