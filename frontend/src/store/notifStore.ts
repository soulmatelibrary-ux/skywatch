import { create } from 'zustand';
import type { Notification } from '../types/notification';

interface NotifState {
  unreadCount: number;
  notifications: Notification[];
  setUnreadCount: (n: number) => void;
  increment: () => void;
  setNotifications: (items: Notification[]) => void;
  patchRead: (id: number, readAt: string) => void;
  markAllRead: (readAt: string) => void;
  removeOne: (id: number) => void;
  removeRead: () => void;
}

export const useNotifStore = create<NotifState>((set) => ({
  unreadCount: 0,
  notifications: [],
  setUnreadCount: (n) => set({ unreadCount: n }),
  increment: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  setNotifications: (items) => set({
    notifications: items,
    unreadCount: items.filter(n => !n.read_at).length,
  }),
  patchRead: (id, readAt) => set(s => {
    const updated = s.notifications.map(n => n.id === id ? { ...n, read_at: readAt } : n);
    return { notifications: updated, unreadCount: updated.filter(n => !n.read_at).length };
  }),
  markAllRead: (readAt) => set(s => ({
    notifications: s.notifications.map(n => ({ ...n, read_at: n.read_at ?? readAt })),
    unreadCount: 0,
  })),
  removeOne: (id) => set(s => {
    const updated = s.notifications.filter(n => n.id !== id);
    return { notifications: updated, unreadCount: updated.filter(n => !n.read_at).length };
  }),
  removeRead: () => set(s => {
    const updated = s.notifications.filter(n => !n.read_at);
    return { notifications: updated, unreadCount: updated.length };
  }),
}));
