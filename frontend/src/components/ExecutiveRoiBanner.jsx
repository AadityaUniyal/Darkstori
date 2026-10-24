import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, FileText, TrendingUp, Leaf, Zap, ShieldAlert, ArrowUpRight } from 'lucide-react';
import ExecutiveReportModal from './ExecutiveReportModal';

export default function ExecutiveRoiBanner({ selectedCity = 'Bangalore', metrics = null }) {
  const [reportModalOpen, setReportModalOpen] = useState(false);

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#0E121A] via-[#141A24] to-[#0E121A] p-5 mb-6 shadow-2xl backdrop-blur-xl">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 right-1/4 -mt-12 w-96 h-32 bg-[#FF9F1C]/15 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-10 -mb-10 w-72 h-24 bg-emerald-500/10 blur-2xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left Title & Mission */}
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FF9F1C]/20 text-[#38BDF8] border border-[#FF9F1C]/30">
                <Sparkles size={11} /> Enterprise ROI Engine
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {selectedCity} Cluster · Live 30D Impact
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
              Prescriptive Operations & Unit Economics Value
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-body leading-relaxed">
              Autonomous decisioning continuously defending dark store margins, eliminating perishable food write-offs, and batching 10-minute VRP fleet dispatches.
            </p>
          </div>

          {/* Right Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setReportModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#FF9F1C] hover:bg-[#0077ED] text-white shadow-lg shadow-[#FF9F1C]/25 border border-white/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <FileText size={14} />
              Export Executive Ops Brief
              <ArrowUpRight size={13} className="text-sky-200" />
            </button>
          </div>
        </div>

        {/* Quantified Value Attribution Strip */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 mt-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02]">
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Leaf size={16} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Salvaged Margin</span>
              <span className="text-base sm:text-lg font-bold font-mono text-white">₹24,85,000</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02]">
            <div className="p-2 rounded-lg bg-[#FF9F1C]/15 text-[#38BDF8] border border-[#FF9F1C]/30">
              <TrendingUp size={16} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">VRP Distance Cut</span>
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-400">38.4% Saved</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02]">
            <div className="p-2 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Zap size={16} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">10-Min SLA Rate</span>
              <span className="text-base sm:text-lg font-bold font-mono text-white">98.7% On-Time</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02]">
            <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <ShieldAlert size={16} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Cannibalization</span>
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-400">0.0% Overlap</span>
            </div>
          </div>
        </div>
      </div>

      <ExecutiveReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        selectedCity={selectedCity}
        metrics={metrics}
      />
    </>
  );
}
