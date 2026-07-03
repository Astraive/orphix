import { create } from "zustand";
import type { ActivityNotificationDraft, NotificationSeverity } from "@orphix/types";
import { pickHighestNotificationSeverity } from "@orphix/types";

export interface WebNotification extends ActivityNotificationDraft {
  id: string;
  createdAt: string;
  read: boolean;
}

const MAX_NOTIFICATIONS = 100;
const DEDUPE_WINDOW_MS = 10_000;

function isDuplicate(items: WebNotification[], draft: ActivityNotificationDraft): boolean {
  if (!draft.dedupeKey) return false;
  const now = Date.now();
  return items.some((item) => item.dedupeKey === draft.dedupeKey && now - new Date(item.createdAt).getTime() < DEDUPE_WINDOW_MS);
}

interface NotificationStoreState {
  notifications: WebNotification[];
  push: (draft: ActivityNotificationDraft) => void;
  markAllRead: () => void;
  clear: () => void;
}

export const useWebNotificationStore = create<NotificationStoreState>((set) => ({
  notifications: [],

  push: (draft) =>
    set((state) => {
      if (isDuplicate(state.notifications, draft)) return state;

      const next: WebNotification = {
        ...draft,
        id: crypto.randomUUID(),
        createdAt: draft.createdAt ?? new Date().toISOString(),
        read: false,
      };
      return { notifications: [next, ...state.notifications].slice(0, MAX_NOTIFICATIONS) };
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((item) => (item.read ? item : { ...item, read: true })),
    })),

  clear: () => set({ notifications: [] }),
}));

export function getWebUnreadCount(items: WebNotification[]): number {
  return items.reduce((count, item) => count + (item.read ? 0 : 1), 0);
}

export function getWebHighestUnreadSeverity(items: WebNotification[]): NotificationSeverity | null {
  return pickHighestNotificationSeverity(items.filter((item) => !item.read).map((item) => item.severity));
}
