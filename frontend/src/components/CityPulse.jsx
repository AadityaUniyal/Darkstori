import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

const CITY_COORDS = {
  Bangalore: { lat: 12.9716, lng: 77.5946 },
  Delhi: { lat: 28.6139, lng: 77.2090 },
  Mumbai: { lat: 19.0760, lng: 72.8777 },
  Hyderabad: { lat: 17.3850, lng: 78.4867 },
  Pune: { lat: 18.5204, lng: 73.8567 },
};

export default function CityPulse({ height = 420 }) {
  const [activeCityIdx, setActiveCityIdx] = useState(0);
  const cities = Object.keys(CITY_COORDS);
  const activeCity = cities[activeCityIdx];

  const canvasRef = useRef(null);

  // Auto-rotation timer
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveCityIdx((prev) => (prev + 1) % cities.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [cities.length]);

  // Query stores for the active city
  const { data: stores } = useQuery({
    queryKey: ['stores', activeCity],
    queryFn: () => api.getStores({ city: activeCity }),
    staleTime: 60000,
  });

  // Render pulsing 3D nodes on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let angle = 0;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Rotate angle for 3D illusion
      angle += 0.008;

      // Draw grid rings
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.05)';
      for (let r = 50; r <= 180; r += 40) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw crosshairs
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.beginPath();
      ctx.moveTo(cx - 200, cy); ctx.lineTo(cx + 200, cy);
      ctx.moveTo(cx, cy - 100); ctx.lineTo(cx, cy + 100);
      ctx.stroke();

      // Plot store nodes with 3D projection
      const storeList = stores || [
        { id: 1, platform: 'Zepto', store_name: 'Metro Hub 1' },
        { id: 2, platform: 'Blinkit', store_name: 'Super Store A' },
        { id: 3, platform: 'Instamart', store_name: 'Central Darkstore' },
      ];

      storeList.forEach((store, idx) => {
        // Distribute stores in a circle with varying radii
        const baseAngle = (idx / storeList.length) * Math.PI * 2 + angle;
        const radius = 60 + (idx % 3) * 35;

        // 3D coordinates projection
        const x3d = radius * Math.cos(baseAngle);
        const z3d = radius * Math.sin(baseAngle); // depth
        const y3d = (idx % 2 === 0 ? 25 : -25) * Math.sin(baseAngle * 2); // height offset

        // Project onto 2D screen
        const scale = 1 + z3d / 300; // perspective scaling
        const screenX = cx + x3d * scale;
        const screenY = cy + y3d * scale + (z3d * 0.3); // tilt projection

        const colorMap = {
          Zepto: '#a855f7',
          Blinkit: '#f59e0b',
          Instamart: '#fc8019',
        };
        const color = colorMap[store.platform] || '#3b82f6';

        // Pulse effect
        const pulseSize = 8 + 4 * Math.sin(Date.now() / 250 + idx);

        // Draw node connection line to base plane
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX, cy + (z3d * 0.3));
        ctx.stroke();

        // Pulsing halo
        ctx.fillStyle = `${color}18`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, pulseSize * scale, 0, Math.PI * 2);
        ctx.fill();

        // Inner solid dot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 4 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Node label if close to front
        if (z3d > -30) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.font = '9px Inter';
          ctx.textAlign = 'center';
          ctx.fillText(store.store_name?.split(' ')[0] || store.platform, screenX, screenY - 10);
        }
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [stores]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* City selector strip */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '12px' }}>
        {cities.map((city, idx) => (
          <button
            key={city}
            onClick={() => setActiveCityIdx(idx)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: 'none',
              background: activeCity === city ? '#3b82f6' : 'rgba(255,255,255,0.03)',
              color: activeCity === city ? '#ffffff' : '#94a3b8',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background-color 0.2s, color 0.2s'
            }}
          >
            {city}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Pulsing Visual */}
        <div style={{ flex: 1, minWidth: '280px', display: 'flex', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.3)', borderRadius: '12px', padding: '10px' }}>
          <canvas ref={canvasRef} width={340} height={200} style={{ width: '100%', maxWidth: '340px' }} />
        </div>

        {/* City Stats Panel */}
        <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={18} color="#3b82f6" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              {activeCity} Hyperlocal telemetry
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Fulfillment Rate</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>98.4%</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Active Riders</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa', marginTop: '4px' }}>180+</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Avg Delivery Time</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>13.2 min</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Stores Tracked</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#a855f7', marginTop: '4px' }}>{stores?.length || 12}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
