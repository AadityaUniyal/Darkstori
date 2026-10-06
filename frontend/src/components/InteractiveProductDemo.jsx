import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  MapPin,
  DollarSign,
  Truck,
  CloudRain,
  ArrowRight,
  CheckCircle2,
  Layers,
  Activity,
  Zap,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DEMO_CHAPTERS = [
  {
    id: 'greenfield',
    badge: 'Spatial Intelligence',
    title: 'PostGIS Greenfield Scouting & Cannibalization Defense',
    description: 'Autonomous spatial clustering identifies unserved demand clusters while safeguarding your existing dark stores against revenue cannibalization.',
    icon: MapPin,
    accent: '#0071E3',
    stats: [
      { label: 'Demand Density', value: '4,850 orders/km²' },
      { label: 'Whitespace Index', value: '94.2/100' },
      { label: 'Cannibalization Risk', value: '3.8% (Safe)' },
      { label: 'Breakeven Horizon', value: '5.2 Months' }
    ]
  },
  {
    id: 'sigmoid',
    badge: 'Margin Preservation',
    title: 'Dynamic Sigmoid Perishable Markdown Engine',
    description: 'Replaces blunt 50% loss discounts with continuous mathematical decay curves, clearing 100% of fresh inventory right at optimal consumer willingness-to-pay.',
    icon: DollarSign,
    accent: '#34C759',
    stats: [
      { label: 'Waste Target', value: '0% Landfill' },
      { label: 'Revenue Salvaged', value: '₹1.84L / month' },
      { label: 'Decay Frequency', value: 'Every 15 mins' },
      { label: 'Margin Recovery', value: '+24.6%' }
    ]
  },
  {
    id: 'vrp',
    badge: 'Fleet Logistics',
    title: 'Clarke-Wright 10-Minute VRP Fleet Batching',
    description: 'Intelligent multi-drop clustering bundles proximate deliveries within a 1.8km radius without breaching the stringent 10-minute consumer SLA.',
    icon: Truck,
    accent: '#38BDF8',
    stats: [
      { label: 'Average ETA', value: '7.8 mins' },
      { label: 'Riders Saved', value: '-38% Fleet Cost' },
      { label: 'SLA Adherence', value: '99.4%' },
      { label: 'CO2 Reduction', value: '1.2 kg / hr' }
    ]
  },
  {
    id: 'playbooks',
    badge: 'Surge Automation',
    title: 'Pre-emptive Weather & Surge Playbook Execution',
    description: 'Real-time telemetry detects monsoon rain downpours 20 minutes before impact, automatically shrinking delivery geofences and scaling rider surge incentives.',
    icon: CloudRain,
    accent: '#FF9500',
    stats: [
      { label: 'Surge Lead Time', value: '22 mins' },
      { label: 'SLA Breach Rate', value: '< 0.6%' },
      { label: 'Rider Availability', value: '+45%' },
      { label: 'Auto Rule Exec', value: '100% Prescriptive' }
    ]
  }
];

export default function InteractiveProductDemo({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // Interactive Chapter 1 State
  const [hubRadius, setHubRadius] = useState(1.8);
  // Interactive Chapter 2 State
  const [perishableHoursLeft, setPerishableHoursLeft] = useState(9);
  // Interactive Chapter 3 State
  const [activeRiderStep, setActiveRiderStep] = useState(2);
  // Interactive Chapter 4 State
  const [isMonsoonSimulated, setIsMonsoonSimulated] = useState(true);

  const currentChapter = DEMO_CHAPTERS[currentChapterIndex];

  // Auto-play timer for chapters
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const timer = setInterval(() => {
      setPlaybackProgress((prev) => {
        if (prev >= 100) {
          setCurrentChapterIndex((prevIdx) => (prevIdx + 1) % DEMO_CHAPTERS.length);
          return 0;
        }
        return prev + 2;
      });
    }, 150);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, currentChapterIndex]);

  // Reset progress when manual tab change
  const handleSelectChapter = (idx) => {
    setCurrentChapterIndex(idx);
    setPlaybackProgress(0);
  };

  const handleNext = () => {
    setCurrentChapterIndex((prev) => (prev + 1) % DEMO_CHAPTERS.length);
    setPlaybackProgress(0);
  };

  const handlePrev = () => {
    setCurrentChapterIndex((prev) => (prev - 1 + DEMO_CHAPTERS.length) % DEMO_CHAPTERS.length);
    setPlaybackProgress(0);
  };

  const handleLaunchCockpit = () => {
    onClose();
    navigate('/cockpit');
  };

  if (!isOpen) return null;

  // Sigmoid formula calculation for Chapter 2
  const decayPct = Math.round((1 / (1 + Math.exp(-0.35 * (12 - perishableHoursLeft)))) * 100);
  const discountVal = Math.min(80, Math.max(0, Math.round((100 - decayPct) * 0.85)));

  return (
    <div className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-3 md:p-6 animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl bg-[#0E121A] border border-white/12 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Top Apple-Style Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#07090E]/60 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#0071E3]/20 border border-[#0071E3]/40 flex items-center justify-center text-[#38BDF8]">
              <Cpu size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">Darkstori Live Product Tour</span>
                <span className="px-2 py-0.5 rounded-full bg-[#0071E3]/15 text-[#38BDF8] text-[10px] font-semibold uppercase tracking-wider border border-[#0071E3]/25">
                  Interactive Demo
                </span>
              </div>
              <p className="text-xs text-[#86868B]">Sub-10-minute predictive & prescriptive engines in action</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isPlaying ? 'Pause Tour' : 'Play Tour'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#86868B] hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Chapter Navigation Timeline */}
        <div className="grid grid-cols-4 border-b border-white/10 bg-[#0A0D14]">
          {DEMO_CHAPTERS.map((ch, idx) => {
            const Icon = ch.icon;
            const isActive = idx === currentChapterIndex;
            return (
              <button
                key={ch.id}
                onClick={() => handleSelectChapter(idx)}
                className={`p-3.5 text-left border-r border-white/5 transition-all relative overflow-hidden flex flex-col justify-between ${
                  isActive ? 'bg-[#0071E3]/10 text-white' : 'hover:bg-white/[0.03] text-[#86868B]'
                }`}
              >
                {isActive && (
                  <div
                    className="absolute top-0 left-0 h-[2px] bg-[#38BDF8] transition-all duration-150"
                    style={{ width: `${playbackProgress}%` }}
                  />
                )}
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className={isActive ? 'text-[#38BDF8]' : 'text-[#86868B]'} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">
                    Ch. {idx + 1}
                  </span>
                </div>
                <span className={`text-xs font-medium truncate ${isActive ? 'text-white' : 'text-[#86868B]'}`}>
                  {ch.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Interactive Stage */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Narrative Column */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0071E3]/10 border border-[#0071E3]/20 text-[#38BDF8] text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles size={13} />
                <span>{currentChapter.badge}</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight leading-snug">
                {currentChapter.title}
              </h2>
              <p className="text-xs md:text-sm text-[#86868B] mt-2 leading-relaxed">
                {currentChapter.description}
              </p>
            </div>

            {/* Dynamic Metric Badges */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              {currentChapter.stats.map((st, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-[#141A24]/70 border border-white/10">
                  <span className="text-[10px] uppercase font-semibold text-[#86868B] block">{st.label}</span>
                  <span className="text-xs md:text-sm font-bold text-white">{st.value}</span>
                </div>
              ))}
            </div>

            {/* Chapter Step Controller */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
                  title="Previous Chapter"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={handleNext}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
                  title="Next Chapter"
                >
                  <ChevronRight size={16} />
                </button>
                <span className="text-xs text-[#86868B] ml-1">
                  Chapter {currentChapterIndex + 1} of {DEMO_CHAPTERS.length}
                </span>
              </div>

              <button
                onClick={handleLaunchCockpit}
                className="px-4 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0A84FF] text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-[#0071E3]/25 transition-all"
              >
                <span>Try In Cockpit</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Right Interactive Visual Simulation Canvas */}
          <div className="lg:col-span-7 bg-[#07090E] border border-white/10 rounded-2xl p-5 shadow-inner min-h-[360px] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#0071E3]/5 rounded-full blur-3xl pointer-events-none" />

            {/* Stage 1: Spatial Radar Simulation */}
            {currentChapterIndex === 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#34C759] animate-ping" />
                    <span className="text-xs font-semibold text-white">Bangalore HSR Sector 4 Radar</span>
                  </div>
                  <span className="text-xs text-[#38BDF8] font-semibold">PostGIS DBSCAN Active</span>
                </div>

                {/* Animated Radar Area */}
                <div className="relative h-48 rounded-xl bg-[#0E121A] border border-white/10 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(#0071E3_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
                  
                  {/* Concentric rings */}
                  <div className="w-40 h-40 rounded-full border border-[#0071E3]/30 animate-pulse absolute" />
                  <div className="w-28 h-28 rounded-full border border-[#0071E3]/40 absolute" />
                  <div className="w-16 h-16 rounded-full border border-[#0071E3]/60 absolute" />

                  {/* Nodes */}
                  <div className="absolute top-[48%] left-[48%] -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#0071E3] border-2 border-white flex items-center justify-center shadow-lg shadow-[#0071E3]/50">
                    <span className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <div className="absolute top-[25%] left-[70%] px-2 py-1 rounded bg-red-500/20 border border-red-500/40 text-[10px] text-red-400 font-semibold">
                    Competitor Blinkit (1.4km)
                  </div>
                  <div className="absolute top-[70%] left-[30%] px-2 py-1 rounded bg-purple-500/20 border border-purple-500/40 text-[10px] text-purple-400 font-semibold">
                    Competitor Zepto (1.9km)
                  </div>
                  <div className="absolute top-[35%] left-[30%] px-2 py-1 rounded bg-[#34C759]/20 border border-[#34C759]/40 text-[10px] text-[#34C759] font-semibold">
                    Demand Hotspot (+320 orders)
                  </div>
                </div>

                {/* Interactive Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#86868B]">
                    <span>Scouting Radius: <strong>{hubRadius} km</strong></span>
                    <span>Density Coverage: <strong>{Math.round(hubRadius * 520)} orders/hr</strong></span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="3.5"
                    step="0.1"
                    value={hubRadius}
                    onChange={(e) => setHubRadius(Number(e.target.value))}
                    className="w-full accent-[#0071E3] h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Stage 2: Sigmoid Markdown Curve */}
            {currentChapterIndex === 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-xs font-semibold text-white">Dynamic Pricing Decay Engine</span>
                  <span className="text-xs text-[#34C759] font-semibold">Decay Score: {decayPct}%</span>
                </div>

                <div className="relative h-48 rounded-xl bg-[#0E121A] border border-white/10 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#34C759]">Fresh Stock (100% Margin)</span>
                    <span className="text-[#FF9500]">Sigmoid Markdown Threshold</span>
                    <span className="text-red-400">Zero-Waste Salvage</span>
                  </div>

                  <svg viewBox="0 0 400 120" className="w-full h-24 overflow-visible">
                    <defs>
                      <linearGradient id="demoSigGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#34C759" />
                        <stop offset="60%" stopColor="#FF9500" />
                        <stop offset="100%" stopColor="#FF3B30" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 10 20 C 180 20, 220 100, 390 100"
                      stroke="url(#demoSigGrad)"
                      strokeWidth="3.5"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <circle
                      cx={Math.max(20, Math.min(380, 400 - (perishableHoursLeft * 10)))}
                      cy={Math.max(25, Math.min(95, 120 - decayPct))}
                      r="6"
                      fill="#0071E3"
                      className="animate-pulse"
                    />
                  </svg>

                  <div className="flex items-center justify-between text-xs bg-white/5 p-2 rounded-lg">
                    <span className="text-[#86868B]">Calculated Promo Markdown:</span>
                    <strong className="text-[#38BDF8]">-{discountVal}% Off Base Price</strong>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#86868B]">
                    <span>Shelf Life Remaining: <strong>{perishableHoursLeft} Hours</strong></span>
                    <span>Salvaged Batch Rate: <strong>{100 - discountVal}%</strong></span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="24"
                    step="1"
                    value={perishableHoursLeft}
                    onChange={(e) => setPerishableHoursLeft(Number(e.target.value))}
                    className="w-full accent-[#34C759] h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Stage 3: Clarke-Wright VRP Multi-Drop */}
            {currentChapterIndex === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-xs font-semibold text-white">10-Min VRP Multi-Drop Dispatch</span>
                  <span className="text-xs text-[#38BDF8] font-semibold">3 Drops Batched</span>
                </div>

                <div className="space-y-2">
                  {[
                    { step: 1, name: 'HSR Dark Store Central Hub', time: '00:00', dist: '0.0 km', status: 'Dispatched' },
                    { step: 2, name: 'Drop A: 27th Main Rd (Apartment Complex)', time: '04:15 ETA', dist: '1.1 km', status: 'On Track' },
                    { step: 3, name: 'Drop B: 19th Cross Rd (Villa Gate 2)', time: '07:40 ETA', dist: '1.9 km', status: 'SLA Confirmed' }
                  ].map((s) => (
                    <div
                      key={s.step}
                      onClick={() => setActiveRiderStep(s.step)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        activeRiderStep === s.step
                          ? 'bg-[#0071E3]/15 border-[#0071E3]/40 text-white'
                          : 'bg-[#141A24]/60 border-white/5 text-[#86868B] hover:bg-[#141A24]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#0071E3]/20 text-[#38BDF8] text-xs font-bold flex items-center justify-center">
                          {s.step}
                        </span>
                        <div>
                          <span className="text-xs font-semibold text-white block">{s.name}</span>
                          <span className="text-[10px] text-[#86868B]">{s.dist} from previous drop</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#34C759] block">{s.time}</span>
                        <span className="text-[10px] text-[#86868B]">{s.status}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#86868B] flex items-center justify-between">
                  <span>Batch Savings vs 3 Individual Trips:</span>
                  <strong className="text-[#38BDF8]">+42.8% Faster • -2.4km Rider Travel</strong>
                </div>
              </div>
            )}

            {/* Stage 4: Monsoon & Surge Playbook */}
            {currentChapterIndex === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <CloudRain size={16} className="text-[#38BDF8]" />
                    <span className="text-xs font-semibold text-white">Monsoon Telemetry Trigger</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                    isMonsoonSimulated ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/10 text-white'
                  }`}>
                    {isMonsoonSimulated ? 'Surge Active' : 'Normal Conditions'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#141A24] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#86868B]">Simulated Event:</span>
                    <button
                      onClick={() => setIsMonsoonSimulated(!isMonsoonSimulated)}
                      className="px-3 py-1 rounded-lg bg-[#0071E3]/20 border border-[#0071E3]/40 text-xs font-semibold text-[#38BDF8] hover:bg-[#0071E3]/30 transition-all"
                    >
                      {isMonsoonSimulated ? 'Toggle Sunny Weather' : 'Trigger Rain Downpour'}
                    </button>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white">1. Contract Delivery Radius:</span>
                      <strong className={isMonsoonSimulated ? 'text-amber-400' : 'text-[#86868B]'}>
                        {isMonsoonSimulated ? '2.5km → 1.6km (-36%)' : '2.5km Standard'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white">2. Rider Surge Incentive:</span>
                      <strong className={isMonsoonSimulated ? 'text-[#34C759]' : 'text-[#86868B]'}>
                        {isMonsoonSimulated ? '+₹25/order (1.4x scale)' : 'Standard Payout'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white">3. Stock Pre-allocation:</span>
                      <strong className={isMonsoonSimulated ? 'text-[#38BDF8]' : 'text-[#86868B]'}>
                        {isMonsoonSimulated ? '+85% Hot Beverage & Ready Meals' : 'Baseline Demand'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#34C759]/10 border border-[#34C759]/25 text-xs text-[#34C759] flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  <span>SLA Breaches Prevented: 99.2% of orders delivered under 10 minutes.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
