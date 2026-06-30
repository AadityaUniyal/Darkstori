import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCity } from '../context/CityContext';
import { Navigation } from 'lucide-react';
import { api } from '../services/api';

const METRO_BOUNDS = {
  Bangalore: { lat: 12.9716, lng: 77.5946, stores: [
    { name: 'Darkstori Koramangala HQ', lat: 12.9345, lng: 77.6266, platform: 'Darkstori', status: 'active' },
    { name: 'Zepto Koramangala Hub', lat: 12.9280, lng: 77.6220, platform: 'Zepto', status: 'competitor' },
    { name: 'Blinkit Koramangala South', lat: 12.9410, lng: 77.6320, platform: 'Blinkit', status: 'competitor' },
    { name: 'Darkstori Indiranagar West', lat: 12.9719, lng: 77.6412, platform: 'Darkstori', status: 'active' },
    { name: 'Instamart Indiranagar Central', lat: 12.9760, lng: 77.6480, platform: 'Instamart', status: 'competitor' },
  ]},
  Delhi: { lat: 28.6139, lng: 77.2090, stores: [
    { name: 'Darkstori Saket Hub', lat: 28.5244, lng: 77.2166, platform: 'Darkstori', status: 'active' },
    { name: 'Blinkit Saket Mall', lat: 28.5210, lng: 77.2210, platform: 'Blinkit', status: 'competitor' },
  ]},
  Mumbai: { lat: 19.0760, lng: 72.8777, stores: [
    { name: 'Darkstori Andheri Hub', lat: 19.1293, lng: 72.8271, platform: 'Darkstori', status: 'active' },
  ]},
  Hyderabad: { lat: 17.3850, lng: 78.4867, stores: [
    { name: 'Darkstori Hitech City', lat: 17.4482, lng: 78.3489, platform: 'Darkstori', status: 'active' },
  ]},
  Pune: { lat: 18.5204, lng: 73.8567, stores: [
    { name: 'Darkstori Koregaon Park', lat: 18.5362, lng: 73.8930, platform: 'Darkstori', status: 'active' },
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
  const containerRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

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

  const rawStores = dynamicStores && dynamicStores.length > 0 ? dynamicStores : cityCenter.stores;

  // Add status property helper
  const stores = rawStores.map(store => ({
    ...store,
    status: store.status || (store.platform?.toLowerCase() === 'darkstori' ? 'active' : 'competitor')
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    const width = canvas.width;
    const heightVal = canvas.height;

    // Helper to map lat/lng into Canvas X/Y coordinates
    const latMin = cityCenter.lat - 0.08 / zoomLevel;
    const latMax = cityCenter.lat + 0.08 / zoomLevel;
    const lngMin = cityCenter.lng - 0.08 / zoomLevel;
    const lngMax = cityCenter.lng + 0.08 / zoomLevel;

    const toCanvasX = (lng) => ((lng - lngMin) / (lngMax - lngMin)) * width;
    const toCanvasY = (lat) => heightVal - ((lat - latMin) / (latMax - latMin)) * heightVal;

    const draw = () => {
      ctx.clearRect(0, 0, width, heightVal);

      // Dark Matter Basemap Simulation background grid
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(0, 0, width, heightVal);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const step = 30;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, heightVal); ctx.stroke();
      }
      for (let y = 0; y < heightVal; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Draw custom basemap city label in Space Grotesk
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.font = '700 36px Space Grotesk';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(selectedCity.toUpperCase(), width / 2, heightVal / 2);

      // 2. Draw opportunity zone heat circles
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
          const size = 35 + (score / 10) * 10;
          
          const x = toCanvasX(zone.centroid_lng);
          const y = toCanvasY(zone.centroid_lat);

          // Color ramp: Peacock (low score/gap) -> Marigold (mid) -> Spice (high score/critical gap)
          let colorStr = '14, 124, 134'; // Peacock
          if (score >= 80) {
            colorStr = '194, 59, 59'; // Spice red
          } else if (score >= 50) {
            colorStr = '232, 163, 61'; // Marigold
          }

          const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
          grad.addColorStop(0, `rgba(${colorStr}, 0.22)`);
          grad.addColorStop(0.5, `rgba(${colorStr}, 0.08)`);
          grad.addColorStop(1, `rgba(${colorStr}, 0)`);
          
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = `rgba(${colorStr}, 0.3)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, size * 0.85, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = `rgba(247, 245, 250, 0.75)`;
          ctx.font = '500 10px IBM Plex Sans';
          ctx.textAlign = 'center';
          
          const labelText = zone.label || `Zone #${zone.cluster_id}`;
          ctx.fillText(labelText, x, y - 5);
          ctx.fillStyle = `rgba(${colorStr === '194, 59, 59' ? '247, 122, 122' : '232, 163, 61'}, 0.95)`;
          ctx.fillText(`Score: ${(score / 10).toFixed(1)}`, x, y + 8);
        });
      }

      // 3. Draw active store nodes
      stores.forEach((store) => {
        const x = toCanvasX(store.lng);
        const y = toCanvasY(store.lat);

        let color = '#0E7C86'; // peacock-500
        let opacity = 1.0;

        if (store.status === 'competitor') {
          color = '#C23B3B'; // spice-500
          opacity = 0.6;
        } else if (store.status === 'opportunity') {
          color = '#E8A33D'; // marigold-500
        }

        // Draw outer hover circle if matched
        if (hoveredNode && hoveredNode.type === 'store' && hoveredNode.data.name === store.name) {
          ctx.strokeStyle = '#FF7A1A'; // saffron-500
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Solid circle (10px)
        ctx.fillStyle = color;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      // 4. Draw drive-time serviceability isochrone boundaries for proposed store nodes
      liveOrders.forEach((order) => {
        const x = toCanvasX(order.lng);
        const y = toCanvasY(order.lat);

        if (x >= 0 && x <= width && y >= 0 && y <= heightVal) {
          // Draw multi-vertex drive-time polygon boundary (Isochrone)
          ctx.beginPath();
          const numVertices = 12;
          const baseRadius = 45; // ~2.5km equivalent on canvas scale
          for (let v = 0; v < numVertices; v++) {
            const angle = (v / numVertices) * Math.PI * 2;
            // Introduce angular road network variance (e.g. city grids, rivers, barriers)
            const noise = Math.sin(angle * 4) * 8 + Math.cos(angle * 2) * 5;
            const radius = baseRadius + noise;
            const vx = x + Math.cos(angle) * radius;
            const vy = y + Math.sin(angle) * radius;
            if (v === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
          }
          ctx.closePath();
          ctx.fillStyle = 'rgba(255, 122, 26, 0.06)'; // Transparent saffron
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 122, 26, 0.3)'; // Dotted/solid saffron route limit
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]); // Reset
        }
      });

      // 5. Draw stepwell-style concentric expanding rings for live orders
      liveOrders.forEach((order) => {
        const x = toCanvasX(order.lng);
        const y = toCanvasY(order.lat);

        if (x >= 0 && x <= width && y >= 0 && y <= heightVal) {
          const t = (Date.now() / 1000) % 1.8; // 1.8s loop
          
          // Draw 3 concentric rings
          for (let i = 0; i < 3; i++) {
            const delay = i * 0.2;
            const progress = ((t + delay) % 1.8) / 1.8;
            const radius = 5 + progress * 25;
            const alpha = Math.max(0, 0.6 * (1 - progress));

            ctx.strokeStyle = `rgba(255, 122, 26, ${alpha})`; // Saffron-500
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Center solid dot
          ctx.fillStyle = '#FF7A1A';
          ctx.beginPath();
          ctx.arc(x, y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [selectedCity, neighborhoods, opportunityZones, liveOrders, showHeatmap, cityCenter, zoomLevel, hoveredNode]);

  // Handle canvas hover to show tooltip
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const latMin = cityCenter.lat - 0.08 / zoomLevel;
    const latMax = cityCenter.lat + 0.08 / zoomLevel;
    const lngMin = cityCenter.lng - 0.08 / zoomLevel;
    const lngMax = cityCenter.lng + 0.08 / zoomLevel;

    const toCanvasX = (lng) => ((lng - lngMin) / (lngMax - lngMin)) * canvas.width;
    const toCanvasY = (lat) => canvas.height - ((lat - latMin) / (latMax - latMin)) * canvas.height;

    // Check store nodes
    let found = null;
    stores.forEach((store) => {
      const x = toCanvasX(store.lng);
      const y = toCanvasY(store.lat);
      const dist = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
      if (dist < 10) {
        found = {
          type: 'store',
          data: store,
          x: (x / canvas.width) * rect.width,
          y: (y / canvas.height) * rect.height
        };
      }
    });

    setHoveredNode(found);
  };

  // Handle canvas click to trigger callback
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !onSelect) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const latMin = cityCenter.lat - 0.08 / zoomLevel;
    const latMax = cityCenter.lat + 0.08 / zoomLevel;
    const lngMin = cityCenter.lng - 0.08 / zoomLevel;
    const lngMax = cityCenter.lng + 0.08 / zoomLevel;

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
    <div ref={containerRef} style={{ position: 'relative', height: height, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
      {/* Background canvas */}
      <canvas
        ref={canvasRef}
        width={700}
        height={450}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
        onClick={handleCanvasClick}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
          display: 'block'
        }}
      />

      {/* Tooltip Overlay */}
      {hoveredNode && (
        <div style={{
          position: 'absolute',
          left: `${hoveredNode.x}px`,
          top: `${hoveredNode.y - 12}px`,
          transform: 'translate(-50%, -100%)',
          background: 'var(--color-bg-card)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3) var(--space-4)',
          zIndex: 10,
          pointerEvents: 'none',
          boxShadow: 'var(--shadow-lg)',
          minWidth: '180px'
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.94rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            {hoveredNode.data.name}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Brand:</span>
              <span style={{ color: 'var(--peacock-500)', fontWeight: 600 }}>{hoveredNode.data.platform}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Status:</span>
              <span style={{ color: hoveredNode.data.status === 'active' ? 'var(--monsoon-500)' : 'var(--spice-500)' }}>
                {hoveredNode.data.status?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Control Buttons */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        zIndex: 5
      }}>
        <button
          onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 2.5))}
          style={{
            width: '32px',
            height: '32px',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          +
        </button>
        <button
          onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.6))}
          style={{
            width: '32px',
            height: '32px',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          -
        </button>
      </div>

      {/* Compass / Status Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        background: 'var(--color-bg-card)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-2) var(--space-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        pointerEvents: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--peacock-500)', fontFamily: 'var(--font-display)' }}>
          <Navigation size={12} style={{ transform: 'rotate(45deg)' }} />
          <span>METRIC COMPASS</span>
        </div>
        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
          {selectedCity} Grid
        </span>
        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          Lat: {cityCenter.lat.toFixed(4)} · Lng: {cityCenter.lng.toFixed(4)}
        </span>
      </div>

      {/* Legend Overlay */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        background: 'var(--color-bg-card)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-2) var(--space-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        fontSize: '0.72rem',
        pointerEvents: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--peacock-500)' }} />
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontFamily: 'var(--font-body)' }}>Active Store</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--marigold-500)' }} />
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontFamily: 'var(--font-body)' }}>Opportunity Zone</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(194, 59, 59, 0.6)' }} />
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontFamily: 'var(--font-body)' }}>
            Competitor / Saturated
            <span style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', marginLeft: '6px', opacity: 0.8 }}>[OSM Data]</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--saffron-500)', animation: 'pulse 1.2s infinite' }} />
          <span style={{ color: 'var(--saffron-500)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>Live Order Ping</span>
        </div>
      </div>
    </div>
  );
}
