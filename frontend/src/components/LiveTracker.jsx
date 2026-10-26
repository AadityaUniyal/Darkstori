import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, MapPin, Zap } from 'lucide-react';
import { useSocketStore } from '../stores/socketStore';

export default function LiveTracker({ onOrdersUpdate }) {
  const { liveOrders = [], connectionStatus } = useSocketStore();
  const lastLiveOrderRef = useRef(null);
  const isLive = connectionStatus === 'connected';

  useEffect(() => {
    const latest = liveOrders[0];
    if (!isLive || !latest || latest === lastLiveOrderRef.current) return;
    lastLiveOrderRef.current = latest;
    const lat = Number(latest.lat ?? latest.latitude ?? latest.delivery_latitude);
    const lng = Number(latest.lng ?? latest.longitude ?? latest.delivery_longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      onOrdersUpdate?.([{
        id: latest.id || latest.order_number,
        lat,
        lng,
        status: latest.status,
        source: 'live_socket',
      }]);
    } else onOrdersUpdate?.([]);
  }, [isLive, liveOrders, onOrdersUpdate]);

  const statusColor = isLive ? '#10b981' : connectionStatus === 'reconnecting' ? 'var(--saffron-500)' : '#86868B';
  const badgeText = isLive ? 'CONNECTED' : connectionStatus === 'reconnecting' ? 'RECONNECTING' : 'OFFLINE';
  const badgeBg = isLive ? 'rgba(16, 185, 129, 0.1)' : connectionStatus === 'reconnecting' ? 'var(--saffron-100)' : 'rgba(134, 134, 139, 0.12)';

  return (
    <div style={{ background: 'var(--color-bg-card)', backdropFilter: 'blur(16px)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', height: 460, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Radio size={16} color={statusColor} style={{ animation: isLive ? 'pulse 1.2s infinite ease-in-out' : 'none' }} />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', margin: 0 }}>Order event stream</h2>
        </div>
        <span style={{ fontSize: '.68rem', background: badgeBg, border: `1px solid ${statusColor}`, color: statusColor, fontWeight: 700, padding: '3px 8px', borderRadius: 12, fontFamily: 'var(--font-mono)' }}>{badgeText}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }} className="live-stream-scroll">
        <AnimatePresence initial={false}>
          {liveOrders.map((order) => {
            const orderId = order.id || order.order_number;
            const items = Array.isArray(order.items) ? order.items.filter(Boolean).join(', ') : null;
            const lat = Number(order.lat ?? order.latitude ?? order.delivery_latitude);
            const lng = Number(order.lng ?? order.longitude ?? order.delivery_longitude);
            const amount = order.value ?? order.total_amount ?? order.order_value;
            const timestamp = order.timestamp || order.order_datetime || order.created_at;
            return (
              <motion.div key={orderId} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: .25 }} style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 10, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: '.74rem', color: 'var(--color-text-muted)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{orderId || 'Order'}{timestamp ? ` · ${new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
                  <span style={{ fontSize: '.88rem', color: 'var(--color-text-primary)', fontWeight: 650 }}>{items || order.status || 'Order event received'}</span>
                  {Number.isFinite(lat) && Number.isFinite(lng) && <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.74rem', color: 'var(--color-text-secondary)', marginTop: 2 }}><MapPin size={12} color="var(--peacock-500)" /><span>{lat.toFixed(4)}, {lng.toFixed(4)}</span></div>}
                </div>
                {amount != null && <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--monsoon-500)', fontWeight: 800, fontSize: '.94rem', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}><Zap size={12} fill="var(--monsoon-500)" stroke="none" />₹{Number(amount).toLocaleString('en-IN')}</div>}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {(!isLive || liveOrders.length === 0) && <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 260, color: 'var(--color-text-secondary)', fontSize: '.85rem', lineHeight: 1.5 }}>
          <Radio size={22} color={statusColor} style={{ marginBottom: 8 }} />
          <div style={{ color: 'var(--color-text-primary)', fontWeight: 650 }}>{isLive ? 'Waiting for order events' : 'Live order feed is disconnected'}</div>
          <div>{isLive ? 'No events have arrived in this session.' : 'Connect the order event source to view operational activity.'}</div>
        </div>}
      </div>
    </div>
  );
}
