import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, QrCode, Bike, AlertTriangle, CheckCircle2, Clock, Zap, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function DarkStorePipelineMonitor({ storeName = 'Koramangala Hub #1' }) {
  const [pipelineState, setPipelineState] = useState({
    pickPack: { currentMin: 2.1, targetMin: 2.5, activePickers: 8, queueLength: 3, status: 'optimal' },
    staging: { currentMin: 0.8, targetMin: 1.0, bagsReady: 6, bayUtilization: '64%', status: 'optimal' },
    transit: { currentMin: 5.9, targetMin: 6.5, activeRiders: 14, avgDropDist: '1.3 km', status: 'optimal' },
    bottleneck: null,
    totalTime: 8.8, // 2.1 + 0.8 + 5.9
  });

  const [simulating, setSimulating] = useState(false);

  const simulatePeakBurst = () => {
    setSimulating(true);
    // Simulate slight picking burst
    setTimeout(() => {
      setPipelineState(prev => ({
        ...prev,
        pickPack: { currentMin: 2.7, targetMin: 2.5, activePickers: 10, queueLength: 9, status: 'warning' },
        bottleneck: 'Aisle 3 (Dairy & Bakery) Picker Backlog',
        totalTime: 9.4
      }));
      toast.warning('Micro-fulfillment alert: Pick & Pack spiked to 2.7m. Autonomous picker re-routing initiated.');
      setSimulating(false);
    }, 800);
  };

  const resetToOptimal = () => {
    setPipelineState({
      pickPack: { currentMin: 2.1, targetMin: 2.5, activePickers: 8, queueLength: 3, status: 'optimal' },
      staging: { currentMin: 0.8, targetMin: 1.0, bagsReady: 6, bayUtilization: '64%', status: 'optimal' },
      transit: { currentMin: 5.9, targetMin: 6.5, activeRiders: 14, avgDropDist: '1.3 km', status: 'optimal' },
      bottleneck: null,
      totalTime: 8.8,
    });
    toast.success('Pipeline normalized to optimal state (8m 48s total cycle)');
  };

  const isWithinSla = pipelineState.totalTime <= 10.0;

  return (
    <div className="glass-card p-5 rounded-2xl border border-white/10 bg-[#0E121A]/80 backdrop-blur-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#0071E3]/20 text-[#38BDF8] border border-[#0071E3]/30">
            <Zap size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white flex items-center gap-2">
              10-Minute Dark Store Pipeline Monitor
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                isWithinSla 
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                  : 'bg-red-500/15 text-red-400 border-red-500/30'
              }`}>
                {isWithinSla ? 'SLA DEFENDED' : 'SLA THREAT'}
              </span>
            </h3>
            <p className="text-xs text-slate-400">{storeName} · Micro-Fulfillment Lifecycle Telemetry</p>
          </div>
        </div>

        {/* Live Total Cycle Clock */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Total Cycle Time</span>
            <span className={`text-base font-bold font-mono ${pipelineState.totalTime > 9.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {Math.floor(pipelineState.totalTime)}m {Math.round((pipelineState.totalTime % 1) * 60)}s
              <span className="text-xs text-slate-400 font-normal"> / 10m SLA</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {pipelineState.bottleneck ? (
              <button
                onClick={resetToOptimal}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors flex items-center gap-1"
                title="Resolve Bottleneck"
              >
                <CheckCircle2 size={13} /> Resolve
              </button>
            ) : (
              <button
                onClick={simulatePeakBurst}
                disabled={simulating}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors flex items-center gap-1"
                title="Simulate Rush Hour Burst"
              >
                <RefreshCw size={12} className={simulating ? 'animate-spin' : ''} /> Stress Test
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottleneck Alert Banner if present */}
      {pipelineState.bottleneck && (
        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
          <AlertTriangle size={15} className="shrink-0 text-amber-400 animate-pulse" />
          <span>
            <strong>Bottleneck Detected:</strong> {pipelineState.bottleneck}. Autonomous pick-path optimizer suggested reallocating 2 floaters to Aisle 3.
          </span>
        </div>
      )}

      {/* 3 Pipeline Stages Connected Horizontally */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
        {/* Stage 1: Pick & Pack */}
        <div className={`p-3.5 rounded-xl border transition-all ${
          pipelineState.pickPack.status === 'warning'
            ? 'bg-amber-500/10 border-amber-500/40'
            : 'bg-white/[0.02] border-white/5 hover:border-white/10'
        }`}>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Package size={14} className="text-[#38BDF8]" /> Stage 1: Pick & Pack
            </span>
            <span className="font-mono text-[11px] text-slate-400">Target &le; {pipelineState.pickPack.targetMin}m</span>
          </div>

          <div className="text-xl font-bold font-mono text-white mb-1">
            {pipelineState.pickPack.currentMin} min
          </div>

          <div className="space-y-1 text-[11px] text-slate-400">
            <div className="flex justify-between">
              <span>Active Pickers:</span>
              <span className="text-slate-200 font-mono">{pipelineState.pickPack.activePickers}</span>
            </div>
            <div className="flex justify-between">
              <span>Tote Queue:</span>
              <span className="text-slate-200 font-mono">{pipelineState.pickPack.queueLength} orders</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pipelineState.pickPack.currentMin > pipelineState.pickPack.targetMin ? 'bg-amber-400' : 'bg-[#0071E3]'
              }`}
              style={{ width: `${Math.min(100, (pipelineState.pickPack.currentMin / pipelineState.pickPack.targetMin) * 80)}%` }}
            />
          </div>
        </div>

        {/* Stage 2: Staging & Hand-off */}
        <div className="p-3.5 rounded-xl border bg-white/[0.02] border-white/5 hover:border-white/10 transition-all">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <QrCode size={14} className="text-purple-400" /> Stage 2: Staging & Bagging
            </span>
            <span className="font-mono text-[11px] text-slate-400">Target &le; {pipelineState.staging.targetMin}m</span>
          </div>

          <div className="text-xl font-bold font-mono text-white mb-1">
            {pipelineState.staging.currentMin} min
          </div>

          <div className="space-y-1 text-[11px] text-slate-400">
            <div className="flex justify-between">
              <span>Bags Staged at Bay:</span>
              <span className="text-slate-200 font-mono">{pipelineState.staging.bagsReady} ready</span>
            </div>
            <div className="flex justify-between">
              <span>Bay Slot Utilization:</span>
              <span className="text-slate-200 font-mono">{pipelineState.staging.bayUtilization}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-purple-500 transition-all duration-500"
              style={{ width: `${Math.min(100, (pipelineState.staging.currentMin / pipelineState.staging.targetMin) * 80)}%` }}
            />
          </div>
        </div>

        {/* Stage 3: Clarke-Wright VRP Transit */}
        <div className="p-3.5 rounded-xl border bg-white/[0.02] border-white/5 hover:border-white/10 transition-all">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Bike size={14} className="text-emerald-400" /> Stage 3: Last-Mile VRP
            </span>
            <span className="font-mono text-[11px] text-slate-400">Target &le; {pipelineState.transit.targetMin}m</span>
          </div>

          <div className="text-xl font-bold font-mono text-white mb-1">
            {pipelineState.transit.currentMin} min
          </div>

          <div className="space-y-1 text-[11px] text-slate-400">
            <div className="flex justify-between">
              <span>Riders on Route:</span>
              <span className="text-slate-200 font-mono">{pipelineState.transit.activeRiders}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Drop Distance:</span>
              <span className="text-slate-200 font-mono">{pipelineState.transit.avgDropDist}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, (pipelineState.transit.currentMin / pipelineState.transit.targetMin) * 80)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
