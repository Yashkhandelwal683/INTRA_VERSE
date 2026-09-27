import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (n) => set((s) => ({ notifications: [n, ...s.notifications].slice(0, 50) })),
  setUnreadCount: (count) => set({ unreadCount: count }),
  clearNotifications: () => set({ notifications: [] }),
}));
