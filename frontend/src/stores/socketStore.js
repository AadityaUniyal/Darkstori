import { create } from 'zustand';

export const useSocketStore = create((set, get) => ({
  // Connection state
  connectionStatus: 'disconnected', // 'connected' | 'disconnected' | 'reconnecting'
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  // Notifications
  notifications: [],
  addNotification: (notif) => set((state) => ({
    notifications: [{ ...notif, id: Date.now() + Math.random(), timestamp: 'Just now', read: false }, ...state.notifications].slice(0, 50)
  })),
  markAllRead: () => set((state) => ({ notifications: state.notifications.map(n => ({ ...n, read: true })) })),
  markRead: (id) => set((state) => ({ notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n) })),
  clearNotifications: () => set({ notifications: [] }),
  get unreadCount() { return get().notifications.filter(n => !n.read).length; },

  // Live orders from WebSocket
  liveOrders: [],
  addLiveOrder: (order) => set((state) => ({
    liveOrders: [order, ...state.liveOrders].slice(0, 100)
  })),
  clearLiveOrders: () => set({ liveOrders: [] }),
}));
