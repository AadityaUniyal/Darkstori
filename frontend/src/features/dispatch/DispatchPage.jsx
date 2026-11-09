import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Sparkles,
  Navigation,
  RefreshCw,
  Zap,
  Info,
  ShieldCheck,
  Send,
  UserCheck,
  Layers,
  MapPin,
  TrendingUp,
  X
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { useCity } from '../../context/CityContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { floorAudio } from '../../utils/floorAudio';

const AVAILABLE_RIDERS = [
  { id: 'RD-SURESH-08', name: 'Suresh Kumar', status: 'Available', batchedOrders: 0, battery: '92%' },
  { id: 'RD-KUMAR-12', name: 'Kumar Swamy', status: 'In Transit', batchedOrders: 2, battery: '78%' },
  { id: 'RD-VIKRAM-04', name: 'Vikram Singh', status: 'Available', batchedOrders: 0, battery: '85%' },
  { id: 'RD-ANAND-19', name: 'Anand Rao', status: 'Available', batchedOrders: 1, battery: '64%' }
];

export default function DispatchPage() {
  const { roleConfig, isFirstTimeUser } = useRole();
  const { activeCity } = useCity();
  const { user } = useAuth();

  const [activeRidersCount, setActiveRidersCount] = useState(() => user?.store?.fleet || 18);
  const [batchingMode, setBatchingMode] = useState('2_order_cluster');
  const [surgeActive, setSurgeActive] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedOrderForReassign, setSelectedOrderForReassign] = useState(null);

  // Live Queue state with countdown timers
  const [dispatchQueue, setDispatchQueue] = useState([
    {
      id: 'ORD-BLR-9041',
      customer_area: 'Koramangala 5th Block (Apt Complex)',
      items_count: 5,
      weight_kg: 2.1,
      order_time_elapsed_secs: 260, // 4m 20s
      assigned_rider: 'RD-SURESH-08',
      cluster_batch: 'CORRIDOR-A',
      sla_breach_risk: 'LOW_RISK'
    },
    {
      id: 'ORD-BLR-9042',
      customer_area: 'Koramangala 5th Block (Main Road)',
      items_count: 3,
      weight_kg: 1.4,
      order_time_elapsed_secs: 230, // 3m 50s
      assigned_rider: 'RD-SURESH-08',
      cluster_batch: 'CORRIDOR-A',
      sla_breach_risk: 'LOW_RISK'
    },
    {
      id: 'ORD-BLR-9048',
      customer_area: 'Sony World Junction East',
      items_count: 7,
      weight_kg: 3.8,
      order_time_elapsed_secs: 430, // 7m 10s
      assigned_rider: 'RD-KUMAR-12',
      cluster_batch: 'CORRIDOR-B',
      sla_breach_risk: 'ELEVATED_SLA_RISK'
    },
    {
      id: 'ORD-BLR-9055',
      customer_area: 'Ejipura Signal North',
      items_count: 4,
      weight_kg: 1.9,
      order_time_elapsed_secs: 180, // 3m 00s
      assigned_rider: 'RD-VIKRAM-04',
      cluster_batch: 'CORRIDOR-C',
      sla_breach_risk: 'LOW_RISK'
    }
  ]);

  // Live timer interval to simulate real-time SLA countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setDispatchQueue(prev =>
        prev.map(order => {
          const nextSecs = order.order_time_elapsed_secs + 1;
          const isAtRisk = nextSecs > 480; // > 8 mins
          return {
            ...order,
            order_time_elapsed_secs: nextSecs,
            sla_breach_risk: isAtRisk ? 'CRITICAL_SLA_BREACH' : nextSecs > 360 ? 'ELEVATED_SLA_RISK' : 'LOW_RISK'
          };
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const avgDeliveryMins = batchingMode === '2_order_cluster' ? 8.4 : batchingMode === 'single_order' ? 6.9 : 10.2;
  const dropsPerRiderPerHour = batchingMode === '2_order_cluster' ? 3.4 : batchingMode === 'single_order' ? 2.1 : 4.2;

  const handleDispatchBatch = (batchId) => {
    floorAudio.success();
    toast.success(`Swarm batch ${batchId} dispatched to rider mobile terminals!`);
    setDispatchQueue(prev => prev.filter(q => q.cluster_batch !== batchId));
  };

  const handleReassignRider = (riderId) => {
    floorAudio.click();
    setDispatchQueue(prev =>
      prev.map(o => o.id === selectedOrderForReassign.id ? { ...o, assigned_rider: riderId } : o)
    );
    toast.success(`Order ${selectedOrderForReassign.id} reassigned to ${riderId}`);
    setReassignModalOpen(false);
  };

  return (
    <div className="darkstor-feature-page p-4 sm:p-6 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* 1. SCROLLABLE FEATURE HEADER */}
      <div className="feature-header-banner p-6 rounded-2xl bg-white/[0.02] border border-white/10 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                <Truck className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Feature 04 · Last-Mile Logistics
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                Primary: Fleet Commander Lens
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Order Dispatch & Rider Swarm Batching Optimizer
            </h1>
            <p className="text-sm text-white/60 max-w-3xl mt-1 leading-relaxed">
              Solves dynamic vehicle routing with real-time multi-order batching. Synchronizes dark store bagging completion
              with rider arrival to maximize drops per rider per hour while guaranteeing sub-10 minute delivery SLAs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                floorAudio.success();
                toast.success('All staged corridor batches dispatched to active fleet!');
                setDispatchQueue([]);
              }}
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-400 hover:bg-emerald-300 text-black transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Dispatch All Queued Batches</span>
            </button>
          </div>
        </div>

        {isFirstTimeUser && (
          <div className="mt-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-xs text-emerald-200">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
            <div>
              <strong>Fleet Commander Onboarding:</strong> Live orders count down against the strict 10:00 SLA. DarkStori clusters orders along the same delivery corridor (e.g. Corridor A) to double rider drop efficiency. Click "Dispatch" on any cluster to release riders.
            </div>
          </div>
        )}
      </div>

      {/* 2. FLEET & SLA KPI RIBBON */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div whileHover={{ y: -2 }} className="kpi-card p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Avg Fleet Delivery SLA</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{avgDeliveryMins} <span className="text-xs font-normal text-white/40">mins</span></div>
          <div className="text-[11px] text-white/40 mt-1">Target &lt; 10.0m guaranteed</div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="kpi-card p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Drops per Rider / Hour</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{dropsPerRiderPerHour} <span className="text-xs font-normal text-white/40">drops/hr</span></div>
          <div className="text-[11px] text-emerald-400 mt-1">+61% vs unbatched solo runs</div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="kpi-card p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Active Swarm Riders</span>
            <Navigation className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">{activeRidersCount} <span className="text-xs font-normal text-white/40">riders</span></div>
          <div className="text-[11px] text-white/40 mt-1">94% fleet utilization</div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="kpi-card p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>On-Time SLA Guarantee</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">99.1%</div>
          <div className="text-[11px] text-purple-300 mt-1">Zero customer breach penalty</div>
        </motion.div>
      </div>

      {/* 3. BATCHING CONTROLS & CORRIDOR SIMULATOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Swarm Algorithm Controls</span>
            </h2>
            <span className="text-xs text-emerald-400 font-mono">Live Sync</span>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">Corridor Batching Mode</label>
              <select
                value={batchingMode}
                onChange={(e) => { setBatchingMode(e.target.value); floorAudio.click(); }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none"
              >
                <option value="single_order">Single Order (Solo Speed 6.9m)</option>
                <option value="2_order_cluster">2-Order Corridor Cluster (Optimal 8.4m)</option>
                <option value="3_order_high_density">3-Order High Density (Peak Rush 10.2m)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-white/70">Active Rider Roster</span>
                <span className="font-mono text-emerald-400 font-bold">{activeRidersCount} Riders</span>
              </div>
              <input
                type="range"
                min="12"
                max="45"
                step="1"
                value={activeRidersCount}
                onChange={(e) => setActiveRidersCount(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Dynamic Rain Surge Incentive</span>
                <button
                  onClick={() => {
                    setSurgeActive(!surgeActive);
                    floorAudio.click();
                    toast.info(`Surge incentive ${!surgeActive ? 'Activated (+₹35/drop)' : 'Deactivated'}`);
                  }}
                  className={`w-10 h-5 rounded-full transition-colors relative ${surgeActive ? 'bg-emerald-500' : 'bg-white/20'}`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${surgeActive ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
              <p className="text-[11px] text-white/50">
                Auto-boosts rider payout by ₹35 during adverse weather to maintain 100% rider availability.
              </p>
            </div>
          </div>
        </div>

        {/* Live Staged Orders with Real-Time SLA Countdowns */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-400" />
                <span>Active Dispatch Queue & Live SLA Progress</span>
              </h2>
              <span className="text-xs text-white/50">{dispatchQueue.length} live orders staged</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-400 font-mono">10m SLA Live</span>
            </div>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {dispatchQueue.length === 0 ? (
                <div className="p-8 text-center text-xs text-white/40 bg-white/[0.01] rounded-xl border border-white/5">
                  All active orders successfully dispatched to riders. Staging queue clear.
                </div>
              ) : (
                dispatchQueue.map(order => {
                  const maxSlaSecs = 600; // 10 minutes
                  const remainingSecs = Math.max(0, maxSlaSecs - order.order_time_elapsed_secs);
                  const remMins = Math.floor(remainingSecs / 60);
                  const remSecsFormatted = String(remainingSecs % 60).padStart(2, '0');
                  const progressPct = Math.min(100, (order.order_time_elapsed_secs / maxSlaSecs) * 100);

                  const isCritical = order.sla_breach_risk === 'CRITICAL_SLA_BREACH';
                  const isElevated = order.sla_breach_risk === 'ELEVATED_SLA_RISK';

                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-4 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-xs">{order.id}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-white/70">
                              {order.cluster_batch}
                            </span>
                          </div>
                          <div className="text-xs text-white/80 mt-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{order.customer_area}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => { setSelectedOrderForReassign(order); setReassignModalOpen(true); }}
                            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs flex items-center gap-1 border border-white/10"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{order.assigned_rider}</span>
                          </button>

                          <button
                            onClick={() => handleDispatchBatch(order.cluster_batch)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
                          >
                            <Send className="w-3 h-3" />
                            <span>Dispatch</span>
                          </button>
                        </div>
                      </div>

                      {/* SLA Progress Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] mb-1 font-mono">
                          <span className="text-white/50">Elapsed: {Math.floor(order.order_time_elapsed_secs / 60)}m {order.order_time_elapsed_secs % 60}s</span>
                          <span className={`font-bold ${isCritical ? 'text-red-400' : isElevated ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {remainingSecs > 0 ? `SLA: ${remMins}:${remSecsFormatted} remaining` : 'SLA BREACHED'}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${
                              isCritical ? 'bg-red-500' : isElevated ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Reassign Rider Modal */}
      {reassignModalOpen && selectedOrderForReassign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm p-6 rounded-2xl bg-surface border border-white/15 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Reassign Rider</span>
              </h3>
              <button onClick={() => setReassignModalOpen(false)} className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-white/60">
              Select available swarm rider for <strong>{selectedOrderForReassign.id}</strong>:
            </p>

            <div className="space-y-2">
              {AVAILABLE_RIDERS.map(rider => (
                <button
                  key={rider.id}
                  onClick={() => handleReassignRider(rider.id)}
                  className="w-full p-3 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 text-left transition-all flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white">{rider.name}</div>
                    <div className="text-[10px] text-white/40 font-mono">{rider.id} · Batched: {rider.batchedOrders}</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {rider.battery} Batt
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
