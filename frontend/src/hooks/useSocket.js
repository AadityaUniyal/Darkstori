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
    // Resilient socket connection: only attempt socket on localhost or dedicated VITE_WS_URL
    const wsUrl = import.meta.env.VITE_WS_URL;
    if (!wsUrl && window.location.hostname !== 'localhost') {
      setConnectionStatus('connected');
      return;
    }

    const connectUrl = wsUrl || 'http://localhost:8000';
    const socket = io(connectUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1500,
      timeout: 8000,
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

    socket.on('reconnect_failed', () => {
      console.log('[Socket.IO] Reconnect failed. Operating in API polling mode.');
      setConnectionStatus('polling');
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
