import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  Search,
  Store,
  Zap,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Layers,
  Truck
} from 'lucide-react';

const TOUR_STEPS = [
  {
    step: 1,
    title: 'Three Dedicated Operational Lenses',
    subtitle: 'Role-Optimized Control Centers',
    description:
      'Darkstori dynamically reorganizes its telemetry depending on who is at the helm. Switch between Executive (Preserved Capital & Spoilage Alpha), Store GM (In-Store Digital Twin & Rack Slotting), and Fleet Commander (10-Min Swarm Intercept & VRP Dispatch).',
    icon: Compass,
    color: '#FF9F1C',
    highlights: [
      { label: 'Executive Lens', desc: 'ROI alpha & network gross margin defense' },
      { label: 'Store GM Lens', desc: 'Micro-fulfillment digital twin & shelf waves' },
      { label: 'Fleet Commander', desc: 'Swarm intercept radar & EV courier routing' }
    ]
  },
  {
    step: 2,
    title: 'Apple Spotlight Omnibar (⌘K)',
    subtitle: 'Unified Command & Fast Navigation',
    description:
      'Hit ⌘K from any screen to instantly search metros (Bangalore, Mumbai, Delhi-NCR), jump between views, activate pre-emptive monsoon geofence protocols, or export verified CSV audit ledgers.',
    icon: Search,
    color: '#7C3AED',
    highlights: [
      { label: '⌘K Global Hotkey', desc: 'Instant access anywhere in the platform' },
      { label: '5 Tier-1 Metros', desc: 'Bangalore, Mumbai, Delhi, Hyderabad, Pune' },
      { label: 'Automated Actions', desc: 'Trigger drift scans & geofence contractions' }
    ]
  },
  {
    step: 3,
    title: 'In-Store Micro-Fulfillment Digital Twin',
    subtitle: 'Live Rack Topology & Picker Paths',
    description:
      'Eliminate the 200m picker zigzag walk. Visualize real-time rack velocities, cold-chain temperature telemetry, and dynamically reslot high-velocity SKUs (milk, bread, curd) to minimize fulfillment cycle time under 90 seconds.',
    icon: Store,
    color: '#10B981',
    highlights: [
      { label: 'Algorithmic Heatmap', desc: 'Detect aisle bottleneck congestion' },
      { label: 'Cold-Chain Telemetry', desc: 'Real-time dairy & frozen shelf monitoring' },
      { label: 'Dynamic Slotting', desc: 'Instant drag-and-drop layout migration' }
    ]
  },
  {
    step: 4,
    title: 'Autonomous Self-Healing Mesh & VRP',
    subtitle: 'Zero-Waste Transshipments & Rider Dispatch',
    description:
      'When perishable SKUs reach critical shelf-life thresholds, Darkstori computes Sigmoid markdown prices and automatically coordinates inter-hub EV transshipment runners across adjacent hubs before food spoils.',
    icon: Zap,
    color: '#EF4444',
    highlights: [
      { label: 'Sigmoid Salvage', desc: 'Automated time-decay dynamic markdowns' },
      { label: 'Clarke-Wright VRP', desc: 'Sub-10-minute multi-drop courier routing' },
      { label: 'EV Cross-Docking', desc: '1-click inter-hub stock rebalancing' }
    ]
  }
];

export default function ProductTourModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    try {
      const completed = localStorage.getItem('darkstori_tour_completed');
      if (!completed) {
        const timer = setTimeout(() => setIsOpen(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      // LocalStorage access restricted in private mode
    }
  }, []);

  useEffect(() => {
    const handleOpenTour = () => {
      setCurrentStepIndex(0);
      setIsOpen(true);
    };
    window.addEventListener('darkstori:open-tour', handleOpenTour);
    return () => window.removeEventListener('darkstori:open-tour', handleOpenTour);
  }, []);

  const handleSkipOrComplete = () => {
    try {
      localStorage.setItem('darkstori_tour_completed', 'true');
    } catch (e) {
      // Ignore storage errors
    }
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleSkipOrComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const step = TOUR_STEPS[currentStepIndex];
  const IconComponent = step.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={handleSkipOrComplete}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            className="w-full max-w-xl bg-card border border-border/80 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.65)] overflow-hidden ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Step Counter and Skip Tour Button */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-2xl flex items-center justify-center text-black font-bold shadow-md"
                  style={{ backgroundColor: step.color }}
                >
                  <IconComponent size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">Darkstori Onboarding</span>
                    <span
                      className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${step.color}18`,
                        color: step.color,
                        border: `1px solid ${step.color}40`
                      }}
                    >
                      Step {step.step} of {TOUR_STEPS.length}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{step.subtitle}</p>
                </div>
              </div>

              {/* Explicit Skip Tour Button */}
              <button
                onClick={handleSkipOrComplete}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/70 border border-border/50 transition-all cursor-pointer"
                title="Skip onboarding tour"
              >
                <span>Skip Tour</span>
                <X size={14} />
              </button>
            </div>

            {/* Step Body */}
            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">{step.title}</h3>
                <p className="text-sm text-muted-foreground/90 mt-2 leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Highlights Cards */}
              <div className="grid grid-cols-1 gap-2.5 pt-1">
                {step.highlights.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border/40"
                  >
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-semibold text-foreground">{h.label}</span>
                      <p className="text-[11px] text-muted-foreground">{h.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between px-6 py-4 bg-secondary/30 border-t border-border/40">
              {/* Step indicator dots */}
              <div className="flex items-center gap-1.5">
                {TOUR_STEPS.map((s, idx) => (
                  <button
                    key={s.step}
                    onClick={() => setCurrentStepIndex(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === currentStepIndex
                        ? 'w-6 bg-amber-500'
                        : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                    }`}
                    title={`Jump to Step ${s.step}`}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-2">
                {currentStepIndex > 0 && (
                  <button
                    onClick={handlePrev}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/60 transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Back</span>
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <span>{currentStepIndex === TOUR_STEPS.length - 1 ? 'Finish & Enter Ops' : 'Next'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
