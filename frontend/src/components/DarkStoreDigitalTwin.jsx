import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, Zap, Eye, ShoppingCart, Clock, ArrowRight, ShieldCheck,
  AlertTriangle, CheckCircle2, Sliders, Sparkles, Navigation, Layers
} from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';

export default function DarkStoreDigitalTwin() {
  const [selectedCategory, setSelectedCategory] = useState('dairy');
  const [dwellSec, setDwellSec] = useState(3.5);
  const [trafficCongestion, setTrafficCongestion] = useState(1.25);
  const [rainMm, setRainMm] = useState(18.0);
  const [simData, setSimData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isPickerMoving, setIsPickerMoving] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    setIsPickerMoving(true);
    try {
      const res = await api.simulateNeuroSymbolicDarkstore({
        dwell_events: [
          { category: selectedCategory, dwell_sec: dwellSec },
          { category: selectedCategory === 'dairy' ? 'bakery' : 'dairy', dwell_sec: dwellSec * 0.7 },
        ],
        traffic_congestion: trafficCongestion,
        rain_mm: rainMm,
      });
      setSimData(res);
      setTimeout(() => setIsPickerMoving(false), 900);
    } catch (e) {
      toast.error('Simulation calculation failed');
      setIsPickerMoving(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [selectedCategory, dwellSec, trafficCongestion, rainMm]);

  const apex = simData?.darkstori_apex_pipeline;
  const trad = simData?.traditional_pipeline;
  const twin = simData?.digital_twin;

  return (
    <div className="glass-card p-5 sm:p-6 rounded-2xl border border-white/10 bg-[#0E121A]/90 backdrop-blur-2xl shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-[#0071E3] to-purple-600 text-white shadow-lg shadow-[#0071E3]/25 border border-white/10">
            <Eye size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white font-display tracking-tight">
                Neuro-Symbolic Anticipatory Dark Store Brain
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gradient-to-r from-[#0071E3]/20 to-purple-500/20 text-[#38BDF8] border border-[#0071E3]/30 font-bold">
                GOD'S EYE DIGITAL TWIN
              </span>
            </div>
            <p className="text-xs text-slate-400 font-body">
              Hawkes Mutual-Excitation Point Process &times; Locally-Adaptive CQR &times; Autonomous Micro-Fulfillment Actuation
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 bg-[#141A24] px-3.5 py-1.5 rounded-xl border border-white/10 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-mono text-emerald-400 font-semibold">CLOSED-LOOP ACTUATORS ACTIVE</span>
        </div>
      </div>

      {/* 3-Column Cockpit Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Column 1: Customer Clickstream & Hawkes Engine (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white uppercase tracking-wider font-mono text-[11px] flex items-center gap-1.5">
                <ShoppingCart size={13} className="text-[#38BDF8]" /> Customer Dwell Telemetry
              </span>
              <span className="text-slate-400 font-mono text-[10px]">App Clickstream</span>
            </div>

            {/* Simulated Mobile Product Card Tabs */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 block font-medium">Customer Active Browsing Focus:</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'dairy', label: 'Amul Gold Milk', aisle: 'Aisle 1' },
                  { id: 'bakery', label: 'Zero Maida Bread', aisle: 'Aisle 2' },
                  { id: 'produce', label: 'Shimla Apples', aisle: 'Aisle 3' },
                  { id: 'beverages', label: 'Cold Brew Vanilla', aisle: 'Aisle 4' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedCategory(item.id)}
                    className={`p-2 rounded-lg text-left text-xs transition-all border ${
                      selectedCategory === item.id
                        ? 'bg-[#0071E3]/20 border-[#0071E3] text-white shadow-sm'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-semibold truncate">{item.label}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{item.aisle}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dwell Time Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>SKU Dwell Duration:</span>
                <span className="font-mono text-[#38BDF8] font-bold">{dwellSec.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="6.0"
                step="0.5"
                value={dwellSec}
                onChange={(e) => setDwellSec(Number(e.target.value))}
                className="w-full accent-[#0071E3] h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            {/* Environmental Stressors */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>Monsoon Rain Intensity:</span>
                <span className="font-mono text-sky-400 font-bold">{rainMm} mm/h</span>
              </div>
              <input
                type="range"
                min="0"
                max="45"
                step="5"
                value={rainMm}
                onChange={(e) => setRainMm(Number(e.target.value))}
                className="w-full accent-sky-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />

              <div className="flex justify-between text-[11px] text-slate-300 mt-2">
                <span>Road Congestion Index:</span>
                <span className="font-mono text-amber-400 font-bold">{trafficCongestion.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="1.8"
                step="0.05"
                value={trafficCongestion}
                onChange={(e) => setTrafficCongestion(Number(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Hawkes Mutual Excitation Basket List */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Hawkes Basket Intent Probabilities (&lambda;(t))
            </span>

            <div className="space-y-1.5">
              {simData?.hawkes_predicted_basket?.map((item) => (
                <div key={item.category} className="p-2 rounded-lg bg-black/20 border border-white/5 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-white font-medium truncate">{item.sku_name}</span>
                    <span className={`font-mono font-bold text-[11px] ${item.prepick_triggered ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {item.prepick_confidence_pct}%
                    </span>
                  </div>
                  <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${item.prepick_triggered ? 'bg-emerald-400' : 'bg-[#0071E3]'}`}
                      style={{ width: `${item.prepick_confidence_pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: Interactive 2D Dark Store Floor Plan (Digital Twin) (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-xl bg-gradient-to-b from-[#141A24] to-[#0A0D14] border border-white/10 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white font-mono text-[11px] flex items-center gap-1.5">
                <Layers size={13} className="text-purple-400" /> Dark Store Floor Digital Twin
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {twin?.picker_kinematics?.prepick_status || 'STAGED'}
              </span>
            </div>

            {/* Warehouse Map Grid */}
            <div className="p-3 bg-[#07090E] rounded-xl border border-white/5 space-y-3 text-xs relative">
              {/* 4 Physical Aisles */}
              <div className="grid grid-cols-4 gap-2 h-44 text-center">
                {[
                  { name: 'Aisle 1', cat: 'Dairy', color: '#0071E3' },
                  { name: 'Aisle 2', cat: 'Bakery', color: '#A855F7' },
                  { name: 'Aisle 3', cat: 'Produce', color: '#10B981' },
                  { name: 'Aisle 4', cat: 'Beverages', color: '#F59E0B' },
                ].map((aisle, idx) => (
                  <div
                    key={aisle.name}
                    className="p-2 rounded-lg border border-dashed flex flex-col justify-between relative overflow-hidden transition-all"
                    style={{
                      borderColor: aisle.color + '40',
                      background: aisle.color + '08'
                    }}
                  >
                    <span className="font-mono font-bold text-[10px] text-slate-300">{aisle.name}</span>
                    <span className="text-[10px] text-slate-400">{aisle.cat}</span>

                    {/* Animated Kinematic Picker Bot when targeting this aisle */}
                    {isPickerMoving && (
                      <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -80, opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                        className="w-4 h-4 rounded-full bg-white shadow-lg mx-auto flex items-center justify-center text-[8px] font-bold text-black"
                      >
                        P
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>

              {/* Staging Bay Handoff */}
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-slate-200">Staging Bay #BAY-C3</span>
                </div>
                <span className="font-mono text-[11px] text-[#38BDF8] font-bold">
                  Tote #{twin?.picker_kinematics?.tote_id || 'TOTE-942'}
                </span>
              </div>

              {/* Rider EV Bay */}
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-[11px]">
                <span className="text-emerald-400 font-medium">EV Rider Bay: Pre-Warmed Handoff</span>
                <span className="font-mono text-emerald-400 font-bold">0 Rider Wait</span>
              </div>
            </div>

            {/* Kinematic Telemetry Strip */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-1">
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-slate-400 text-[10px] block">PICKER SPRINT DIST</span>
                <span className="font-bold text-white">{twin?.picker_kinematics?.travel_distance_meters || 17.0} m</span>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-slate-400 text-[10px] block">IN-STORE WALK TIME</span>
                <span className="font-bold text-emerald-400">{twin?.picker_kinematics?.pick_walk_time_seconds || 12.1} s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: The Empirical Proof - Traditional vs. Darkstori Apex (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white uppercase tracking-wider font-mono text-[11px] flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" /> Empirical SLA Proof
              </span>
              <span className="text-[10px] font-mono text-slate-400">Head-to-Head</span>
            </div>

            {/* Benchmark Comparison Card */}
            <div className="space-y-3">
              {/* Traditional Benchmark */}
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-red-300">Traditional Quick-Commerce</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">
                    SLA BREACHED
                  </span>
                </div>
                <div className="text-xl font-bold font-mono text-red-400">
                  {trad?.point_eta_min || 9.8}m <span className="text-xs text-red-300/80 font-normal">(Upper: {trad?.upper_bound_min || 11.7}m)</span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>Pick-to-Pack: <strong>2m 14s</strong></span>
                  <span>Store Promise: <strong>15 mins</strong></span>
                </div>
              </div>

              {/* Darkstori Apex Benchmark */}
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 space-y-1.5 text-xs shadow-lg shadow-emerald-500/5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-emerald-300 flex items-center gap-1">
                    <Sparkles size={12} /> Darkstori Apex Closed-Loop
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                    100% SLA DEFENDED
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {apex?.point_eta_min || 6.8}m <span className="text-xs text-emerald-400 font-normal">[{apex?.lower_bound_min || 5.4}m &mdash; {apex?.upper_bound_min || 8.6}m]</span>
                </div>
                <div className="text-[11px] text-slate-300 flex justify-between border-t border-emerald-500/20 pt-1 mt-1">
                  <span>Pick-to-Pack: <strong className="text-emerald-400">28s (Pre-Staged)</strong></span>
                  <span>Promise: <strong className="text-white">10 mins Guaranteed</strong></span>
                </div>
              </div>
            </div>

            {/* Actuators Summary */}
            <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Total Pipeline Latency Shaved: <strong className="text-emerald-400 font-mono">-{apex?.total_latency_saved_min || 3.6} mins</strong>
              </span>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-300">
                  <span>&bull; Anticipatory Pre-Picking:</span>
                  <span className="font-mono text-emerald-400 font-bold">-1.8 mins</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>&bull; Staging Bay Priority:</span>
                  <span className="font-mono text-emerald-400 font-bold">-0.6 mins</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>&bull; Clarke-Wright VRP Insertion:</span>
                  <span className="font-mono text-emerald-400 font-bold">-1.2 mins</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
