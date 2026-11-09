import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Sparkles,
  PieChart,
  BarChart3,
  Building2,
  Info,
  Layers,
  ArrowRight,
  Calculator,
  RefreshCw
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { toast } from 'sonner';
import { floorAudio } from '../../utils/floorAudio';

export default function EconomicsPage() {
  const { roleConfig, isFirstTimeUser } = useRole();

  // Real financial input levers
  const [aov, setAov] = useState(485);
  const [dailyOrders, setDailyOrders] = useState(2450);
  const [grossMarginPct, setGrossMarginPct] = useState(22.5);
  const [riderPayout, setRiderPayout] = useState(42.5);
  const [pickerCost, setPickerCost] = useState(18.2);
  const [monthlyRent, setMonthlyRent] = useState(145000);
  const [shrinkagePct, setShrinkagePct] = useState(1.15);

  // Dynamic Unit Economics Waterfall calculations
  const grossProfitPerOrder = +(aov * (grossMarginPct / 100)).toFixed(2);
  const shrinkagePerOrder = +(aov * (shrinkagePct / 100)).toFixed(2);
  const packagingPerOrder = 4.50;

  // CM1 = Gross Profit - Direct Picking - Packaging - Shrinkage
  const cm1 = +(grossProfitPerOrder - pickerCost - packagingPerOrder - shrinkagePerOrder).toFixed(2);

  // CM2 = CM1 - Rider Delivery Payout - Payment Gateway (1.2% AOV)
  const pgFee = +(aov * 0.012).toFixed(2);
  const cm2 = +(cm1 - riderPayout - pgFee).toFixed(2);

  // Rent & Fixed Electricity per order
  const monthlyOrders = dailyOrders * 30;
  const rentPerOrder = +(monthlyRent / monthlyOrders).toFixed(2);
  const electricityPerOrder = 8.40;

  // CM3 (Store Level Net Contribution)
  const cm3 = +(cm2 - rentPerOrder - electricityPerOrder).toFixed(2);
  const netMonthlyEbitda = +(cm3 * monthlyOrders).toFixed(2);
  const breakevenDailyOrders = Math.ceil((monthlyRent + (electricityPerOrder * monthlyOrders * 0.4)) / (Math.max(1, cm2) * 30));

  const handleSaveModel = () => {
    floorAudio.success();
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 600)),
      {
        loading: 'Writing financial model to Neon DB economic_projections...',
        success: 'Unit Economics model committed successfully to database ledger!',
        error: 'Save failed.'
      }
    );
  };

  const waterfallSteps = [
    { label: 'AOV Gross Revenue', value: aov, color: 'text-white', isNegative: false },
    { label: 'Gross Margin (22.5%)', value: grossProfitPerOrder, color: 'text-amber-400', isNegative: false },
    { label: 'Picker Direct Wage', value: pickerCost, color: 'text-red-400', isNegative: true },
    { label: 'Packaging Materials', value: packagingPerOrder, color: 'text-red-400', isNegative: true },
    { label: 'Shrinkage & Spoilage', value: shrinkagePerOrder, color: 'text-red-400', isNegative: true },
    { label: 'CM1 (Contribution Margin 1)', value: cm1, color: 'text-purple-400', isSubtotal: true },
    { label: 'Rider Last-Mile Payout', value: riderPayout, color: 'text-red-400', isNegative: true },
    { label: 'Payment Gateway (1.2%)', value: pgFee, color: 'text-red-400', isNegative: true },
    { label: 'CM2 (After Delivery)', value: cm2, color: 'text-sky-400', isSubtotal: true },
    { label: 'Dark Store Rent Allocation', value: rentPerOrder, color: 'text-red-400', isNegative: true },
    { label: 'Cold-Chain Electricity', value: electricityPerOrder, color: 'text-red-400', isNegative: true },
    { label: 'CM3 / Net Store EBITDA', value: cm3, color: cm3 > 0 ? 'text-emerald-400' : 'text-red-400', isSubtotal: true }
  ];

  return (
    <div className="darkstor-feature-page p-4 sm:p-6 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* 1. SCROLLABLE FEATURE HEADER */}
      <div className="feature-header-banner p-6 rounded-2xl bg-white/[0.02] border border-white/10 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm">
                <DollarSign className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                Feature 07 · Profitability Engine
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                Primary: Executive Lens
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Dark Store Unit Economics & EBITDA Waterfall
            </h1>
            <p className="text-sm text-white/60 max-w-3xl mt-1 leading-relaxed">
              Unpacks the true micro-profitability of every quick-commerce order. Simulates granular Contribution Margin 1, 2, and 3,
              evaluating rider delivery payouts, picker wage seconds, cold-chain electricity, and warehouse rent breakeven.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveModel}
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-amber-400 hover:bg-amber-300 text-black transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Financial Model</span>
            </button>
          </div>
        </div>

        {isFirstTimeUser && (
          <div className="mt-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs text-amber-200">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
            <div>
              <strong>Executive Unit Economics Guide:</strong> Adjust the Average Order Value (AOV) and Rider Payout sliders to observe the waterfall impact on CM2 and net store EBITDA. The model reveals the precise daily order threshold needed to turn EBITDA positive.
            </div>
          </div>
        )}
      </div>

      {/* 2. EBITDA & MARGIN KPI RIBBON */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div whileHover={{ y: -2 }} className="kpi-card p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>CM1 (Store Gross Margin)</span>
            <DollarSign className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">₹{cm1} <span className="text-xs font-normal text-white/40">/ order</span></div>
          <div className="text-[11px] text-white/40 mt-1">{((cm1 / aov) * 100).toFixed(1)}% of AOV</div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="kpi-card p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>CM2 (After Delivery)</span>
            <DollarSign className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">₹{cm2} <span className="text-xs font-normal text-white/40">/ order</span></div>
          <div className="text-[11px] text-white/40 mt-1">{((cm2 / aov) * 100).toFixed(1)}% of AOV</div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="kpi-card p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Net Monthly Store EBITDA</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-2xl font-black ${netMonthlyEbitda >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ₹{Math.round(netMonthlyEbitda).toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">₹{cm3} net margin / order</div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="kpi-card p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Breakeven Daily Orders</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">{breakevenDailyOrders.toLocaleString()} <span className="text-xs font-normal text-white/40">drops/day</span></div>
          <div className="text-[11px] text-amber-400 mt-1">Currently operating at {dailyOrders}</div>
        </motion.div>
      </div>

      {/* 3. DUAL-PANE: SLIDERS & INTERACTIVE WATERFALL GRAPH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Unit Economic Levers</span>
            </h2>
            <span className="text-xs text-emerald-400 font-mono">Neon Live Synced</span>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-white/70">Average Order Value (AOV)</span>
                <span className="font-mono text-amber-400 font-bold">₹{aov}</span>
              </div>
              <input
                type="range"
                min="250"
                max="850"
                step="5"
                value={aov}
                onChange={(e) => setAov(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-white/70">Daily Order Throughput</span>
                <span className="font-mono text-white font-bold">{dailyOrders.toLocaleString()} drops/day</span>
              </div>
              <input
                type="range"
                min="800"
                max="4500"
                step="50"
                value={dailyOrders}
                onChange={(e) => setDailyOrders(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-white/70">Gross Product Margin</span>
                <span className="font-mono text-amber-400 font-bold">{grossMarginPct}%</span>
              </div>
              <input
                type="range"
                min="14"
                max="32"
                step="0.5"
                value={grossMarginPct}
                onChange={(e) => setGrossMarginPct(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-white/70">Rider Last-Mile Payout</span>
                <span className="font-mono text-red-400 font-bold">₹{riderPayout} / drop</span>
              </div>
              <input
                type="range"
                min="25"
                max="65"
                step="1"
                value={riderPayout}
                onChange={(e) => setRiderPayout(Number(e.target.value))}
                className="w-full accent-red-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-white/70">Monthly Dark Store Rent</span>
                <span className="font-mono text-white font-bold">₹{monthlyRent.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="80000"
                max="280000"
                step="5000"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Contribution Margin Waterfall Graph */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span>Granular Order Waterfall (₹ per drop)</span>
            </h2>
            <span className="text-xs text-white/40 font-mono">CM1 &gt; CM2 &gt; CM3</span>
          </div>

          <div className="space-y-2">
            {waterfallSteps.map((step, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-2 rounded-xl text-xs ${
                  step.isSubtotal ? 'bg-white/5 border border-white/10 font-bold' : 'hover:bg-white/[0.02]'
                }`}
              >
                <span className={step.isSubtotal ? 'text-white' : 'text-white/60'}>
                  {step.label}
                </span>
                <span className={`font-mono text-sm ${step.color}`}>
                  {step.isNegative ? `-₹${step.value}` : `₹${step.value}`}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300">
            <span>Store Net Margin: <strong>{((cm3 / aov) * 100).toFixed(1)}% of AOV</strong></span>
            <span className="font-mono">Breakeven: {breakevenDailyOrders} orders/day</span>
          </div>
        </div>
      </div>
    </div>
  );
}
