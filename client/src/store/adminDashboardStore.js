import { create } from 'zustand';

export const useAdminDashboardStore = create((set) => ({
  refreshVersion: 0,
  bumpRefresh: () => set((s) => ({ refreshVersion: s.refreshVersion + 1 })),
}));
