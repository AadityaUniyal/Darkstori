import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useSocketStore } from '../stores/socketStore';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useSocket() {
  const socketRef = useRef(null);
  const queryClient = useQueryClient();
  const { setConnectionStatus, addNotification, addLiveOrder } = useSocketStore();

  useEffect(() => {
    // Determine WebSocket URL
    const wsUrl = import.meta.env.VITE_WS_URL || 
      (window.location.hostname === 'localhost' 
        ? 'http://localhost:8000' 
        : window.location.origin);

    const socket = io(wsUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected:', socket.id);
      setConnectionStatus('connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason);
      setConnectionStatus('disconnected');
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log('[Socket.IO] Reconnecting, attempt:', attempt);
      setConnectionStatus('reconnecting');
    });

    socket.on('reconnect', () => {
      console.log('[Socket.IO] Reconnected');
      setConnectionStatus('connected');
      toast.success('Real-time connection restored');
    });

    // Handle database events
    socket.on('db_event', (data) => {
      console.log('[Socket.IO] db_event:', data);
      const message = data.message || (data.data && data.data.message);
      
      if (data.table === 'orders_synthetic' && data.data) {
        const orderMsg = `New order ${data.data.order_number || ''} received for ${data.data.platform || 'Unknown'}`;
        toast.success(orderMsg);
        addNotification({ type: 'success', message: orderMsg });
        addLiveOrder(data.data);
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        queryClient.invalidateQueries({ queryKey: ['active-cohorts'] });
      } else if (message) {
        toast(message);
        addNotification({ type: data.type || 'info', message });
      }
    });

    socket.on('sla_breach_warning', (data) => {
      toast.warning(data.message);
      addNotification({ type: 'warning', message: data.message });
    });

    socket.on('competitor_alert', (data) => {
      toast.error(data.message);
      addNotification({ type: 'danger', message: data.message });
    });

    // Heartbeat
    socket.on('heartbeat', () => {
      // Server is alive
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient, setConnectionStatus, addNotification, addLiveOrder]);

  return socketRef;
}
