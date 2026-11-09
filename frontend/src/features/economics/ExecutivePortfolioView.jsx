import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  TrendingUp,
  DollarSign,
  Download,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Truck,
  Users,
  Printer,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { floorAudio } from '../../utils/floorAudio';

const POD_PORTFOLIO = [
  { id: 'POD-BLR-04', name: 'Indiranagar Hub #04', city: 'Bengaluru', dailyGov: 480000, cm3Pct: 3.8, dailyOrders: 1420, activeRiders: 28, shrinkagePct: 0.95, status: 'PROFITABLE' },
  { id: 'POD-BLR-01', name: 'Koramangala Pod #01', city: 'Bengaluru', dailyGov: 510000, cm3Pct: 4.1, dailyOrders: 1510, activeRiders: 32, shrinkagePct: 0.88, status: 'PROFITABLE' },
  { id: 'POD-DEL-11', name: 'Gurugram Cyber City #11', city: 'Delhi-NCR', dailyGov: 640000, cm3Pct: 4.5, dailyOrders: 1840, activeRiders: 38, shrinkagePct: 1.05, status: 'PROFITABLE' },
  { id: 'POD-DEL-07', name: 'Noida Sector 62 #07', city: 'Delhi-NCR', dailyGov: 390000, cm3Pct: 2.9, dailyOrders: 1180, activeRiders: 24, shrinkagePct: 1.20, status: 'RAMPING' },
  { id: 'POD-BOM-02', name: 'Bandra West Flagship #02', city: 'Mumbai', dailyGov: 720000, cm3Pct: 4.8, dailyOrders: 1920, activeRiders: 42, shrinkagePct: 0.82, status: 'PROFITABLE' },
  { id: 'POD-BOM-08', name: 'Powai Hiranandani #08', city: 'Mumbai', dailyGov: 560000, cm3Pct: 3.9, dailyOrders: 1590, activeRiders: 34, shrinkagePct: 0.92, status: 'PROFITABLE' },
  { id: 'POD-HYD-05', name: 'Hitec City Pod #05', city: 'Hyderabad', dailyGov: 440000, cm3Pct: 3.4, dailyOrders: 1310, activeRiders: 26, shrinkagePct: 1.12, status: 'RAMPING' },
  { id: 'POD-HYD-09', name: 'Gachibowli Hub #09', city: 'Hyderabad', dailyGov: 410000, cm3Pct: 3.1, dailyOrders: 1220, activeRiders: 24, shrinkagePct: 1.15, status: 'RAMPING' }
];

export default function ExecutivePortfolioView() {
  const [pods, setPods] = useState(POD_PORTFOLIO);
  const [selectedCity, setSelectedCity] = useState('All');
  const [boardDossierOpen, setBoardDossierOpen] = useState(false);

  const filteredPods = selectedCity === 'All' ? pods : pods.filter(p => p.city === selectedCity);

  const totalNetworkGov = pods.reduce((acc, p) => acc + p.dailyGov, 0);
  const totalDailyOrders = pods.reduce((acc, p) => acc + p.dailyOrders, 0);
  const totalActiveRiders = pods.reduce((acc, p) => acc + p.activeRiders, 0);
  const avgCm3 = +(pods.reduce((acc, p) => acc + p.cm3Pct, 0) / pods.length).toFixed(2);
  const networkAov = Math.round(totalNetworkGov / totalDailyOrders);

  const handleExportBoardDossier = () => {
    floorAudio.playSuccessPick();
    setBoardDossierOpen(true);
    toast.success('Compiling multi-store operational metrics into Executive Board Dossier...');
  };

  return (
    <div className="darkstor-executive-portfolio space-y-6">
      {/* Portfolio Header */}
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Globe className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                Pan-India Multi-Store Portfolio Rollup
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                C-Suite & Board Operations
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Network EBITDA, Pod Cohorts & Board Dossier
            </h2>
            <p className="text-xs text-white/60 max-w-2xl mt-1">
              Consolidates 8 active micro-fulfillment pods across Bengaluru, Delhi-NCR, Mumbai, and Hyderabad with auditable CM1/CM2/CM3 margin waterfalls.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportBoardDossier}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-black transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-amber-500/10 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Board Dossier (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Network Rollup KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Network Daily GOV</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            ₹{(totalNetworkGov / 100000).toFixed(1)} Lakh
          </div>
          <div className="text-[11px] text-white/40 mt-1 font-mono">Run-rate ₹{(totalNetworkGov * 30 / 10000000).toFixed(1)} Cr / month</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Portfolio Net CM3</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">+{avgCm3}%</div>
          <div className="text-[11px] text-emerald-300 mt-1 font-mono">Blinkit benchmark +3.9%</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Network Daily Orders</span>
            <Building2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{totalDailyOrders.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-white/40 mt-1 font-mono">AOV ₹{networkAov} across 8 pods</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Active 2W Rider Fleet</span>
            <Truck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-300 font-mono">{totalActiveRiders}</div>
          <div className="text-[11px] text-white/40 mt-1 font-mono">68% Leased EV (Zypp/Yulu)</div>
        </div>
      </div>

      {/* City Filters */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-mono">
          {['All', 'Bengaluru', 'Delhi-NCR', 'Mumbai', 'Hyderabad'].map(city => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedCity === city
                  ? 'bg-amber-500 text-black font-bold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        <span className="text-xs text-white/40 font-mono">
          Showing {filteredPods.length} of {pods.length} active stores
        </span>
      </div>

      {/* Bento Grid Pods */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredPods.map(pod => (
          <div
            key={pod.id}
            className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-amber-500/40 transition-all space-y-3"
          >
            <div className="flex items-center justify-between text-xs text-white/50">
              <span className="font-mono text-white/70">{pod.id}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                pod.status === 'PROFITABLE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {pod.status}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">{pod.name}</h3>
              <div className="text-xs text-white/40">{pod.city} Cluster</div>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-white/50">Daily GOV:</span>
                <span className="text-amber-400 font-bold">₹{(pod.dailyGov / 100000).toFixed(2)}L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Store CM3:</span>
                <span className="text-emerald-400 font-bold">+{pod.cm3Pct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Orders/Day:</span>
                <span className="text-white">{pod.dailyOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Shrinkage:</span>
                <span className="text-sky-300">{pod.shrinkagePct}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/50 pt-1">
              <span>{pod.activeRiders} Riders on Shift</span>
              <span className="text-amber-400 flex items-center gap-0.5">
                Audit OK <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Board Dossier PDF Modal */}
      <AnimatePresence>
        {boardDossierOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0E131F] border border-amber-500/40 rounded-2xl p-6 max-w-2xl w-full shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setBoardDossierOpen(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <span className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <FileText className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">DarkStori Executive Board Dossier (PDF)</h3>
                  <div className="text-xs text-amber-400 font-mono">CONFIDENTIAL · Q4 FY26 NETWORK AUDIT</div>
                </div>
              </div>

              {/* Dossier Document Preview */}
              <div className="p-6 rounded-xl bg-black/60 border border-white/10 space-y-4 text-xs font-mono text-white/80">
                <div className="border-b border-white/10 pb-3 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-bold text-white">DARKSTORI NETWORK OPERATING SYSTEM</div>
                    <div className="text-[10px] text-white/50">Autonomous Quick-Commerce Fulfillment · Pan-India Portfolio</div>
                  </div>
                  <div className="text-right text-[10px] text-white/50">
                    DATE: {new Date().toLocaleDateString('en-IN')}<br />
                    REPORT: DKS-BRD-2026-Q4
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-amber-400 font-bold uppercase text-[11px]">1. Executive Performance Summary</div>
                  <p className="text-white/70 font-sans text-xs leading-relaxed">
                    Across 8 operational pods in Bengaluru, Delhi-NCR, Mumbai, and Hyderabad, the DarkStori network delivered an aggregate daily Gross Order Value of ₹{(totalNetworkGov / 100000).toFixed(2)} Lakh with an average Store-Level Contribution Margin (CM3) of +{avgCm3}%. Missing-item customer disputes dropped by 94% through client-side computer vision verification.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded bg-white/[0.03] border border-white/5">
                    <div className="text-white/50 text-[10px]">TOTAL ACTIVE STORES</div>
                    <div className="text-base font-bold text-white">8 Pods</div>
                  </div>
                  <div className="p-3 rounded bg-white/[0.03] border border-white/5">
                    <div className="text-white/50 text-[10px]">AGGREGATE RUN-RATE GOV</div>
                    <div className="text-base font-bold text-amber-400">₹{(totalNetworkGov * 30 / 10000000).toFixed(1)} Cr/mo</div>
                  </div>
                  <div className="p-3 rounded bg-white/[0.03] border border-white/5">
                    <div className="text-white/50 text-[10px]">STORE LEVEL CM3 MARGIN</div>
                    <div className="text-base font-bold text-emerald-400">+{avgCm3}% of GOV</div>
                  </div>
                  <div className="p-3 rounded bg-white/[0.03] border border-white/5">
                    <div className="text-white/50 text-[10px]">TOTAL RIDER SWARM</div>
                    <div className="text-base font-bold text-purple-300">{totalActiveRiders} Drivers</div>
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <div className="text-amber-400 font-bold uppercase text-[11px]">2. Regulatory & FSSAI Compliance Status</div>
                  <div className="text-white/70 text-[11px] flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>All 8 pods maintain 100% digital cold-chain temperature logs (2°C–4°C) meeting FSSAI Schedule 4.</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save to PDF</span>
                </button>
                <button
                  onClick={() => setBoardDossierOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
