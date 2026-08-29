import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, MapPin, Zap } from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useSocketStore } from '../stores/socketStore';

const STORES = {
  Default: [
    { name: 'North Hub', lat: 12.9345, lng: 77.6266 },
    { name: 'Central Hub', lat: 12.9280, lng: 77.6220 },
    { name: 'East Hub', lat: 12.9410, lng: 77.6320 },
    { name: 'West Hub', lat: 12.9719, lng: 77.6412 },
    { name: 'South Hub', lat: 12.9760, lng: 77.6480 },
  ],
};

const ITEMS = [
  'Organic Bananas 1kg', 'Fresh Spinach 250g', 'Toned Milk 1L', 'Aashirvaad Atta 5kg',
  'Coca-Cola 1.25L', 'Maggi Noodles 4-pack', 'Surf Excel 1kg', 'Cadbury Dairy Milk',
  'Dettol Handwash Refill', 'Fortune Mustard Oil 1L'
];

export default function LiveTracker({ onOrder }) {
  const { selectedCity } = useCity();
  const { liveOrders, connectionStatus } = useSocketStore();
  const [demoFeed, setDemoFeed] = useState([]);
  
  const isLive = connectionStatus === 'connected';

  // Demo generation logic
  useEffect(() => {
    if (isLive) return;

    // Generate initial items
    if (demoFeed.length === 0) {
      const initialFeed = Array.from({ length: 5 }).map((_, i) => generateOrder(i));
      setDemoFeed(initialFeed);
      initialFeed.forEach(onOrder);
    }

    // Set interval to generate new orders
    const interval = setInterval(() => {
      const newOrder = generateOrder();
      setDemoFeed((prev) => [newOrder, ...prev.slice(0, 19)]);
      onOrder(newOrder);
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedCity, onOrder, isLive]);

  // Forward live orders to parent via onOrder
  const lastLiveOrderRef = useRef(null);
  useEffect(() => {
    if (isLive && liveOrders.length > 0) {
      const latest = liveOrders[0];
      if (latest !== lastLiveOrderRef.current) {
        lastLiveOrderRef.current = latest;
        
        // Map DB fields to format expected by map if necessary
        const mappedOrder = {
          id: latest.id || latest.order_number,
          store_name: latest.platform || latest.store_name || 'Darkstore',
          lat: latest.lat || STORES.Default[0].lat + (Math.random() - 0.5) * 0.02,
          lng: latest.lng || STORES.Default[0].lng + (Math.random() - 0.5) * 0.02,
          items: latest.items || [ITEMS[Math.floor(Math.random() * ITEMS.length)]],
          value: latest.value || latest.total_amount || Math.floor(120 + Math.random() * 880),
          timestamp: latest.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        
        onOrder(mappedOrder);
      }
    }
  }, [isLive, liveOrders, onOrder]);

  const generateOrder = (index = 0) => {
    const stores = STORES[selectedCity] || STORES.Default;
    const store = stores[Math.floor(Math.random() * stores.length)];
    // Random offset within 1.5km
    const latOffset = (Math.random() - 0.5) * 0.02;
    const lngOffset = (Math.random() - 0.5) * 0.02;

    const val = Math.floor(120 + Math.random() * 880);
    const id = `ORD-${Date.now().toString().slice(-6)}-${index || Math.floor(Math.random() * 100)}`;
    
    return {
      id,
      store_name: store.name,
      lat: store.lat + latOffset,
      lng: store.lng + lngOffset,
      items: [
        ITEMS[Math.floor(Math.random() * ITEMS.length)],
        Math.random() > 0.5 ? ITEMS[Math.floor(Math.random() * ITEMS.length)] : null
      ].filter(Boolean),
      value: val,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
  };

  const displayFeed = isLive ? liveOrders : demoFeed;

  const statusColor = connectionStatus === 'connected' ? '#10b981' : 
                     connectionStatus === 'reconnecting' ? 'var(--saffron-500)' : '#ef4444';

  const badgeText = connectionStatus === 'connected' ? 'LIVE' : 
                   connectionStatus === 'reconnecting' ? 'RECONNECTING' : 'DEMO';

  const badgeBg = connectionStatus === 'connected' ? 'rgba(16, 185, 129, 0.1)' : 
                 connectionStatus === 'reconnecting' ? 'var(--saffron-100)' : 'rgba(239, 68, 68, 0.1)';

  return (
    <div
      style={{
        background: 'var(--color-bg-card)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        height: '460px',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio size={16} color={statusColor} style={{ animation: isLive ? 'pulse 1.2s infinite ease-in-out' : 'none' }} />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', margin: 0 }}>
            Live Orders Stream
          </h2>
        </div>
        <span style={{ fontSize: '0.68rem', background: badgeBg, border: `1px solid ${statusColor}`, color: statusColor, fontWeight: 700, padding: '3px 8px', borderRadius: '12px', fontFamily: 'var(--font-mono)' }}>
          {badgeText}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }} className="live-stream-scroll">
        <AnimatePresence initial={false}>
          {displayFeed.map((order) => {
            const orderId = order.id || order.order_number;
            const items = Array.isArray(order.items) ? order.items : [ITEMS[0]];
            const storeName = order.store_name || order.platform || 'Darkstore';
            const value = order.value || order.total_amount || 0;
            const timestamp = order.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <motion.div
                key={orderId}
                initial={{ opacity: 0, x: -16, y: -8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {orderId} - {timestamp}
                  </span>
                  <span style={{ fontSize: '0.88rem', color: 'var(--color-text-primary)', fontWeight: 700 }}>
                    {items.join(', ')}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    <MapPin size={12} color="var(--peacock-500)" />
                    <span>from {storeName}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--monsoon-500)', fontWeight: 800, fontSize: '0.94rem', fontFamily: 'var(--font-mono)' }}>
                    <Zap size={12} fill="var(--monsoon-500)" stroke="none" />
                    Rs {value}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
