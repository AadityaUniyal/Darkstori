/* eslint-disable no-console */
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function LiveSocketListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let ws = null;
    let pingIntervalId = null;
    let reconnectTimeoutId = null;

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws';
      const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
      const url = `${protocol}//${host}/socket.io/?EIO=4&transport=websocket`;
      
      console.log("[WebSocket] Connecting to", url);
      ws = new WebSocket(url);

      ws.onopen = () => {
        console.log("[WebSocket] Connected to Socket.IO server");
        ws.send('40');
      };

      ws.onmessage = (event) => {
        const msg = event.data;
        if (msg === '2') {
          ws.send('3');
          return;
        }

        if (msg.startsWith('42')) {
          try {
            const payloadStr = msg.substring(2);
            const parsed = JSON.parse(payloadStr);
            const eventName = parsed[0];
            const eventData = parsed[1];

            console.log("[WebSocket] Received event:", eventName, eventData);

            if (eventName === 'db_event') {
              const eventDetail = {
                type: eventData.type || 'info',
                message: eventData.message || (eventData.data && eventData.data.message),
              };
              
              if (!eventDetail.message && eventData.table === 'orders_synthetic') {
                eventDetail.type = 'success';
                eventDetail.message = `New order ${eventData.data.order_number} received for ${eventData.data.platform}`;
              }
              
              if (eventDetail.message) {
                if (eventDetail.type === 'success') {
                  toast.success(eventDetail.message);
                  queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
                  queryClient.invalidateQueries({ queryKey: ['active-cohorts'] });
                } else {
                  toast(eventDetail.message);
                }
                window.dispatchEvent(new CustomEvent('darkstori:notification', { detail: eventDetail }));
              }
            } else if (eventName === 'sla_breach_warning') {
              toast.warning(eventData.message);
              window.dispatchEvent(new CustomEvent('darkstori:notification', {
                detail: {
                  type: 'warning',
                  message: eventData.message
                }
              }));
            } else if (eventName === 'competitor_alert') {
              toast.error(eventData.message);
              window.dispatchEvent(new CustomEvent('darkstori:notification', {
                detail: {
                  type: 'danger',
                  message: eventData.message
                }
              }));
            }
          } catch (e) {
            console.error("[WebSocket] Error parsing message:", e);
          }
        }
      };

      ws.onclose = () => {
        console.log("[WebSocket] Connection closed. Reconnecting in 5s...");
        cleanup();
        reconnectTimeoutId = setTimeout(connect, 5000);
      };

      ws.onerror = (err) => {
        console.error("[WebSocket] Socket error:", err);
        ws.close();
      };
    }

    function cleanup() {
      if (pingIntervalId) clearInterval(pingIntervalId);
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
    }

    connect();

    return () => {
      cleanup();
      if (ws) ws.close();
    };
  }, []);

  return null;
}
