import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  MapPin,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  DollarSign,
  Clock,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Info,
  Maximize2,
  Radar,
  Radio,
  Truck,
  Package,
  ThermometerSnowflake,
  RefreshCw,
  Search,
  Send,
  Building2,
  ArrowRightLeft,
  X
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { useCity } from '../../context/CityContext';
import axios from 'axios';
import { toast } from 'sonner';
import { floorAudio } from '../../utils/floorAudio';

const INDIAN_METRO_HUBS = {
  Bangalore: [
    {
      id: 'store-blr-01',
      name: 'Koramangala 4th Block Central',
      locality: 'Koramangala Core',
      x: 210,
      y: 130,
      activeOrders: 42,
      pickLatencySecs: 38,
      slaAdherencePct: 99.4,
      chillerTempC: 2.4,
      ridersActive: 16,
      stockoutRiskSkus: 0,
      netEbitdaInr: 124500,
      status: 'HEALTHY'
    },
    {
      id: 'store-blr-02',
      name: 'Indiranagar 100ft Road Hub',
      locality: 'Indiranagar & Domlur',
      x: 270,
      y: 85,
      activeOrders: 58,
      pickLatencySecs: 44,
      slaAdherencePct: 98.8,
      chillerTempC: 3.1,
      ridersActive: 22,
      stockoutRiskSkus: 1,
      netEbitdaInr: 182000,
      status: 'HEALTHY'
    },
    {
      id: 'store-blr-03',
      name: 'HSR Layout Sector 2 Pod',
      locality: 'HSR Residential Belt',
      x: 250,
      y: 195,
      activeOrders: 36,
      pickLatencySecs: 52,
      slaAdherencePct: 96.2,
      chillerTempC: 2.8,
      ridersActive: 14,
      stockoutRiskSkus: 3,
      netEbitdaInr: 96000,
      status: 'STOCKOUT_RISK'
    },
    {
      id: 'store-blr-04',
      name: 'Whitefield ITPL Corridor',
      locality: 'Whitefield Tech Spine',
      x: 400,
      y: 110,
      activeOrders: 64,
      pickLatencySecs: 48,
      slaAdherencePct: 97.9,
      chillerTempC: 4.8,
      ridersActive: 24,
      stockoutRiskSkus: 0,
      netEbitdaInr: 215000,
      status: 'CHILLER_WARNING'
    },
    {
      id: 'store-blr-05',
      name: 'Jayanagar 4th Block Metro',
      locality: 'South Bangalore Heritage',
      x: 160,
      y: 210,
      activeOrders: 28,
      pickLatencySecs: 36,
      slaAdherencePct: 99.8,
      chillerTempC: 2.2,
      ridersActive: 11,
      stockoutRiskSkus: 0,
      netEbitdaInr: 89000,
      status: 'HEALTHY'
    },
    {
      id: 'store-blr-06',
      name: 'Bellandur Outer Ring Road',
      locality: 'EcoSpace Tech Corridor',
      x: 320,
      y: 165,
      activeOrders: 51,
      pickLatencySecs: 64,
      slaAdherencePct: 94.1,
      chillerTempC: 2.6,
      ridersActive: 18,
      stockoutRiskSkus: 2,
      netEbitdaInr: 142000,
      status: 'SLA_ELEVATED'
    }
  ],
  Mumbai: [
    {
      id: 'store-bom-01',
      name: 'Bandra West Linking Road',
      locality: 'Bandra Coastal',
      x: 180,
      y: 120,
      activeOrders: 62,
      pickLatencySecs: 39,
      slaAdherencePct: 99.1,
      chillerTempC: 2.5,
      ridersActive: 25,
      stockoutRiskSkus: 0,
      netEbitdaInr: 210000,
      status: 'HEALTHY'
    },
    {
      id: 'store-bom-02',
      name: 'BKC G-Block Commercial',
      locality: 'Bandra-Kurla Complex',
      x: 260,
      y: 140,
      activeOrders: 78,
      pickLatencySecs: 42,
      slaAdherencePct: 98.7,
      chillerTempC: 2.7,
      ridersActive: 31,
      stockoutRiskSkus: 1,
      netEbitdaInr: 290000,
      status: 'HEALTHY'
    },
    {
      id: 'store-bom-03',
      name: 'Andheri West Lokhandwala',
      locality: 'Andheri Residential',
      x: 200,
      y: 70,
      activeOrders: 54,
      pickLatencySecs: 56,
      slaAdherencePct: 95.8,
      chillerTempC: 4.6,
      ridersActive: 20,
      stockoutRiskSkus: 3,
      netEbitdaInr: 165000,
      status: 'CHILLER_WARNING'
    }
  ],
  'Delhi NCR': [
    {
      id: 'store-del-01',
      name: 'Cyber City Phase 2 Hub',
      locality: 'Gurgaon DLF Cyber City',
      x: 220,
      y: 190,
      activeOrders: 82,
      pickLatencySecs: 41,
      slaAdherencePct: 99.2,
      chillerTempC: 2.3,
      ridersActive: 34,
      stockoutRiskSkus: 0,
      netEbitdaInr: 320000,
      status: 'HEALTHY'
    },
    {
      id: 'store-del-02',
      name: 'South Extension Part 2',
      locality: 'South Delhi Urban',
      x: 270,
      y: 110,
      activeOrders: 49,
      pickLatencySecs: 46,
      slaAdherencePct: 98.1,
      chillerTempC: 2.9,
      ridersActive: 19,
      stockoutRiskSkus: 2,
      netEbitdaInr: 175000,
      status: 'STOCKOUT_RISK'
    },
    {
      id: 'store-del-03',
      name: 'Noida Sector 62 IT Pod',
      locality: 'Noida Expressway',
      x: 380,
      y: 130,
      activeOrders: 53,
      pickLatencySecs: 45,
      slaAdherencePct: 97.4,
      chillerTempC: 2.6,
      ridersActive: 21,
      stockoutRiskSkus: 0,
      netEbitdaInr: 188000,
      status: 'HEALTHY'
    }
  ]
};

export default function NocPage() {
  const { roleConfig, isFirstTimeUser } = useRole();
  const { activeCity, setActiveCity } = useCity();

  const currentCity = activeCity && INDIAN_METRO_HUBS[activeCity] ? activeCity : 'Bangalore';
  const [stores, setStores] = useState(INDIAN_METRO_HUBS[currentCity]);
  const [selectedStore, setSelectedStore] = useState(INDIAN_METRO_HUBS[currentCity][0]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Transfer Form State
  const [transferOrigin, setTransferOrigin] = useState(INDIAN_METRO_HUBS[currentCity][0]?.name);
  const [transferDestination, setTransferDestination] = useState(INDIAN_METRO_HUBS[currentCity][2]?.name);
  const [transferSku, setTransferSku] = useState('Nandini Farm Fresh Curd Pouch 500g');
  const [transferQty, setTransferQty] = useState(30);

  useEffect(() => {
    const list = INDIAN_METRO_HUBS[currentCity] || INDIAN_METRO_HUBS['Bangalore'];
    setStores(list);
    setSelectedStore(list[0]);
    setTransferOrigin(list[0]?.name);
    setTransferDestination(list[1]?.name || list[0]?.name);
  }, [currentCity]);

  // Aggregate Metrics
  const totalNetworkOrders = stores.reduce((sum, s) => sum + s.activeOrders, 0);
  const totalRidersActive = stores.reduce((sum, s) => sum + s.ridersActive, 0);
  const avgPickLatency = Math.round(stores.reduce((sum, s) => sum + s.pickLatencySecs, 0) / stores.length);
  const totalMonthlyEbitda = stores.reduce((sum, s) => sum + s.netEbitdaInr, 0);

  const filteredStores = stores.filter(store => {
    const matchStatus = statusFilter === 'ALL' || store.status === statusFilter;
    const matchQuery = !searchQuery || store.name.toLowerCase().includes(searchQuery.toLowerCase()) || store.locality.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchQuery;
  });

  const handleSelectStore = (store) => {
    setSelectedStore(store);
    floorAudio.click();
  };

  const handleDispatchTransfer = () => {
    floorAudio.success();
    toast.success(`Inter-store balancing runner dispatched from ${transferOrigin} to ${transferDestination} for ${transferQty}x ${transferSku}`);
    setTransferModalOpen(false);
  };

  return (
    <div className="darkstor-feature-page p-4 sm:p-6 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* 1. SCROLLABLE FEATURE HEADER */}
      <div className="feature-header-banner p-6 rounded-2xl bg-white/[0.02] border border-white/10 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm">
                <Radio className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                Network Intelligence · Metro NOC
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                Primary: Executive & Fleet Lens
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Network Operations Center (NOC) & Multi-Store Radar
            </h1>
            <p className="text-sm text-white/60 max-w-3xl mt-1 leading-relaxed">
              Provides real-time city-wide visibility across all dark stores in {currentCity}. Monitors pick cycle latency,
              cold-chain chiller telemetry, live delivery corridors, and orchestrates intra-network stock rebalancing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTransferModalOpen(true)}
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-amber-400 hover:bg-amber-300 text-black transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Inter-Store Stock Transfer</span>
            </button>
          </div>
        </div>

        {isFirstTimeUser && (
          <div className="mt-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs text-amber-200">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
            <div>
              <strong>Executive NOC Overview:</strong> Click on any dark store on the city radar map below to inspect live store metrics. If an Indian store (e.g. HSR Sector 2) reports a stockout risk, click "Inter-Store Stock Transfer" to route surplus inventory from adjacent hubs.
            </div>
          </div>
        )}
      </div>

      {/* 2. MACRO CITY TELEMETRY RIBBON */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div whileHover={{ y: -2 }} className="kpi-card p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Metro Active Orders</span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{totalNetworkOrders} <span className="text-xs font-normal text-white/40">drops in flight</span></div>
          <div className="text-[11px] text-white/40 mt-1">Across {stores.length} dark store pods</div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="kpi-card p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Network Avg Pick Time</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">{avgPickLatency}s <span className="text-xs font-normal text-white/40">/ order</span></div>
          <div className="text-[11px] text-emerald-400 mt-1">Sub-60s SLA compliance</div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="kpi-card p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Active Swarm Fleet</span>
            <Truck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{totalRidersActive} <span className="text-xs font-normal text-white/40">2-wheelers</span></div>
          <div className="text-[11px] text-white/40 mt-1">96% active on-road ratio</div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="kpi-card p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Net Monthly Run-Rate</span>
            <DollarSign className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">₹{(totalMonthlyEbitda / 100000).toFixed(1)}L <span className="text-xs font-normal text-white/40">EBITDA</span></div>
          <div className="text-[11px] text-emerald-400 mt-1">Positive store contribution</div>
        </motion.div>
      </div>

      {/* 3. DUAL-PANE: CITY NOC RADAR MAP + STORE INSPECTOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* City Network SVG Canvas */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Radar className="w-4 h-4 text-amber-400" />
                <h2 className="text-base font-bold text-white">Metro Network Mesh — {currentCity}</h2>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-emerald-400 font-mono">Live Telemetry</span>
              </div>
            </div>

            {/* City Network SVG Map */}
            <div className="relative h-80 rounded-xl bg-black/80 border border-white/10 overflow-hidden flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 500 300">
                <defs>
                  <pattern id="nocGrid" width="25" height="25" patternUnits="userSpaceOnUse">
                    <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  </pattern>
                </defs>

                <rect width="100%" height="100%" fill="url(#nocGrid)" />

                {/* Inter-Store Mesh Transport Links */}
                {stores.map((s, idx) => {
                  if (idx === stores.length - 1) return null;
                  const nextStore = stores[idx + 1];
                  return (
                    <line
                      key={`link-${idx}`}
                      x1={s.x}
                      y1={s.y}
                      x2={nextStore.x}
                      y2={nextStore.y}
                      stroke="rgba(245, 158, 11, 0.15)"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {/* Dark Store Nodes */}
                {stores.map(store => {
                  const isSelected = selectedStore?.id === store.id;
                  const isChillerWarning = store.status === 'CHILLER_WARNING';
                  const isStockoutRisk = store.status === 'STOCKOUT_RISK';
                  const isSlaElevated = store.status === 'SLA_ELEVATED';

                  const nodeColor = isChillerWarning
                    ? '#EF4444'
                    : isStockoutRisk
                    ? '#F59E0B'
                    : isSlaElevated
                    ? '#8B5CF6'
                    : '#10B981';

                  return (
                    <g
                      key={store.id}
                      transform={`translate(${store.x}, ${store.y})`}
                      onClick={() => handleSelectStore(store)}
                      className="cursor-pointer group"
                    >
                      {/* Pulse ring */}
                      <circle
                        r={isSelected ? "18" : "12"}
                        fill={nodeColor}
                        fillOpacity="0.15"
                        stroke={nodeColor}
                        strokeWidth="1.5"
                      />

                      {/* Center dot */}
                      <circle
                        r="6"
                        fill={nodeColor}
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />

                      {/* Label */}
                      <text
                        x="12"
                        y="4"
                        fill="#FFFFFF"
                        fontSize="9"
                        fontWeight={isSelected ? "bold" : "normal"}
                        className="select-none pointer-events-none drop-shadow"
                      >
                        {store.name.split(' ')[0]} ({store.activeOrders})
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div className="absolute bottom-3 left-3 text-[11px] font-mono bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white/80">
                Selected: <span className="text-amber-400 font-bold">{selectedStore?.name}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
            <span>Inter-Store Mesh: 100% road network synchronized</span>
            <span className="text-emerald-400 font-mono">Status: All Pods Online</span>
          </div>
        </div>

        {/* Selected Dark Store Telemetry Card */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">POD TELEMETRY</span>
              <h2 className="text-base font-bold text-white">{selectedStore?.name}</h2>
              <span className="text-xs text-white/50">{selectedStore?.locality}</span>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
              selectedStore?.status === 'HEALTHY'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : selectedStore?.status === 'CHILLER_WARNING'
                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {selectedStore?.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-white/50 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-400" /> Avg Pick Latency
              </span>
              <div className="text-lg font-bold text-white font-mono">{selectedStore?.pickLatencySecs}s</div>
              <span className="text-[10px] text-emerald-400">Target &lt; 45s</span>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-white/50 flex items-center gap-1">
                <ThermometerSnowflake className="w-3.5 h-3.5 text-sky-400" /> Chiller Temperature
              </span>
              <div className={`text-lg font-bold font-mono ${selectedStore?.chillerTempC > 4.0 ? 'text-red-400' : 'text-sky-300'}`}>
                {selectedStore?.chillerTempC}°C
              </div>
              <span className="text-[10px] text-white/40">Walk-in Cold Room</span>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-white/50 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-emerald-400" /> Swarm Riders Active
              </span>
              <div className="text-lg font-bold text-emerald-400 font-mono">{selectedStore?.ridersActive}</div>
              <span className="text-[10px] text-white/40">Dedicated fleet</span>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-white/50 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Stockout Risks
              </span>
              <div className={`text-lg font-bold font-mono ${selectedStore?.stockoutRiskSkus > 0 ? 'text-amber-400' : 'text-white'}`}>
                {selectedStore?.stockoutRiskSkus} SKUs
              </div>
              <span className="text-[10px] text-white/40">Critical threshold</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                setTransferDestination(selectedStore?.name);
                setTransferModalOpen(true);
              }}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition-all flex items-center justify-center gap-2"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>Route Emergency Stock to this Pod</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. ALL METRO STORES REGISTRY TABLE */}
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-white">Active Dark Store Registry ({stores.length} Pods)</h2>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            {['ALL', 'HEALTHY', 'STOCKOUT_RISK', 'CHILLER_WARNING'].map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  statusFilter === f ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-white/5 border-white/10 text-white/60'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/50 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Dark Store Pod</th>
                <th className="pb-3 font-semibold">Active Orders</th>
                <th className="pb-3 font-semibold">Pick Cycle</th>
                <th className="pb-3 font-semibold">SLA Adherence</th>
                <th className="pb-3 font-semibold">Cold Room</th>
                <th className="pb-3 font-semibold">Fleet</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {filteredStores.map(store => (
                <tr
                  key={store.id}
                  onClick={() => handleSelectStore(store)}
                  className={`hover:bg-white/[0.02] cursor-pointer transition-colors ${
                    selectedStore?.id === store.id ? 'bg-white/[0.04]' : ''
                  }`}
                >
                  <td className="py-3.5 font-medium text-white">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>{store.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 font-mono font-bold text-white">{store.activeOrders}</td>
                  <td className="py-3.5 font-mono">{store.pickLatencySecs}s</td>
                  <td className="py-3.5 font-mono text-emerald-400">{store.slaAdherencePct}%</td>
                  <td className="py-3.5 font-mono">
                    <span className={store.chillerTempC > 4.0 ? 'text-red-400 font-bold' : 'text-sky-300'}>
                      {store.chillerTempC}°C
                    </span>
                  </td>
                  <td className="py-3.5 font-mono text-white/80">{store.ridersActive} riders</td>
                  <td className="py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      store.status === 'HEALTHY'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : store.status === 'CHILLER_WARNING'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {store.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inter-Store Stock Balancing Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-6 rounded-2xl bg-surface border border-white/15 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                <span>Inter-Store Stock Balancing Runner</span>
              </h3>
              <button onClick={() => setTransferModalOpen(false)} className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-white/60 block mb-1">Origin Dark Store (Surplus Inventory)</label>
                <select
                  value={transferOrigin}
                  onChange={(e) => setTransferOrigin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white outline-none"
                >
                  {stores.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-white/60 block mb-1">Destination Dark Store (Imminent Stockout)</label>
                <select
                  value={transferDestination}
                  onChange={(e) => setTransferDestination(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white outline-none"
                >
                  {stores.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-white/60 block mb-1">SKU to Rebalance</label>
                <input
                  type="text"
                  value={transferSku}
                  onChange={(e) => setTransferSku(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-white/60 block mb-1">Transfer Units (Packets/Bottles)</label>
                <input
                  type="number"
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setTransferModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDispatchTransfer}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Runner</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
