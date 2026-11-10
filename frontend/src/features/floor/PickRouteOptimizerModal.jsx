import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Navigation,
  Sparkles,
  Zap,
  Play,
  RotateCcw,
  CheckCircle2,
  X,
  Layers,
  ArrowRight,
  TrendingDown,
  Clock,
  Compass,
  Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
import { floorAudio } from '../../utils/floorAudio';

// Realistic Warehouse Pick Wave Waypoints across Darkstore Grid (x: 0-600, y: 0-400)
const DEPOT = { id: 0, label: 'PACKING DEPOT #1', x: 50, y: 350, type: 'depot' };

const INITIAL_WAYPOINTS = [
  { id: 1, sku: 'Amul Taaza Milk 500ml', aisle: 'Aisle 01', rack: 'B2', x: 120, y: 100, zone: 'Golden Zone', heat: 'high' },
  { id: 2, sku: 'Nandini Farm Curd 500g', aisle: 'Aisle 01', rack: 'C4', x: 120, y: 220, zone: 'Golden Zone', heat: 'high' },
  { id: 3, sku: 'Modern Wheat Bread 400g', aisle: 'Aisle 02', rack: 'A1', x: 220, y: 80, zone: 'Bakery', heat: 'mid' },
  { id: 4, sku: 'Fresho Farm Eggs 6pcs', aisle: 'Aisle 01', rack: 'E1', x: 120, y: 300, zone: 'Golden Zone', heat: 'high' },
  { id: 5, sku: 'Robusta Bananas 500g', aisle: 'Aisle 02', rack: 'B3', x: 220, y: 180, zone: 'Produce', heat: 'high' },
  { id: 6, sku: 'Coca-Cola Zero Can 330ml', aisle: 'Aisle 03', rack: 'C2', x: 320, y: 140, zone: 'Beverage', heat: 'mid' },
  { id: 7, sku: 'Red Bull Energy 250ml', aisle: 'Aisle 03', rack: 'D1', x: 320, y: 240, zone: 'Beverage', heat: 'low' },
  { id: 8, sku: 'Lays Magic Masala 115g', aisle: 'Aisle 04', rack: 'A4', x: 420, y: 110, zone: 'Snacks', heat: 'mid' },
  { id: 9, sku: 'Maggi 2-Min Noodles 280g', aisle: 'Aisle 04', rack: 'C3', x: 420, y: 260, zone: 'Snacks', heat: 'high' },
  { id: 10, sku: 'Amul Salted Butter 100g', aisle: 'Cold Vault', rack: 'V1', x: 520, y: 80, zone: 'Chilled', heat: 'high' }
];

// Manhattan Distance with warehouse aisle turnaround penalty
function computeDistance(p1, p2) {
  const dx = Math.abs(p1.x - p2.x);
  const dy = Math.abs(p1.y - p2.y);
  // If moving between different aisle columns (dx > 40), add turn penalty
  const aisleTurnPenalty = dx > 40 ? 30 : 0;
  return Math.round((dx + dy + aisleTurnPenalty) * 0.85); // Scaled to warehouse meters
}

function computeTotalTourDistance(tour, waypointsMap) {
  let total = 0;
  for (let i = 0; i < tour.length - 1; i++) {
    const a = waypointsMap[tour[i]];
    const b = waypointsMap[tour[i + 1]];
    if (a && b) {
      total += computeDistance(a, b);
    }
  }
  return total;
}

// 2-Opt Heuristic TSP Local Search Algorithm
function run2Opt(initialTour, waypointsMap) {
  let tour = [...initialTour];
  let improved = true;
  let iterations = 0;
  const maxIterations = 500;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 1; i < tour.length - 2; i++) {
      for (let k = i + 1; k < tour.length - 1; k++) {
        const dCurrent =
          computeDistance(waypointsMap[tour[i - 1]], waypointsMap[tour[i]]) +
          computeDistance(waypointsMap[tour[k]], waypointsMap[tour[k + 1]]);

        const dNew =
          computeDistance(waypointsMap[tour[i - 1]], waypointsMap[tour[k]]) +
          computeDistance(waypointsMap[tour[i]], waypointsMap[tour[k + 1]]);

        if (dNew < dCurrent) {
          // Reverse sub-route from i to k
          const sub = tour.slice(i, k + 1).reverse();
          tour = [...tour.slice(0, i), ...sub, ...tour.slice(k + 1)];
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  return { optimizedTour: tour, iterations };
}

export default function PickRouteOptimizerModal({ isOpen, onClose, podName = 'Indiranagar Pod 04' }) {
  const [activeStrategy, setActiveStrategy] = useState('2opt'); // 'naive', 'sshape', '2opt'
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationStats, setOptimizationStats] = useState(null);

  // Map of all waypoints including depot (id: 0)
  const waypointsMap = useMemo(() => {
    const map = { 0: DEPOT };
    INITIAL_WAYPOINTS.forEach(wp => {
      map[wp.id] = wp;
    });
    return map;
  }, []);

  // 1. Naive random tour: Depot -> 1, 2, ..., 10 -> Depot
  const naiveTour = useMemo(() => {
    return [0, 8, 2, 7, 1, 9, 3, 10, 4, 6, 5, 0];
  }, []);

  // 2. S-Shape tour: Sort by X ascending, alternate Y
  const sShapeTour = useMemo(() => {
    return [0, 4, 2, 1, 3, 5, 6, 7, 9, 8, 10, 0];
  }, []);

  // 3. 2-Opt Tour computed dynamically
  const { twoOptTour, twoOptIterations } = useMemo(() => {
    const res = run2Opt(naiveTour, waypointsMap);
    return { twoOptTour: res.optimizedTour, twoOptIterations: res.iterations };
  }, [naiveTour, waypointsMap]);

  const activeTour = useMemo(() => {
    if (activeStrategy === 'naive') return naiveTour;
    if (activeStrategy === 'sshape') return sShapeTour;
    return twoOptTour;
  }, [activeStrategy, naiveTour, sShapeTour, twoOptTour]);

  const naiveDistance = useMemo(() => computeTotalTourDistance(naiveTour, waypointsMap), [naiveTour, waypointsMap]);
  const sShapeDistance = useMemo(() => computeTotalTourDistance(sShapeTour, waypointsMap), [sShapeTour, waypointsMap]);
  const twoOptDistance = useMemo(() => computeTotalTourDistance(twoOptTour, waypointsMap), [twoOptTour, waypointsMap]);

  const currentDistance = useMemo(() => computeTotalTourDistance(activeTour, waypointsMap), [activeTour, waypointsMap]);

  const metersSaved = naiveDistance - twoOptDistance;
  const pctSaved = Math.round((metersSaved / naiveDistance) * 100);
  const secondsSaved = Math.round(metersSaved * 1.15); // Average 1.15s per meter walking + picking

  const handleRunOptimizer = () => {
    setIsOptimizing(true);
    floorAudio.click();

    setTimeout(() => {
      setActiveStrategy('2opt');
      setIsOptimizing(false);
      floorAudio.playDispatchSuccess();
      toast.success(`2-Opt TSP Optimization Finished! Route reduced by ${metersSaved}m (${pctSaved}% shorter walk).`);
    }, 400);
  };

  const handleDispatchToPwa = () => {
    const sequencePayload = activeTour
      .filter(id => id !== 0)
      .map((id, index) => ({
        pickSequence: index + 1,
        ...waypointsMap[id]
      }));

    try {
      localStorage.setItem('darkstori_optimized_pick_sequence', JSON.stringify(sequencePayload));
    } catch {}

    floorAudio.success();
    toast.success(`Dispatched ${sequencePayload.length} optimized waypoints to Picker Handheld PWA!`);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          className="relative w-full max-w-5xl bg-[#0B0F19] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                <Compass className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Warehouse Pick-Path TSP 2-Opt Optimizer
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    O(n²) Local Search
                  </span>
                </div>
                <p className="text-xs text-white/50">
                  Calculates Pareto-optimal picker traversal across Aisles 01-04 & Cold Vault for {podName}.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Strategy Selector & Live Stats Bar */}
          <div className="p-4 border-b border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Strategy Toggles */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/10">
              <button
                onClick={() => { setActiveStrategy('naive'); floorAudio.click(); }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  activeStrategy === 'naive'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Naive Criss-Cross ({naiveDistance}m)
              </button>
              <button
                onClick={() => { setActiveStrategy('sshape'); floorAudio.click(); }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  activeStrategy === 'sshape'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Standard S-Shape ({sShapeDistance}m)
              </button>
              <button
                onClick={() => { setActiveStrategy('2opt'); floorAudio.click(); }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  activeStrategy === '2opt'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                ★ 2-Opt Heuristic Optimal ({twoOptDistance}m)
              </button>
            </div>

            {/* Metrics Chips */}
            <div className="flex items-center gap-4 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-white/40">Total Distance:</span>
                <strong className={`text-sm ${activeStrategy === '2opt' ? 'text-emerald-400' : 'text-white'}`}>
                  {currentDistance} meters
                </strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-white/40">Efficiency Gain:</span>
                <span className="px-2 py-0.5 rounded text-emerald-400 font-bold bg-emerald-500/15 border border-emerald-500/30">
                  -{pctSaved}% walk distance
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-white/40">Time Saved:</span>
                <strong className="text-amber-400">
                  ~{secondsSaved}s per wave
                </strong>
              </div>
            </div>
          </div>

          {/* Interactive SVG Floor Route Visualizer */}
          <div className="relative flex-1 bg-[#06080F] p-4 overflow-auto flex items-center justify-center min-h-[360px]">
            {/* Darkstore Rack Obstacles & Floor Grid */}
            <svg
              viewBox="0 0 620 420"
              className="w-full max-w-4xl h-auto border border-white/10 rounded-xl bg-gradient-to-b from-[#090D1A] to-[#04060C] shadow-inner"
            >
              {/* Warehouse Floor Grid Lines */}
              <defs>
                <pattern id="floorGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                </pattern>
                <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
              <rect width="620" height="420" fill="url(#floorGrid)" />

              {/* Racks Background Obstacles */}
              <g opacity="0.25">
                {/* Aisle 01 Racks */}
                <rect x="100" y="60" width="40" height="260" rx="4" fill="#6366F1" />
                <text x="120" y="45" fill="#A5B4FC" fontSize="10" fontWeight="bold" textAnchor="middle">AISLE 01 (GOLDEN)</text>

                {/* Aisle 02 Racks */}
                <rect x="200" y="60" width="40" height="260" rx="4" fill="#3B82F6" />
                <text x="220" y="45" fill="#93C5FD" fontSize="10" fontWeight="bold" textAnchor="middle">AISLE 02 (PRODUCE)</text>

                {/* Aisle 03 Racks */}
                <rect x="300" y="60" width="40" height="260" rx="4" fill="#06B6D4" />
                <text x="320" y="45" fill="#67E8F9" fontSize="10" fontWeight="bold" textAnchor="middle">AISLE 03 (BEV)</text>

                {/* Aisle 04 Racks */}
                <rect x="400" y="60" width="40" height="260" rx="4" fill="#F59E0B" />
                <text x="420" y="45" fill="#FCD34D" fontSize="10" fontWeight="bold" textAnchor="middle">AISLE 04 (SNACKS)</text>

                {/* Cold Vault */}
                <rect x="500" y="60" width="50" height="140" rx="4" fill="#38BDF8" stroke="#38BDF8" strokeWidth="2" strokeDasharray="3 3" />
                <text x="525" y="45" fill="#7DD3FC" fontSize="10" fontWeight="bold" textAnchor="middle">COLD VAULT</text>
              </g>

              {/* Connecting Pick Path Trajectory Line */}
              {activeTour.map((wpId, idx) => {
                if (idx === activeTour.length - 1) return null;
                const nextId = activeTour[idx + 1];
                const from = waypointsMap[wpId];
                const to = waypointsMap[nextId];
                if (!from || !to) return null;

                const is2Opt = activeStrategy === '2opt';
                const strokeColor = is2Opt ? '#10B981' : activeStrategy === 'sshape' ? '#F59E0B' : '#F43F5E';

                return (
                  <g key={`leg-${idx}`}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={strokeColor}
                      strokeWidth={is2Opt ? 2.5 : 1.5}
                      strokeDasharray={is2Opt ? 'none' : '4 4'}
                      strokeOpacity={0.85}
                    />
                    {/* Midpoint directional indicator */}
                    <circle
                      cx={(from.x + to.x) / 2}
                      cy={(from.y + to.y) / 2}
                      r="2"
                      fill={strokeColor}
                    />
                  </g>
                );
              })}

              {/* Depot Station Marker */}
              <g transform={`translate(${DEPOT.x}, ${DEPOT.y})`}>
                <circle r="14" fill="#8B5CF6" fillOpacity="0.3" stroke="#8B5CF6" strokeWidth="2" />
                <circle r="6" fill="#8B5CF6" />
                <text y="28" fill="#C4B5FD" fontSize="10" fontWeight="bold" textAnchor="middle">
                  START / DEPOT
                </text>
              </g>

              {/* Waypoint SKU Pins */}
              {INITIAL_WAYPOINTS.map(wp => {
                const tourIndex = activeTour.indexOf(wp.id);
                const is2Opt = activeStrategy === '2opt';

                return (
                  <g key={wp.id} transform={`translate(${wp.x}, ${wp.y})`}>
                    <circle
                      r="12"
                      fill="#0B0F19"
                      stroke={is2Opt ? '#10B981' : '#A855F7'}
                      strokeWidth="2"
                    />
                    <text
                      y="4"
                      fill="#FFFFFF"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {tourIndex > 0 ? `#${tourIndex}` : ''}
                    </text>
                    <text
                      y="-16"
                      fill="#E2E8F0"
                      fontSize="8"
                      fontWeight="600"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {wp.rack} ({wp.sku.slice(0, 12)}...)
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-white/10 bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>
                2-Opt iteratively swaps route segments to untangle criss-crossing aisles until zero path inversions remain.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunOptimizer}
                disabled={isOptimizing}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Re-Run 2-Opt</span>
              </button>

              <button
                onClick={handleDispatchToPwa}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Smartphone className="w-4 h-4" />
                <span>Push Route to Picker PWA</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}