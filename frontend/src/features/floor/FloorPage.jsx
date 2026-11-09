import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  MapPin,
  Clock,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Move,
  Flame,
  Info,
  Maximize2,
  Eye,
  Route,
  Zap,
  CornerDownRight
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { useCity } from '../../context/CityContext';
import { toast } from 'sonner';
import { floorAudio } from '../../utils/floorAudio';

const AISLE_DATA = [
  { id: 1, name: 'Aisle 01', category: 'High-Velocity Dairy & Chilled', items: ['Amul Milk 500ml', 'Nandini Curd 500g', 'Butter 100g'], picksPerHour: 184, heat: 92 },
  { id: 2, name: 'Aisle 02', category: 'Bakery & Morning Essentials', items: ['Modern Bread 400g', 'Farm Eggs (6pk)', 'Rusk Toast'], picksPerHour: 142, heat: 78 },
  { id: 3, name: 'Aisle 03', category: 'Beverages & Carbonates', items: ['Coke Zero 330ml', 'Tender Coconut 1pc', 'Red Bull 250ml'], picksPerHour: 98, heat: 56 },
  { id: 4, name: 'Aisle 04', category: 'Salty Snacks & Confectionery', items: ['Lays Chips 115g', 'Kurkure Masala', 'Cadbury Dairy Milk'], picksPerHour: 110, heat: 64 },
  { id: 5, name: 'Aisle 05', category: 'Pantry Staples & Spices', items: ['Aashirvaad Atta 5kg', 'Fortune Sunflower Oil 1L', 'Tata Salt 1kg'], picksPerHour: 48, heat: 28 },
  { id: 6, name: 'Aisle 06', category: 'Personal Care & Household', items: ['Dettol Handwash', 'Ariel Matic Liquid', 'Colgate Total'], picksPerHour: 34, heat: 18 }
];

export default function FloorPage() {
  const { roleConfig, isFirstTimeUser } = useRole();
  const { activeCity } = useCity();

  const [selectedHub, setSelectedHub] = useState('Zepto Koramangala Hub');
  const [aisleCount, setAisleCount] = useState(6);
  const [routeMode, setRouteMode] = useState('shortest_path'); // 'serpentine', 'shortest_path'
  const [goldenZonePct, setGoldenZonePct] = useState(20);
  const [inspectedAisle, setInspectedAisle] = useState(AISLE_DATA[0]);

  // Dynamic simulation metrics
  const pickSeconds = routeMode === 'shortest_path' ? 38 : 108;
  const pickerWalkingMeters = routeMode === 'shortest_path' ? 34 : 92;
  const congestionScore = aisleCount >= 6 ? 12 : 36;

  const handleSaveLayout = () => {
    floorAudio.success();
    toast.success(`Micro-Warehouse Floor Twin layout committed to Neon DB for ${selectedHub}!`);
  };

  const handleSelectAisle = (aisle) => {
    setInspectedAisle(aisle);
    floorAudio.click();
  };

  return (
    <div className="darkstor-feature-page p-4 sm:p-6 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* 1. SCROLLABLE FEATURE HEADER */}
      <div className="feature-header-banner p-6 rounded-2xl bg-white/[0.02] border border-white/10 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-sm">
                <Layers className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
                Feature 03 · Floor Digital Twin
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                Primary: Store GM Lens
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Micro-Warehouse Floor Twin & Picker Route Optimizer
            </h1>
            <p className="text-sm text-white/60 max-w-3xl mt-1 leading-relaxed">
              Compresses pick-to-bag cycles from 150 seconds to under 40 seconds. Generates real-time aisle congestion
              heatmaps, rebalances "Golden Zone" shelf slots based on SKU affinity, and simulates collision-free picker routes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveLayout}
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-purple-500 hover:bg-purple-400 text-white transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Commit Floor Layout</span>
            </button>
          </div>
        </div>

        {isFirstTimeUser && (
          <div className="mt-5 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-start gap-3 text-xs text-purple-200">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-purple-400" />
            <div>
              <strong>Store GM Digital Twin Setup:</strong> Click on any aisle in the 2D Floor Plan to inspect its high-demand items. Toggle between "Shortest Path" and "Serpentine" to view picker walking distance drop from 92m down to 34m.
            </div>
          </div>
        )}
      </div>

      {/* 2. TELEMETRY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div whileHover={{ y: -2 }} className="kpi-card p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Avg Pick-to-Bag Time</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">{pickSeconds}s <span className="text-xs font-normal text-white/40">/ order</span></div>
          <div className="text-[11px] text-emerald-400 mt-1">Sub-40s SLA threshold active</div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="kpi-card p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Picker Walking Distance</span>
            <Move className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{pickerWalkingMeters} <span className="text-xs font-normal text-white/40">meters</span></div>
          <div className="text-[11px] text-emerald-400 mt-1">-63% vs traditional serpentine</div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="kpi-card p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Aisle Congestion Probability</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{congestionScore}%</div>
          <div className="text-[11px] text-white/40 mt-1">Collision buffer cleared</div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="kpi-card p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Golden Zone Slotting</span>
            <Sparkles className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white">{goldenZonePct}% <span className="text-xs font-normal text-white/40">SKUs</span></div>
          <div className="text-[11px] text-sky-400 mt-1">Front racking eye-level</div>
        </motion.div>
      </div>

      {/* 3. INTERACTIVE CONTROLS + 2D RACKING GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Pane: Layout Configuration */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Layout Controls</span>
            </h2>
            <span className="text-xs text-emerald-400 font-mono">Neon Live</span>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">Dark Store Micro-Hub</label>
              <select
                value={selectedHub}
                onChange={(e) => setSelectedHub(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none"
              >
                <option value="Zepto Koramangala Hub">Zepto Koramangala Hub (2,400 sq.ft)</option>
                <option value="Blinkit Indiranagar Central">Blinkit Indiranagar Central (3,100 sq.ft)</option>
                <option value="Instamart HSR Sector 2">Instamart HSR Sector 2 (2,800 sq.ft)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">Picker Routing Algorithm</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setRouteMode('shortest_path'); floorAudio.click(); }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                    routeMode === 'shortest_path'
                      ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                      : 'bg-white/5 border-white/10 text-white/60'
                  }`}
                >
                  Shortest Path (34m)
                </button>
                <button
                  onClick={() => { setRouteMode('serpentine'); floorAudio.click(); }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                    routeMode === 'serpentine'
                      ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                      : 'bg-white/5 border-white/10 text-white/60'
                  }`}
                >
                  Serpentine S-Path (92m)
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-white/70">Aisles Rack Layout</span>
                <span className="font-mono text-purple-400 font-bold">{aisleCount} Aisles Active</span>
              </div>
              <input
                type="range"
                min="4"
                max="8"
                step="1"
                value={aisleCount}
                onChange={(e) => setAisleCount(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-white/70">Golden Zone Eye-Level Slotting</span>
                <span className="font-mono text-amber-400 font-bold">Top {goldenZonePct}% Volume</span>
              </div>
              <input
                type="range"
                min="10"
                max="35"
                step="5"
                value={goldenZonePct}
                onChange={(e) => setGoldenZonePct(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Aisle Slotting Inspector */}
            {inspectedAisle && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{inspectedAisle.name}</span>
                  <span className="text-[10px] font-mono text-purple-300">{inspectedAisle.picksPerHour} picks/hr</span>
                </div>
                <div className="text-[11px] text-white/70">{inspectedAisle.category}</div>
                <div className="text-[10px] text-white/50 pt-1 border-t border-white/10">
                  Slotted SKUs: {inspectedAisle.items.join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: 2D Digital Twin Warehouse Floor Plan */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Route className="w-4 h-4 text-purple-400" />
                <span>Micro-Warehouse 2D Twin with Live Picker Route</span>
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Live Heatmap & Path
              </span>
            </div>

            {/* Warehouse Floor 2D Canvas */}
            <div className="p-4 rounded-xl bg-black/70 border border-white/10 relative overflow-hidden space-y-4">
              {/* Rear Dock & Cold Room */}
              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-white/10 text-[11px] text-white/60">
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-center font-mono">
                  INBOUND RECEIVING DOCK (REAR)
                </div>
                <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 text-center font-mono flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                  WALK-IN COLD ROOM [2.4°C]
                </div>
              </div>

              {/* Racking Aisles Grid */}
              <div className="grid grid-cols-6 gap-2.5 py-3 relative">
                {/* SVG Route Path Overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 600 160">
                  {routeMode === 'shortest_path' ? (
                    <path
                      d="M 50 140 L 70 40 L 170 40 L 170 140 L 270 140"
                      stroke="#8B5CF6"
                      strokeWidth="3"
                      strokeDasharray="6 4"
                      fill="none"
                    >
                      <animate attributeName="stroke-dashoffset" values="0;-20" dur="1s" repeatCount="indefinite" />
                    </path>
                  ) : (
                    <path
                      d="M 50 140 L 50 20 L 150 20 L 150 140 L 250 140 L 250 20 L 350 20 L 350 140 L 450 140 L 450 20"
                      stroke="#F59E0B"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                      fill="none"
                    >
                      <animate attributeName="stroke-dashoffset" values="0;-20" dur="1.5s" repeatCount="indefinite" />
                    </path>
                  )}
                </svg>

                {AISLE_DATA.slice(0, aisleCount).map((aisle, idx) => {
                  const isGolden = idx < 2;
                  const isSelected = inspectedAisle?.id === aisle.id;
                  return (
                    <motion.div
                      key={aisle.id}
                      onClick={() => handleSelectAisle(aisle)}
                      whileHover={{ scale: 1.02 }}
                      className={`p-3 rounded-xl border flex flex-col justify-between h-40 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-purple-400 bg-purple-500/20 shadow-[0_0_16px_rgba(139,92,246,0.25)]'
                          : isGolden
                          ? 'border-amber-500/30 bg-amber-500/10 hover:border-amber-400'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-mono font-bold text-white">{aisle.name}</span>
                        <span className={`w-2 h-2 rounded-full ${isGolden ? 'bg-amber-400' : 'bg-purple-400'}`} />
                      </div>

                      {/* Shelf rack levels */}
                      <div className="space-y-1.5 w-full my-auto">
                        <div className="h-1.5 rounded-full bg-white/20" title="Top Shelf" />
                        <div
                          className={`h-2 rounded-full ${isGolden ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-purple-400/50'}`}
                          title="Eye Level (Golden Zone)"
                        />
                        <div className="h-1.5 rounded-full bg-white/15" title="Bottom Shelf" />
                      </div>

                      <div className="text-[9px] font-bold uppercase tracking-wider text-center">
                        <span className={isGolden ? 'text-amber-300' : 'text-white/40'}>
                          {isGolden ? 'Golden Zone' : 'Standard'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Front Dispatch & Optical Quality Staging */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-center">
                  PACKING DOCK 01 & OPTICAL VISION
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-center">
                  PACKING DOCK 02 & RIDER HANDOFF
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-white/50">
            <span>Golden Zone Items: Fresh Milk, Curd, Bread, Cold Drinks</span>
            <span className="text-purple-400 font-mono">Routing: {routeMode.replace('_', ' ').toUpperCase()} ({pickerWalkingMeters}m)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
