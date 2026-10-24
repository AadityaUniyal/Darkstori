import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Download, CheckCircle2, TrendingUp, ShieldCheck, Leaf, Zap, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ExecutiveReportModal({ isOpen, onClose, metrics, selectedCity = 'Bangalore' }) {
  if (!isOpen) return null;

  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const summaryText = `[DARKSTORI 3.0 EXECUTIVE OPERATIONAL BRIEF - ${selectedCity.toUpperCase()}]
Date: ${dateStr}
• 10-Minute SLA Compliance: 98.7% (Avg fulfillment: 8m 52s)
• Perishable Salvage Revenue: ₹24.85 Lakhs rescued (0% landfill write-offs via Sigmoid Markdown)
• VRP Fleet Efficiency: 38.4% delivery km saved (Clarke-Wright Savings Heuristic)
• Network Safety: 0 Cannibalization collisions across active hubs
• Weather Preparedness: Pre-emptive 20-min monsoon geofence automation active`;
    navigator.clipboard.writeText(summaryText);
    toast.success('Executive brief copied to clipboard');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-3xl bg-[#0E121A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#141A24]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FF9F1C]/20 flex items-center justify-center border border-[#FF9F1C]/40">
                <ShieldCheck size={18} className="text-[#38BDF8]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Executive Operations Briefing</h2>
                <p className="text-xs text-slate-400">Darkstori 3.0 Prescriptive AI Operating System · {selectedCity} Metro</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySummary}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
              >
                Copy Memo
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#FF9F1C] hover:bg-[#0077ED] text-white transition-colors"
              >
                <Printer size={13} /> Print / Export PDF
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors ml-2"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Printable Document Body */}
          <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
            {/* Metadata Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
              <div>
                <span className="text-slate-400 block font-mono">REPORTING HORIZON</span>
                <span className="font-semibold text-white">Trailing 30-Day Operational Performance</span>
              </div>
              <div>
                <span className="text-slate-400 block font-mono">STATUS</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Audit Verified & Unit Economics Positive
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-mono">GENERATED</span>
                <span className="font-semibold text-white">{dateStr}</span>
              </div>
            </div>

            {/* Core Executive KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Zap size={14} className="text-[#38BDF8]" /> SLA Adherence
                </div>
                <div className="text-2xl font-bold text-white font-mono">98.7%</div>
                <div className="text-[11px] text-emerald-400 mt-1">Avg 8m 52s fulfillment</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Leaf size={14} className="text-emerald-400" /> Margin Salvage
                </div>
                <div className="text-2xl font-bold text-white font-mono">₹24.8L</div>
                <div className="text-[11px] text-slate-400 mt-1">Sigmoid markdown curve</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <TrendingUp size={14} className="text-amber-400" /> VRP Route Gain
                </div>
                <div className="text-2xl font-bold text-white font-mono">38.4%</div>
                <div className="text-[11px] text-emerald-400 mt-1">4.2 tons CO₂ reduced</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Building2 size={14} className="text-purple-400" /> Cannibalization
                </div>
                <div className="text-2xl font-bold text-white font-mono">0.0%</div>
                <div className="text-[11px] text-slate-400 mt-1">Huff gravity protected</div>
              </div>
            </div>

            {/* Section 1: Prescriptive Architecture Summary */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                1. Operational Architecture & SLA Defense
              </h3>
              <p className="text-xs leading-relaxed text-slate-300">
                During this period, the network maintained a <strong>98.7% on-time fulfillment rate</strong> across all active dark store micro-nodes. By deploying the 3-stage dark store fulfillment pipeline (Aisle Pick & Pack: 2m 14s, Staging: 46s, Last-Mile VRP: 5m 52s), rider wait time at hub bays was reduced by 3.4 minutes per batch, protecting customer brand NPS during evening peak order bursts.
              </p>
            </div>

            {/* Section 2: Margin Resilience & Food Waste Salvage */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                2. Perishable Inventory Salvage & Margin Economics
              </h3>
              <p className="text-xs leading-relaxed text-slate-300">
                Traditional fixed 50% discount write-offs were completely eliminated in favor of continuous <strong>Dynamic Sigmoid Decay Markdown Pricing</strong>. Perishable dairy, organic bakery, and fresh produce items approaching shelf-life expiration were dynamically discounted between 15% and 42% over a rolling 24-hour window, yielding <strong>100% inventory clearance with zero landfill disposal</strong> and salvaging ₹24,85,000 in net gross margin.
              </p>
            </div>

            {/* Section 3: Greenfield Expansion Whitespace */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                3. Network Expansion & Greenfield Whitespace
              </h3>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-200">
                  <span className="font-semibold">Top Recommended Hub: Koramangala 5th Block (Pincode: 560034)</span>
                  <span className="text-emerald-400 font-mono font-bold">Opportunity: 9.6 / 10</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  PostGIS DBSCAN identifies high unserved order density with zero revenue cannibalization on the adjacent HSR Sector 2 dark store. Projected break-even timeline: <strong>6.5 months</strong>.
                </p>
              </div>
            </div>

            {/* Footer Signoff */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
              <span>Darkstori Engine v3.0.0 · Enterprise Operational Intelligence</span>
              <span className="font-mono">CONFIDENTIAL & PROPRIETARY</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
