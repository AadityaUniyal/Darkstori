import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCity } from '../context/CityContext';
import { Navigation, MapPin } from 'lucide-react';
import { api } from '../services/api';

const METRO_BOUNDS = {
  Bangalore: { lat: 12.9716, lng: 77.5946, stores: [
    { name: 'Zepto Koramangala Hub', lat: 12.9345, lng: 77.6266, platform: 'Zepto' },
    { name: 'Blinkit Koramangala South', lat: 12.9280, lng: 77.6220, platform: 'Blinkit' },
    { name: 'Instamart Koramangala North', lat: 12.9410, lng: 77.6320, platform: 'Instamart' },
    { name: 'Zepto Indiranagar West', lat: 12.9719, lng: 77.6412, platform: 'Zepto' },
    { name: 'Blinkit Indiranagar Central', lat: 12.9760, lng: 77.6480, platform: 'Blinkit' },
  ]},
  Delhi: { lat: 28.6139, lng: 77.2090, stores: [
    { name: 'Blinkit Saket Mall', lat: 28.5244, lng: 77.2166, platform: 'Blinkit' },
    { name: 'Zepto Saket Hub', lat: 28.5210, lng: 77.2210, platform: 'Zepto' },
  ]},
  Mumbai: { lat: 19.0760, lng: 72.8777, stores: [
    { name: 'Instamart Andheri Central', lat: 19.1293, lng: 72.8271, platform: 'Instamart' },
  ]},
  Hyderabad: { lat: 17.3850, lng: 78.4867, stores: [
    { name: 'Zepto Hitech City', lat: 17.4482, lng: 78.3489, platform: 'Zepto' },
  ]},
  Pune: { lat: 18.5204, lng: 73.8567, stores: [
    { name: 'Instamart Koregaon Park', lat: 18.5362, lng: 73.8930, platform: 'Instamart' },
  ]},
};

export default function MapView({
  neighborhoods = [],
  center,
  zoom,
  height = '400px',
  liveOrders = [],
  showHeatmap = false,
  onSelect,
}) {
  const { selectedCity } = useCity();
  const canvasRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  const cityCenter = METRO_BOUNDS[selectedCity] || METRO_BOUNDS.Bangalore;

  const { data: dynamicStores } = useQuery({
    queryKey: ['stores', selectedCity],
    queryFn: () => api.getStores({ city: selectedCity, limit: 1000 }),
    enabled: !!selectedCity,
    staleTime: 60000,
  });

  const { data: opportunityZones } = useQuery({
    queryKey: ['opportunity-zones', selectedCity],
    queryFn: () => api.getOpportunityZones(selectedCity),
    enabled: showHeatmap && !!selectedCity,
    staleTime: 60000,
  });

  const stores = dynamicStores && dynamicStores.length > 0 ? dynamicStores : cityCenter.stores;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    const width = canvas.width;
    const heightVal = canvas.height;

    // Helper to map lat/lng into Canvas X/Y coordinates
    // We construct a bounding box around the city center
    const latMin = cityCenter.lat - 0.08;
    const latMax = cityCenter.lat + 0.08;
    const lngMin = cityCenter.lng - 0.08;
    const lngMax = cityCenter.lng + 0.08;

    const toCanvasX = (lng) => ((lng - lngMin) / (lngMax - lngMin)) * width;
    const toCanvasY = (lat) => heightVal - ((lat - latMin) / (latMax - latMin)) * heightVal;

    const draw = () => {
      ctx.clearRect(0, 0, width, heightVal);

      // 1. Draw digital telemetry grid overlay
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.03)';
      ctx.lineWidth = 1;
      const step = 25;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, heightVal); ctx.stroke();
      }
      for (let y = 0; y < heightVal; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // 2. Draw opportunity zone heat circles (from DBSCAN clustering or neighborhoods fallback)
      if (showHeatmap) {
        const zonesToDraw = opportunityZones && opportunityZones.length > 0
          ? opportunityZones
          : neighborhoods
              .filter((n) => n.city === selectedCity)
              .map((n, idx) => ({
                centroid_lat: cityCenter.lat + (idx % 2 === 0 ? 0.035 : -0.035) * Math.sin(idx + 1),
                centroid_lng: cityCenter.lng + (idx % 2 === 0 ? -0.035 : 0.035) * Math.cos(idx + 1),
                opportunity_score: (n.opportunity_score || 8.5) * 10,
                zone_type: n.opportunity_score >= 8.5 ? 'greenfield' : 'growth',
                label: n.neighborhood_name || 'Opp Zone'
              }));

        zonesToDraw.forEach((zone) => {
          const score = zone.opportunity_score || 85;
          const size = 30 + (score / 10) * 8;
          
          const x = toCanvasX(zone.centroid_lng);
          const y = toCanvasY(zone.centroid_lat);

          const colors = {
            greenfield: '16, 185, 129', // Emerald
            growth: '245, 158, 11',    // Amber
            saturated: '239, 68, 68',   // Red
          };
          const colorStr = colors[zone.zone_type] || '59, 130, 246'; // Blue default

          const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
          grad.addColorStop(0, `rgba(${colorStr}, 0.2)`);
          grad.addColorStop(0.5, `rgba(${colorStr}, 0.07)`);
          grad.addColorStop(1, `rgba(${colorStr}, 0)`);
          
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = `rgba(${colorStr}, 0.25)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = `rgba(255, 255, 255, 0.65)`;
          ctx.font = '8px Inter';
          ctx.textAlign = 'center';
          
          const labelText = zone.label || `Zone #${zone.cluster_id} (${zone.zone_type.toUpperCase()})`;
          ctx.fillText(labelText, x, y - 4);
          ctx.fillStyle = `rgba(${colorStr}, 0.85)`;
          ctx.fillText(`Score: ${score.toFixed(0)}`, x, y + 6);
        });
      }

      // 3. Draw active store nodes
      stores.forEach((store) => {
        const x = toCanvasX(store.lng);
        const y = toCanvasY(store.lat);

        const colorMap = {
          Zepto: '#a855f7',
          Blinkit: '#f59e0b',
          Instamart: '#fc8019',
          'Swiggy Instamart': '#fc8019',
          'Flipkart Minutes': '#38f9d7',
        };
        const color = colorMap[store.platform] || '#3b82f6';

        // Pulse ring
        const pulse = 10 + 4 * Math.sin(Date.now() / 200);
        ctx.strokeStyle = `${color}30`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, pulse, 0, Math.PI * 2);
        ctx.stroke();

        // Solid dot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Glow
        ctx.fillStyle = `${color}20`;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4. Draw live order pulses
      liveOrders.forEach((order) => {
        // Only draw if within bounds of the selected city
        const x = toCanvasX(order.lng);
        const y = toCanvasY(order.lat);

        if (x >= 0 && x <= width && y >= 0 && y <= heightVal) {
          const size = 12 + 8 * Math.sin(Date.now() / 150);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [selectedCity, neighborhoods, opportunityZones, liveOrders, showHeatmap, cityCenter]);

  // Handle canvas click to trigger callback
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !onSelect) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Check if clicked near a store
    const latMin = cityCenter.lat - 0.08;
    const latMax = cityCenter.lat + 0.08;
    const lngMin = cityCenter.lng - 0.08;
    const lngMax = cityCenter.lng + 0.08;

    const toCanvasX = (lng) => ((lng - lngMin) / (lngMax - lngMin)) * canvas.width;
    const toCanvasY = (lat) => canvas.height - ((lat - latMin) / (latMax - latMin)) * canvas.height;

    const matchedNb = neighborhoods.find((n, idx) => {
      const lat = cityCenter.lat + (idx % 2 === 0 ? 0.035 : -0.035) * Math.sin(idx + 1);
      const lng = cityCenter.lng + (idx % 2 === 0 ? -0.035 : 0.035) * Math.cos(idx + 1);
      const x = toCanvasX(lng);
      const y = toCanvasY(lat);
      const dist = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
      return dist < 25;
    });

    if (matchedNb) {
      onSelect(matchedNb);
    }
  };

  return (
    <div style={{ position: 'relative', height: height, borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      {/* Background canvas */}
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        onClick={handleCanvasClick}
        style={{
          width: '100%',
          height: '100%',
          background: '#090d16',
          cursor: 'crosshair',
          display: 'block'
        }}
      />

      {/* Compass / Status Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        pointerEvents: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 700, color: '#60a5fa' }}>
          <Navigation size={12} style={{ transform: 'rotate(45deg)' }} />
          <span>METRIC COMPASS</span>
        </div>
        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>
          {selectedCity} Grid
        </span>
        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
          Lat: {cityCenter.lat.toFixed(4)} · Lng: {cityCenter.lng.toFixed(4)}
        </span>
      </div>

      {/* Legend Overlay */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontSize: '0.74rem',
        pointerEvents: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#a855f7' }} />
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Zepto</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Blinkit</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fc8019' }} />
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Instamart</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38f9d7' }} />
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Flipkart Minutes</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
          <span style={{ color: '#ef4444', fontWeight: 700 }}>Live Orders</span>
        </div>
      </div>
    </div>
  );
}
