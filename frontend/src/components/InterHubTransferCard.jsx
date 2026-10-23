import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Repeat, ArrowRight, CheckCircle2, Clock, Package, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function InterHubTransferCard() {
  const [transfers, setTransfers] = useState([
    {
      id: 'TRF-901',
      sourceHub: 'Domlur Main Hub',
      targetHub: 'Indiranagar Express Hub',
      distanceKm: 2.3,
      sku: 'Amul Taaza Toned Milk 500ml',
      quantity: 50,
      urgency: 'HIGH',
      reason: 'Target store stockout projected in 42 mins (Demand surge)',
      status: 'pending', // 'pending' | 'dispatched' | 'completed'
    },
    {
      id: 'TRF-902',
      sourceHub: 'HSR Sector 2 Hub',
      targetHub: 'Koramangala 5th Block',
      distanceKm: 3.1,
      sku: 'Country Delight Farm Eggs (Pack of 10)',
      quantity: 35,
      urgency: 'MEDIUM',
      reason: 'Rebalancing inventory to meet evening breakfast basket demand',
      status: 'pending',
    },
    {
      id: 'TRF-903',
      sourceHub: 'Bandra West Central',
      targetHub: 'Khar West Micro-Node',
      distanceKm: 1.8,
      sku: 'Epigamia Greek Yogurt (Blueberry)',
      quantity: 24,
      urgency: 'LOW',
      reason: 'Shelf-life optimization: Target hub has 3.2x higher sales velocity',
      status: 'pending',
    },
  ]);

  const handleDispatch = (id) => {
    setTransfers(prev => prev.map(t => t.id === id ? { ...t, status: 'dispatched' } : t));
    const matched = transfers.find(t => t.id === id);
    toast.success(`Micro-transfer initiated: ${matched?.quantity} units of ${matched?.sku} dispatched via electric runner`);
  };

  return (
    <div className="glass-card p-5 rounded-2xl border border-white/10 bg-[#0E121A]/80 backdrop-blur-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Repeat size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white font-display">
              Inter-Hub Cross-Docking & Inventory Rebalancing
            </h3>
            <p className="text-xs text-slate-400 font-body">
              Automated runner transfers between adjacent dark stores (&le; 3.5 km) to prevent out-of-stock events
            </p>
          </div>
        </div>

        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold">
          AI Auto-Balancing Active
        </span>
      </div>

      <div className="space-y-3">
        {transfers.map((trf) => {
          const isDispatched = trf.status === 'dispatched';

          return (
            <div
              key={trf.id}
              className={`p-3.5 rounded-xl border transition-all ${
                isDispatched
                  ? 'bg-purple-500/[0.05] border-purple-500/30'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Package size={14} className="text-purple-400" />
                  <span>{trf.sku}</span>
                  <span className="font-mono text-slate-400 font-normal">({trf.quantity} units)</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    trf.urgency === 'HIGH'
                      ? 'bg-red-500/15 text-red-400 border-red-500/30'
                      : trf.urgency === 'MEDIUM'
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  }`}>
                    {trf.urgency} URGENCY
                  </span>

                  {isDispatched && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/30">
                      <Clock size={11} className="animate-spin" /> IN TRANSIT (12 min ETA)
                    </span>
                  )}
                </div>
              </div>

              {/* Route Path */}
              <div className="flex items-center gap-2 text-xs text-slate-300 mb-2">
                <span className="font-medium text-slate-200">{trf.sourceHub}</span>
                <ArrowRight size={13} className="text-purple-400 shrink-0" />
                <span className="font-medium text-white">{trf.targetHub}</span>
                <span className="text-[11px] font-mono text-slate-400">({trf.distanceKm} km via e-bike runner)</span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs">
                <span className="text-[11px] text-slate-400">
                  {trf.reason}
                </span>

                {!isDispatched && (
                  <button
                    onClick={() => handleDispatch(trf.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-sm"
                  >
                    Dispatch Transfer Runner <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
