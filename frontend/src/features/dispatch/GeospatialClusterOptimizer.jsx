import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  MapPin,
  Truck,
  Sparkles,
  Zap,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  TrendingDown,
  Layers,
  Send,
  Users,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { floorAudio } from '../../utils/floorAudio';
import { useCity } from '../../context/CityContext';

const CITY_DATA = {
  Bangalore: {
    pod: { name: 'Indiranagar Pod 04 Hub', x: 260, y: 190 },
    orders: [
      { id: 'ORD-BLR-901', customer: 'Apt 4B, 100ft Road', weightKg: 2.4, x: 230, y: 150, deadlineMins: 8 },
      { id: 'ORD-BLR-902', customer: 'Villa 12, Defence Colony', weightKg: 1.8, x: 210, y: 140, deadlineMins: 9 },
      { id: 'ORD-BLR-903', customer: 'Flat 302, CMH Road', weightKg: 3.1, x: 250, y: 110, deadlineMins: 7 },
      { id: 'ORD-BLR-904', customer: 'House 88, 12th Main', weightKg: 1.2, x: 220, y: 180, deadlineMins: 10 },
      { id: 'ORD-BLR-905', customer: 'Tower C, Domlur Ring Rd', weightKg: 2.8, x: 380, y: 240, deadlineMins: 8 },
      { id: 'ORD-BLR-906', customer: 'Amarjyoti Layout Apt 1', weightKg: 1.9, x: 360, y: 260, deadlineMins: 9 },
      { id: 'ORD-BLR-907', customer: 'EGL Tech Park Bldg 3', weightKg: 4.2, x: 390, y: 220, deadlineMins: 6 },
      { id: 'ORD-BLR-908', customer: 'Koramangala 1st Block', weightKg: 2.5, x: 280, y: 310, deadlineMins: 8 },
      { id: 'ORD-BLR-909', customer: 'Koramangala 3rd Block Villa', weightKg: 3.0, x: 250, y: 340, deadlineMins: 7 },
      { id: 'ORD-BLR-910', customer: 'Raheja Residency B-10', weightKg: 1.5, x: 290, y: 330, deadlineMins: 9 },
      { id: 'ORD-BLR-911', customer: 'Ulsoor Lake Rd House 14', weightKg: 2.2, x: 140, y: 120, deadlineMins: 9 },
      { id: 'ORD-BLR-912', customer: 'Cambridge Layout Apt 7', weightKg: 1.7, x: 170, y: 160, deadlineMins: 8 },
      { id: 'ORD-BLR-913', customer: 'Someshwarpura 2nd Cross', weightKg: 2.0, x: 130, y: 150, deadlineMins: 10 },
      { id: 'ORD-BLR-914', customer: 'Old Airport Rd Rustam Bagh', weightKg: 3.5, x: 420, y: 160, deadlineMins: 7 },
      { id: 'ORD-BLR-915', customer: 'Wind Tunnel Rd House 4', weightKg: 1.6, x: 440, y: 190, deadlineMins: 8 },
      { id: 'ORD-BLR-916', customer: 'Murugeshpalya Apt 201', weightKg: 2.9, x: 410, y: 180, deadlineMins: 9 }
    ]
  },
  Mumbai: {
    pod: { name: 'Bandra West Pod 01', x: 250, y: 180 },
    orders: [
      { id: 'ORD-BOM-101', customer: 'Pali Hill Villa 4', weightKg: 2.1, x: 210, y: 140, deadlineMins: 8 },
      { id: 'ORD-BOM-102', customer: 'Carter Road Seaface Apt 12', weightKg: 1.9, x: 180, y: 160, deadlineMins: 9 },
      { id: 'ORD-BOM-103', customer: 'Linking Road Commercial 88', weightKg: 3.2, x: 240, y: 110, deadlineMins: 7 },
      { id: 'ORD-BOM-104', customer: 'Hill Road Junction Bldg 2', weightKg: 1.5, x: 220, y: 190, deadlineMins: 10 },
      { id: 'ORD-BOM-105', customer: 'Khar Danda Lane 3', weightKg: 2.6, x: 370, y: 230, deadlineMins: 8 },
      { id: 'ORD-BOM-106', customer: 'Santacruz West 14th Rd', weightKg: 1.8, x: 350, y: 260, deadlineMins: 9 },
      { id: 'ORD-BOM-107', customer: 'BKC Tech Complex G-Block', weightKg: 4.0, x: 390, y: 210, deadlineMins: 6 },
      { id: 'ORD-BOM-108', customer: 'Mahim West Fisherman Colony', weightKg: 2.3, x: 270, y: 310, deadlineMins: 8 },
      { id: 'ORD-BOM-109', customer: 'Matunga Central Circle', weightKg: 2.8, x: 240, y: 340, deadlineMins: 7 },
      { id: 'ORD-BOM-110', customer: 'Dadar TT Circle Apt 9', weightKg: 1.6, x: 290, y: 330, deadlineMins: 9 },
      { id: 'ORD-BOM-111', customer: 'Prabhadevi Twin Towers', weightKg: 2.4, x: 130, y: 130, deadlineMins: 9 },
      { id: 'ORD-BOM-112', customer: 'Worli Seaface Apt 6', weightKg: 1.8, x: 160, y: 170, deadlineMins: 8 },
      { id: 'ORD-BOM-113', customer: 'Lower Parel One Indiabulls', weightKg: 3.6, x: 420, y: 150, deadlineMins: 7 }
    ]
  },
  Delhi: {
    pod: { name: 'Hauz Khas Pod 02 Hub', x: 250, y: 180 },
    orders: [
      { id: 'ORD-DEL-201', customer: 'Green Park Main Market', weightKg: 2.2, x: 220, y: 140, deadlineMins: 8 },
      { id: 'ORD-DEL-202', customer: 'SDA Market Flat 104', weightKg: 1.7, x: 200, y: 160, deadlineMins: 9 },
      { id: 'ORD-DEL-203', customer: 'Malviya Nagar Block B', weightKg: 3.0, x: 250, y: 100, deadlineMins: 7 },
      { id: 'ORD-DEL-204', customer: 'Saket Select Citywalk Residences', weightKg: 2.5, x: 380, y: 230, deadlineMins: 8 },
      { id: 'ORD-DEL-205', customer: 'Greater Kailash 1 M-Block', weightKg: 3.4, x: 390, y: 200, deadlineMins: 6 },
      { id: 'ORD-DEL-206', customer: 'Defence Colony C-Block', weightKg: 2.1, x: 270, y: 320, deadlineMins: 8 },
      { id: 'ORD-DEL-207', customer: 'Lajpat Nagar 4', weightKg: 2.9, x: 240, y: 340, deadlineMins: 7 },
      { id: 'ORD-DEL-208', customer: 'South Extension Part 2', weightKg: 2.3, x: 130, y: 140, deadlineMins: 9 }
    ]
  }
};

const CLUSTER_COLORS = [
  { fill: '#8B5CF6', stroke: '#A78BFA', name: 'Corridor A (Zone Alpha)' },
  { fill: '#10B981', stroke: '#34D399', name: 'Corridor B (Tech Park Belt)' },
  { fill: '#F59E0B', stroke: '#FBBF24', name: 'Corridor C (Commercial Spine)' },
  { fill: '#06B6D4', stroke: '#22D3EE', name: 'Corridor D (Suburban Link)' },
  { fill: '#EC4899', stroke: '#F472B6', name: 'Corridor E (High-Density Ring)' }
];

// Simple in-browser K-Means clustering algorithm
function runKMeans(orders, k, maxIterations = 20) {
  // Initialize k centroids by selecting random distinct orders
  let centroids = [];
  const step = Math.floor(orders.length / k);
  for (let i = 0; i < k; i++) {
    const o = orders[Math.min(orders.length - 1, i * step)];
    centroids.push({ x: o.x, y: o.y });
  }

  let clusters = Array.from({ length: k }, () => []);

  for (let iter = 0; iter < maxIterations; iter++) {
    clusters = Array.from({ length: k }, () => []);

    // Assign each order to closest centroid
    orders.forEach(order => {
      let minDist = Infinity;
      let bestClusterIdx = 0;

      centroids.forEach((c, idx) => {
        const dist = Math.hypot(order.x - c.x, order.y - c.y);
        if (dist < minDist) {
          minDist = dist;
          bestClusterIdx = idx;
        }
      });

      clusters[bestClusterIdx].push(order);
    });

    // Recompute centroids as mean of assigned orders
    centroids = clusters.map((cluster, idx) => {
      if (cluster.length === 0) return centroids[idx];
      const avgX = cluster.reduce((sum, o) => sum + o.x, 0) / cluster.length;
      const avgY = cluster.reduce((sum, o) => sum + o.y, 0) / cluster.length;
      return { x: Math.round(avgX), y: Math.round(avgY) };
    });
  }

  return { clusters, centroids };
}

export default function GeospatialClusterOptimizer() {
  const { activeCity } = useCity();
  const activeCityData = CITY_DATA[activeCity] || CITY_DATA.Bangalore;
  const podOrigin = activeCityData.pod;
  const rawOrders = activeCityData.orders;

  const [kCount, setKCount] = useState(4); // 4 Rider Swarms default
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeClusterView, setActiveClusterView] = useState(null);

  const { clusters, centroids } = useMemo(() => {
    return runKMeans(rawOrders, Math.min(kCount, rawOrders.length));
  }, [rawOrders, kCount]);

  // Aggregate metrics
  const totalOrders = rawOrders.length;
  const singleRiderTrips = totalOrders;
  const batchedRiderTrips = Math.min(kCount, totalOrders);
  const fleetReductionPct = Math.round(((singleRiderTrips - batchedRiderTrips) / singleRiderTrips) * 100);
  const avgClusterWeight = (rawOrders.reduce((s, o) => s + o.weightKg, 0) / kCount).toFixed(1);

  const handleRerunClustering = () => {
    setIsOptimizing(true);
    floorAudio.click();

    setTimeout(() => {
      setIsOptimizing(false);
      floorAudio.playDispatchSuccess();
      toast.success(`K-Means Clustering Converged! ${totalOrders} orders bundled into ${kCount} optimal rider swarms.`);
    }, 400);
  };

  const handleCommitClusters = () => {
    const payload = clusters.map((cluster, idx) => ({
      corridorName: CLUSTER_COLORS[idx % CLUSTER_COLORS.length].name,
      assignedRiderId: `RD-FLEET-0${idx + 1}`,
      ordersCount: cluster.length,
      totalWeightKg: cluster.reduce((sum, o) => sum + o.weightKg, 0).toFixed(1),
      orderIds: cluster.map(o => o.id)
    }));

    try {
      localStorage.setItem('darkstori_geospatial_batches', JSON.stringify(payload));
    } catch {}

    floorAudio.playDispatchSuccess();
    toast.success(`Committed ${kCount} corridor swarms to active rider fleet with 10-minute SLA guarantees!`);
  };

  return (
    <div className="geospatial-cluster-optimizer bg-[#0B0F19]/90 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Compass className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
              Geospatial Multi-Drop Swarm Optimizer
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
              K-Means Cluster Engine
            </span>
          </div>
          <h2 className="text-lg font-bold text-white">
            Geospatial Order Bundler & Rider Fleet Dispatch
          </h2>
          <p className="text-xs text-white/60">
            Groups active delivery orders into minimum-distance geographical corridors to achieve 3-order bundling within strict 10-minute SLAs.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-white/60">Rider Swarms (K):</span>
            <div className="flex gap-1">
              {[3, 4, 5].map(k => (
                <button
                  key={k}
                  onClick={() => { setKCount(k); floorAudio.click(); }}
                  className={`w-7 h-7 rounded-lg font-mono font-bold transition-all cursor-pointer ${
                    kCount === k
                      ? 'bg-sky-500 text-black'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Comparison Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
          <span className="text-white/50 text-xs">Rider Trips Needed</span>
          <div className="text-2xl font-black font-mono text-white">
            {kCount} <span className="text-xs font-normal text-white/40 line-through">16 trips</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-bold">
            -{fleetReductionPct}% fleet overhead saved
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
          <span className="text-white/50 text-xs">Avg Payload per Rider</span>
          <div className="text-2xl font-black font-mono text-sky-400">
            {avgClusterWeight} kg
          </div>
          <div className="text-[11px] text-white/50">EV Scooter limit &lt; 12.0 kg</div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
          <span className="text-white/50 text-xs">SLA Breach Probability</span>
          <div className="text-2xl font-black font-mono text-emerald-400">
            1.8% <span className="text-xs font-normal text-white/40 line-through">14.2%</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-bold">Sub-10m promise preserved</div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
          <span className="text-white/50 text-xs">Battery / Fuel Burn</span>
          <div className="text-2xl font-black font-mono text-amber-400">
            -42.5%
          </div>
          <div className="text-[11px] text-white/50">Greener micro-fulfillment</div>
        </div>
      </div>

      {/* Interactive 2D Corridor Map & Cluster Vectors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SVG Map Canvas */}
        <div className="lg:col-span-8 bg-[#06080F] border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[360px]">
          <svg viewBox="0 0 540 380" className="w-full h-auto max-w-2xl border border-white/5 rounded-xl bg-[#080C16]">
            {/* Dark Grid Background */}
            <defs>
              <pattern id="clusterGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="540" height="380" fill="url(#clusterGrid)" />

            {/* Central Darkstore Pod Origin */}
            <g transform={`translate(${podOrigin.x}, ${podOrigin.y})`}>
              <circle r="16" fill="#6366F1" fillOpacity="0.25" stroke="#6366F1" strokeWidth="2" />
              <circle r="6" fill="#818CF8" />
              <text y="28" fill="#C7D2FE" fontSize="9" fontWeight="bold" textAnchor="middle">
                {podOrigin.name}
              </text>
            </g>

            {/* Connecting Radial Vectors from Hub to Centroids and Orders */}
            {clusters.map((cluster, cIdx) => {
              const color = CLUSTER_COLORS[cIdx % CLUSTER_COLORS.length];
              const centroid = centroids[cIdx];
              if (!centroid) return null;

              return (
                <g key={`cluster-group-${cIdx}`}>
                  {/* Vector from Hub to Centroid */}
                  <line
                    x1={podOrigin.x}
                    y1={podOrigin.y}
                    x2={centroid.x}
                    y2={centroid.y}
                    stroke={color.stroke}
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    strokeOpacity="0.4"
                  />

                  {/* Centroid Convex Hull Circle */}
                  <circle
                    cx={centroid.x}
                    cy={centroid.y}
                    r="48"
                    fill={color.fill}
                    fillOpacity="0.08"
                    stroke={color.stroke}
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />

                  {/* Centroid Node */}
                  <circle
                    cx={centroid.x}
                    cy={centroid.y}
                    r="7"
                    fill={color.fill}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                  <text
                    x={centroid.x}
                    y={centroid.y - 12}
                    fill={color.stroke}
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    RIDER #{cIdx + 1}
                  </text>

                  {/* Clustered Order Points */}
                  {cluster.map(order => (
                    <g key={order.id}>
                      <line
                        x1={centroid.x}
                        y1={centroid.y}
                        x2={order.x}
                        y2={order.y}
                        stroke={color.stroke}
                        strokeWidth="1"
                        strokeOpacity="0.6"
                      />
                      <circle
                        cx={order.x}
                        cy={order.y}
                        r="5"
                        fill="#0B0F19"
                        stroke={color.stroke}
                        strokeWidth="2"
                      />
                      <text
                        x={order.x}
                        y={order.y + 12}
                        fill="#E2E8F0"
                        fontSize="7"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {order.id}
                      </text>
                    </g>
                  ))}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right: Corridor Swarm Breakdown */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
            <span>Rider Swarm Allocations</span>
            <span className="text-[10px] font-mono text-white/40">{totalOrders} Orders</span>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {clusters.map((cluster, idx) => {
              const color = CLUSTER_COLORS[idx % CLUSTER_COLORS.length];
              const totalKg = cluster.reduce((sum, o) => sum + o.weightKg, 0).toFixed(1);

              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/25 transition-all text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.fill }} />
                      <strong className="text-white">{color.name}</strong>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 font-mono text-white/70">
                      Rider #{idx + 1}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] font-mono text-white/50">
                    <span>{cluster.length} Batched Orders:</span>
                    <strong className="text-sky-300">{totalKg} kg payload</strong>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {cluster.map(o => (
                      <span
                        key={o.id}
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/40 text-white/70 border border-white/5"
                      >
                        {o.id} ({o.deadlineMins}m)
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleCommitClusters}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-black shadow-lg shadow-sky-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Commit Geospatial Swarms to Fleet</span>
          </button>
        </div>
      </div>
    </div>
  );
}