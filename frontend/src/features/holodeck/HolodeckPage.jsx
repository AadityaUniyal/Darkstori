import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu,
  Flame,
  Zap,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Compass,
  ArrowRight,
  Radio,
  Terminal,
  ThermometerSnowflake,
  TrendingDown,
  CloudRain,
  Truck,
  Package,
  CheckCircle2,
  Lock,
  RefreshCw,
  Globe,
  Sliders
} from 'lucide-react';
import { toast } from 'sonner';
import { floorAudio } from '../../utils/floorAudio';
import { useCity } from '../../context/CityContext';
import { useRole } from '../../context/RoleContext';

// ----------------------------------------------------------------------
// 1. MATHEMATICAL SIMULATED ENGINES (FROM SCRATCH, ZERO EXTERNAL SCRIPTS)
// ----------------------------------------------------------------------

// Multivariate Hawkes Process Basket Mutual Excitation Model
// Intensity: lambda_j(t) = mu_j + sum_{i} alpha_ij * exp(-beta * (t - t_i))
class InBrowserHawkesEngine {
  constructor() {
    this.mu = { dairy: 0.45, bakery: 0.35, produce: 0.50, beverages: 0.30, snacks: 0.40 };
    this.alpha = {
      dairy: { bakery: 0.88, produce: 0.62, beverages: 0.40, snacks: 0.25 },
      bakery: { dairy: 0.92, beverages: 0.70, snacks: 0.35, produce: 0.20 },
      produce: { dairy: 0.65, bakery: 0.30, snacks: 0.20, beverages: 0.35 },
      beverages: { snacks: 0.85, bakery: 0.50, dairy: 0.30, produce: 0.15 },
      snacks: { beverages: 0.90, bakery: 0.40, dairy: 0.25, produce: 0.10 }
    };
    this.beta = 0.85; // Exponential memory decay rate
  }

  computeExcitation(dwellEvents) {
    const results = {};
    const categories = ['dairy', 'bakery', 'produce', 'beverages', 'snacks'];
    
    categories.forEach(cat => {
      let intensity = this.mu[cat];
      dwellEvents.forEach(evt => {
        const weight = (this.alpha[evt.category] && this.alpha[evt.category][cat]) || 0;
        const decay = Math.exp(-this.beta * Math.max(0.2, evt.elapsedSec));
        intensity += weight * decay * (evt.dwellSec / 2.0);
      });
      // Sigmoid normalization to 0.0 - 1.0 probability
      const prob = 1.0 / (1.0 + Math.exp(-intensity * 1.8));
      results[cat] = Math.min(0.99, Math.max(0.05, prob));
    });

    return results;
  }
}

// Thermodynamic Flow Network Nodes
const INITIAL_NETWORK_NODES = [
  { id: 'node_mandi', label: 'APMC Supply Intake', type: 'source', entropy: 0.22, tempC: 24, flowRate: 48, status: 'STABLE' },
  { id: 'node_chiller', label: 'Walk-In Cold Vault (Chiller)', type: 'cold', entropy: 0.18, tempC: 2.8, flowRate: 85, status: 'STABLE' },
  { id: 'node_aisle1', label: 'Aisle 01 (Golden Dairy)', type: 'rack', entropy: 0.35, tempC: 21, flowRate: 140, status: 'STABLE' },
  { id: 'node_aisle2', label: 'Aisle 02 (Fresh Produce)', type: 'rack', entropy: 0.42, tempC: 22, flowRate: 110, status: 'STABLE' },
  { id: 'node_staging', label: 'Single-Pass Packing Dock', type: 'stage', entropy: 0.28, tempC: 23, flowRate: 130, status: 'STABLE' },
  { id: 'node_swarm', label: 'EV Last-Mile Swarm Fleet', type: 'sink', entropy: 0.30, tempC: 29, flowRate: 95, status: 'STABLE' }
];

// Chaos Perturbation Scenarios
const CHAOS_SCENARIOS = [
  {
    id: 'monsoon_flood',
    title: 'Monsoon Flash Flood (Corridor Waterlogging)',
    icon: CloudRain,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    description: 'Underpasses submerged in Koramangala. 40% fleet trapped. Instant noodle & hot beverage demand spikes 300%.',
    entropySpike: 0.88,
    affectedNodes: ['node_swarm', 'node_aisle2']
  },
  {
    id: 'chiller_trip',
    title: 'Chiller Compressor Phase Trip (Cold-Chain Hazard)',
    icon: ThermometerSnowflake,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    description: 'Compressor trips. Chiller temp climbs from 2.8°C to 11.4°C. ₹420,000 dairy & ice cream spoilage risk in 45 mins.',
    entropySpike: 0.94,
    affectedNodes: ['node_chiller', 'node_aisle1']
  },
  {
    id: 'flash_demand_spike',
    title: 'IPL Final Over Flash Crowd Surge',
    icon: Flame,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    description: '140 concurrent orders placed in 120 seconds. Single-pass packing dock experiences severe combinatorial bottleneck.',
    entropySpike: 0.82,
    affectedNodes: ['node_staging', 'node_aisle1']
  }
];

export default function HolodeckPage() {
  const { currentCity } = useCity();
  const { activeRole } = useRole();

  // Quantum Holographic Boot Sequence State
  const [booting, setBooting] = useState(true);
  const [bootLog, setBootLog] = useState([]);

  // Live Physics & Chaos State
  const [nodes, setNodes] = useState(INITIAL_NETWORK_NODES);
  const [activeChaos, setActiveChaos] = useState(null);
  const [selfHealingActive, setSelfHealingActive] = useState(false);
  const [healingStage, setHealingStage] = useState(0);
  const [systemEntropy, setSystemEntropy] = useState(0.26); // 0.0 - 1.0 (Low = Stable, High = Chaotic)
  const [avoidedSpoilageInr, setAvoidedSpoilageInr] = useState(0);
  const [prePickTriggered, setPrePickTriggered] = useState(false);

  // Anticipatory Hawkes Clickstream simulation
  const hawkesEngine = useMemo(() => new InBrowserHawkesEngine(), []);
  const [dwellEvents, setDwellEvents] = useState([
    { category: 'dairy', sku: 'Amul Taaza Milk 500ml', dwellSec: 3.8, elapsedSec: 1.2 },
    { category: 'bakery', sku: 'Modern Wheat Bread 400g', dwellSec: 2.1, elapsedSec: 0.5 }
  ]);

  const basketProbabilities = useMemo(() => {
    return hawkesEngine.computeExcitation(dwellEvents);
  }, [hawkesEngine, dwellEvents]);

  // Cybernetic Boot Sequence Logic
  useEffect(() => {
    const bootSteps = [
      'SYS_INIT: CONNECTING TO DARKSTORE FLUID-FLOW MANIFOLD...',
      'TENSOR_CALIBRATION: COMPUTING SPECTRAL LAPLACIAN EIGENMODES (λ₁ = 0.042)...',
      'HAWKES_ACTIVATION: DWELL-TIME CLICKSTREAM EXCITATION MATRIX ONLINE...',
      'MULTI_AGENT_CONSENSUS: 4 AUTONOMOUS RESILIENCE SENTINELS BOUND (RAFT-CONSENSUS)...',
      'HOLODECK_READY: THERMODYNAMIC EQUILIBRIUM ACHIEVED (S = 0.26 bit/sec).'
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < bootSteps.length) {
        setBootLog(prev => [...prev, bootSteps[current]]);
        floorAudio.click();
        current++;
      } else {
        clearInterval(interval);
        setTimeout(() => setBooting(false), 500);
      }
    }, 280);

    return () => clearInterval(interval);
  }, []);

  // Chaos Injection Handler
  const handleInjectChaos = (scenario) => {
    setActiveChaos(scenario);
    setSelfHealingActive(false);
    setHealingStage(0);
    floorAudio.playErrorMismatch();

    // Perturb system entropy and node temperatures
    setSystemEntropy(scenario.entropySpike);
    setNodes(prev => prev.map(n => {
      if (scenario.affectedNodes.includes(n.id)) {
        return {
          ...n,
          entropy: Math.min(0.99, n.entropy + 0.55),
          tempC: scenario.id === 'chiller_trip' && n.id === 'node_chiller' ? 11.4 : n.tempC,
          status: 'PERMITTED_CHAOS_ATTRACTOR'
        };
      }
      return n;
    }));

    toast.warning(`CHAOS INJECTED: ${scenario.title}! System entropy destabilized to ${scenario.entropySpike}.`);
  };

  // Autonomous Self-Healing Multi-Agent Actuation
  const handleTriggerSelfHealing = () => {
    if (!activeChaos) {
      toast.info('System is already in thermodynamic equilibrium.');
      return;
    }

    setSelfHealingActive(true);
    floorAudio.playDispatchSuccess();
    toast.success('Self-Healing Consensus Protocol Engaged: Multi-agent arbitration running...');

    // Staged autonomous healing actions
    setTimeout(() => {
      setHealingStage(1);
      floorAudio.click();
      toast.info('[AGENT_CHILLER] Initiating emergency cryogenic transshipment vector to sister pod.');
    }, 600);

    setTimeout(() => {
      setHealingStage(2);
      floorAudio.click();
      toast.info('[AGENT_SWARM] Geofence dynamically shrunk to 1.4km; EV battery throttles rerouted.');
    }, 1200);

    setTimeout(() => {
      setHealingStage(3);
      floorAudio.click();
      toast.info('[AGENT_ENTROPY] Reslotting high-velocity SKUs into Staging Bay via Simulated Annealing.');
    }, 1800);

    setTimeout(() => {
      setHealingStage(4);
      setSystemEntropy(0.24);
      setNodes(INITIAL_NETWORK_NODES.map(n => ({ ...n, status: 'STABLE_EQUILIBRIUM' })));
      setAvoidedSpoilageInr(prev => prev + 348000);
      setActiveChaos(null);
      setSelfHealingActive(false);
      floorAudio.playDispatchSuccess();
      toast.success('HOLODECK EQUILIBRIUM RESTORED: All 4 agents achieved deterministic consensus. ₹3,48,000 loss avoided!');
    }, 2400);
  };

  // Pre-Pick Staging Actuation from Hawkes Point Process
  const handleTriggerPrePick = () => {
    setPrePickTriggered(true);
    floorAudio.playSuccessPick();
    toast.success('Anticipatory Pre-Pick Dispatched! 2 items staged in Bay B before customer completed checkout. 3.2m saved!');
  };

  // If in custom boot state, render cybernetic terminal loading screen
  if (booting) {
    return (
      <div className="fixed inset-0 z-[2000] bg-[#04060A] flex flex-col items-center justify-center p-6 font-mono text-emerald-400 select-none">
        <div className="w-full max-w-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-emerald-500/30 pb-3">
            <Cpu className="w-6 h-6 text-emerald-400 animate-spin" />
            <div>
              <div className="text-sm font-bold tracking-widest uppercase">DarkStori Neuro-Twin Core</div>
              <div className="text-[10px] text-emerald-500/60">Thermodynamic Quantum Holodeck v4.0.0</div>
            </div>
          </div>

          <div className="bg-black/80 border border-emerald-500/20 rounded-xl p-4 min-h-[220px] text-xs space-y-2 overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            {bootLog.map((line, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
              >
                <span className="text-emerald-500/40 text-[10px]">&gt;</span>
                <span className={idx === bootLog.length - 1 ? 'text-white font-bold' : 'text-emerald-400/80'}>
                  {line}
                </span>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-emerald-500/40">
            <span>Deterministic Graph Tensor · Zero External Scripts</span>
            <span className="animate-pulse">BOOTING...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="holodeck-page p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-white">
      {/* 1. CYBERNETIC HOLODECK HEADER BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#070B14] via-[#0D1527] to-[#080D1A] border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                <Cpu className="w-5 h-5 animate-pulse" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                Invention Tab · Autonomous Darkstore Holo-Twin
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Hawkes & Thermodynamics Core
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Thermodynamic Entropy & Self-Healing Holodeck
            </h1>
            <p className="text-xs sm:text-sm text-cyan-100/60 max-w-3xl mt-1 leading-relaxed">
              Unifies inside-the-4-walls physics, anticipatory clickstream pre-picking, and multi-agent fault arbitration into a single self-healing operating core.
            </p>
          </div>

          {/* Entropy Gauge & Autonomous Trigger */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-3 rounded-2xl bg-black/60 border border-white/10 text-right font-mono">
              <div className="text-[10px] uppercase text-white/40 tracking-wider">System Entropy</div>
              <div className={`text-xl font-black ${systemEntropy > 0.6 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`}>
                S = {systemEntropy.toFixed(2)} <span className="text-[11px] font-normal text-white/50">bit/s</span>
              </div>
            </div>

            <button
              onClick={handleTriggerSelfHealing}
              disabled={selfHealingActive || !activeChaos}
              className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                activeChaos
                  ? 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-cyan-400/25 animate-bounce'
                  : 'bg-white/5 text-white/40 border border-white/10 cursor-not-allowed'
              }`}
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{selfHealingActive ? 'Arbitrating Consensus...' : 'Trigger Self-Healing'}</span>
            </button>
          </div>
        </div>

        {/* Real-Time Avoided Financial Loss Ribbon */}
        {avoidedSpoilageInr > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 pt-3 border-t border-cyan-500/20 flex items-center justify-between text-xs text-cyan-300 font-mono"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Autonomous Multi-Agent Consensus: ₹{avoidedSpoilageInr.toLocaleString('en-IN')} Cold-Chain Loss Prevented!</span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 font-bold">
              0% WASTAGE HIT
            </span>
          </motion.div>
        )}
      </div>

      {/* 2. CHAOS INJECTION SIMULATOR (TEST SYSTEM RESILIENCE) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white/70 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Chaos & Perturbation Injection Deck (Stress Test)
          </span>
          <span className="text-[10px] font-mono text-white/40">Select scenario to perturb physical equilibrium</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CHAOS_SCENARIOS.map(sc => {
            const isCurrent = activeChaos?.id === sc.id;
            const Icon = sc.icon;
            return (
              <button
                key={sc.id}
                onClick={() => handleInjectChaos(sc)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  isCurrent
                    ? `${sc.color} shadow-lg ring-1 ring-rose-400/50`
                    : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-white/10 w-fit">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/40">
                    S-SPIKE: +{sc.entropySpike}
                  </span>
                </div>
                <div className="text-xs font-bold text-white">{sc.title}</div>
                <p className="text-[11px] text-white/50 mt-1 leading-snug">{sc.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. THERMODYNAMIC FLOW NETWORK VISUALIZER */}
      <div className="p-5 rounded-3xl bg-[#060810] border border-white/10 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Thermodynamic Darkstore Flow Manifold
            </h2>
          </div>
          <span className="text-[10px] font-mono text-white/40">
            Flow Flux: Joules / Minute across Racks, Chillers & Staging Sinks
          </span>
        </div>

        {/* Flow Nodes Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {nodes.map(node => {
            const isHot = node.entropy > 0.6;
            return (
              <div
                key={node.id}
                className={`p-3.5 rounded-2xl border transition-all relative ${
                  isHot
                    ? 'bg-rose-500/15 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                    : 'bg-white/[0.02] border-white/10'
                }`}
              >
                <div className="text-[10px] font-mono text-white/40 truncate">{node.type.toUpperCase()}</div>
                <div className="text-xs font-bold text-white mt-0.5 truncate">{node.label}</div>

                <div className="space-y-1 mt-3 pt-2 border-t border-white/10 text-[11px] font-mono">
                  <div className="flex justify-between text-white/50">
                    <span>Temp:</span>
                    <strong className={node.tempC > 8.0 && node.type === 'cold' ? 'text-rose-400 animate-pulse' : 'text-white'}>
                      {node.tempC}°C
                    </strong>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>Flux:</span>
                    <strong className="text-cyan-300">{node.flowRate} u/m</strong>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>Entropy:</span>
                    <strong className={isHot ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {node.entropy.toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. ANTICIPATORY HAWKES POINT PROCESS (PRE-PICK STAGING) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Hawkes Clickstream Predictor */}
        <div className="lg:col-span-7 p-5 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">
                Multivariate Hawkes Process: Real-Time Clickstream Intent
              </h3>
            </div>
            <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              Anticipatory Pre-Pick
            </span>
          </div>

          <p className="text-xs text-white/60">
            Calculates cross-excitation intensity from consumer browsing dwell-times to predict cart items <em>before</em> checkout.
          </p>

          {/* Predicted Probabilities Progress Bars */}
          <div className="space-y-3 pt-1">
            {Object.entries(basketProbabilities).map(([category, prob]) => {
              const pct = Math.round(prob * 100);
              const willPrePick = pct >= 80;
              return (
                <div key={category} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white/70 uppercase">{category} Category</span>
                    <span className={willPrePick ? 'text-emerald-400 font-bold' : 'text-white/40'}>
                      {pct}% Probability {willPrePick && '(Pre-Pick Triggered)'}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        willPrePick ? 'bg-gradient-to-r from-purple-500 to-emerald-400' : 'bg-white/20'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] font-mono text-white/40">
              Simulated Dwell: 3.8s on Dairy · 2.1s on Bakery
            </span>
            <button
              onClick={handleTriggerPrePick}
              disabled={prePickTriggered}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-500 hover:bg-purple-400 text-white shadow-md shadow-purple-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {prePickTriggered ? '✓ Items Pre-Staged in Bay B' : 'Actuate Anticipatory Pre-Pick'}
            </button>
          </div>
        </div>

        {/* Right: Multi-Agent Consensus Ledger */}
        <div className="lg:col-span-5 p-5 rounded-3xl bg-white/[0.02] border border-white/10 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Multi-Agent Self-Healing Consensus</h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-300">4 Active Daemons</span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
              <div>
                <strong className="text-white">AGENT_CHILLER</strong>
                <div className="text-[10px] text-white/40">Phase compressor & thermal hazard guardian</div>
              </div>
              <span className="text-emerald-400 text-[10px] font-bold">ONLINE (0.04ms)</span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
              <div>
                <strong className="text-white">AGENT_SWARM</strong>
                <div className="text-[10px] text-white/40">Geofence shrink & flood corridor router</div>
              </div>
              <span className="text-emerald-400 text-[10px] font-bold">ONLINE (0.08ms)</span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
              <div>
                <strong className="text-white">AGENT_ENTROPY</strong>
                <div className="text-[10px] text-white/40">Simulated Annealing Golden Zone slotting</div>
              </div>
              <span className="text-emerald-400 text-[10px] font-bold">ONLINE (0.02ms)</span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
              <div>
                <strong className="text-white">AGENT_TRANSSHIP</strong>
                <div className="text-[10px] text-white/40">Autonomous cross-pod transshipment scheduler</div>
              </div>
              <span className="text-emerald-400 text-[10px] font-bold">ONLINE (0.06ms)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}