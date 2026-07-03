import { create } from "zustand";
import type {
  ActivityNotificationDraft,
  NotificationSeverity,
} from "@orphix/types";
import { pickHighestNotificationSeverity } from "@orphix/types";

export interface DesktopNotification extends ActivityNotificationDraft {
  id: string;
  createdAt: string;
  read: boolean;
}

const MAX_NOTIFICATIONS = 120;
const DEDUPE_WINDOW_MS = 10_000;

function createNotification(draft: ActivityNotificationDraft): DesktopNotification {
  return {
    ...draft,
    id: crypto.randomUUID(),
    createdAt: draft.createdAt ?? new Date().toISOString(),
    read: false,
  };
}

function isDuplicate(
  notifications: DesktopNotification[],
  draft: ActivityNotificationDraft,
): boolean {
  if (!draft.dedupeKey) return false;

  const now = Date.now();
  return notifications.some((notification) => {
    if (notification.dedupeKey !== draft.dedupeKey) return false;
    return now - new Date(notification.createdAt).getTime() < DEDUPE_WINDOW_MS;
  });
}

interface NotificationState {
  notifications: DesktopNotification[];
  push: (draft: ActivityNotificationDraft) => void;
  markAllRead: () => void;
  markTerminalRead: (terminalId: string) => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  push: (draft) =>
    set((state) => {
      if (isDuplicate(state.notifications, draft)) {
        return state;
      }

      const next = [createNotification(draft), ...state.notifications];
      return { notifications: next.slice(0, MAX_NOTIFICATIONS) };
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.read ? notification : { ...notification, read: true },
      ),
    })),

  markTerminalRead: (terminalId) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.terminalId === terminalId && !notification.read
          ? { ...notification, read: true }
          : notification,
      ),
    })),

  clear: () => set({ notifications: [] }),
}));

export function getUnreadCount(notifications: DesktopNotification[]): number {
  return notifications.reduce((count, notification) => count + (notification.read ? 0 : 1), 0);
}

export function getHighestUnreadSeverity(
  notifications: DesktopNotification[],
): NotificationSeverity | null {
  return pickHighestNotificationSeverity(
    notifications
      .filter((notification) => !notification.read)
      .map((notification) => notification.severity),
  );
}

export function getTerminalUnreadSeverity(
  notifications: DesktopNotification[],
  terminalId: string | null | undefined,
): NotificationSeverity | null {
  if (!terminalId) return null;
  return pickHighestNotificationSeverity(
    notifications
      .filter((notification) => !notification.read && notification.terminalId === terminalId)
      .map((notification) => notification.severity),
  );
}
