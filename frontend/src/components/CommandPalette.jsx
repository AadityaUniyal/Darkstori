import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Compass,
  LayoutDashboard,
  BarChart2,
  TrendingUp,
  MapPin,
  FlaskConical,
  Cpu,
  Sparkles,
  Leaf,
  Calendar,
  Workflow,
  Download,
  Activity,
  Zap,
  Map,
  X,
  ArrowRight,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useRole } from '../context/RoleContext';
import { toast } from 'sonner';
import { api } from '../services/api';

const CATEGORIES = ['All', 'Navigation', 'Operational Lens', 'Switch City', 'Action'];

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { currentCity, setCity } = useCity();
  const { setRole } = useRole();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
      setQuery('');
      setSelectedCategory('All');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const items = [
    // Operational Lens Roles
    {
      id: 'role-exec',
      type: 'Operational Lens',
      icon: Compass,
      title: 'Switch Lens: Executive (C-Suite)',
      subtitle: 'Focus on Capital ROI, Network Health, and Avoided Spoilage Alpha',
      badge: 'C-Suite',
      action: () => {
        setRole('executive');
        navigate('/dashboard');
        toast.success('Operational Lens switched to Executive');
      }
    },
    {
      id: 'role-gm',
      type: 'Operational Lens',
      icon: LayoutDashboard,
      title: 'Switch Lens: Store GM (Operations)',
      subtitle: 'Focus on Dark Store Floorplan, Bottlenecks, and Shelf Waves',
      badge: 'Store GM',
      action: () => {
        setRole('store-gm');
        navigate('/dashboard');
        toast.success('Operational Lens switched to Store GM');
      }
    },
    {
      id: 'role-fleet',
      type: 'Operational Lens',
      icon: Zap,
      title: 'Switch Lens: Fleet Commander (Logistics)',
      subtitle: 'Focus on Swarm Intercept Radar, VRP Dispatch, and Couriers',
      badge: 'Fleet Ops',
      action: () => {
        setRole('fleet-commander');
        navigate('/dashboard');
        toast.success('Operational Lens switched to Fleet Commander');
      }
    },

    // Navigation
    { id: 'nav-exp', type: 'Navigation', icon: Compass, title: 'Expansion Cockpit', subtitle: 'Greenfield location finder & cannibalization simulation', action: () => navigate('/') },
    { id: 'nav-dash', type: 'Navigation', icon: LayoutDashboard, title: 'Operations Dashboard', subtitle: 'Live telemetry, rider SLA, and store capacity', action: () => navigate('/dashboard') },
    { id: 'nav-an', type: 'Navigation', icon: BarChart2, title: 'Advanced Analytics', subtitle: 'Competitive moves, market share, and sentiment metrics', action: () => navigate('/analytics') },
    { id: 'nav-fc', type: 'Navigation', icon: TrendingUp, title: 'Demand Forecast', subtitle: 'XGBoost multi-horizon time-series forecasting', action: () => navigate('/forecast') },
    { id: 'nav-nb', type: 'Navigation', icon: MapPin, title: 'Neighborhood DNA Explorer', subtitle: 'Demographic clusters, income, and store saturation', action: () => navigate('/neighborhoods') },
    { id: 'nav-sim', type: 'Navigation', icon: FlaskConical, title: 'Dark Store Simulator', subtitle: 'ROI calculator, Capex/Opex modeling, and layout planner', action: () => navigate('/simulator') },
    { id: 'nav-alg', type: 'Navigation', icon: Cpu, title: 'Algorithm Lab', subtitle: 'Model retraining, KS-drift telemetry, and weights', action: () => navigate('/algorithm-lab') },
    { id: 'nav-rec', type: 'Navigation', icon: Sparkles, title: 'Recommendations Engine', subtitle: 'Prescriptive space allocation and category mix', action: () => navigate('/recommendations') },
    { id: 'nav-res', type: 'Navigation', icon: Leaf, title: 'Zero-Waste Resilience', subtitle: 'Sigmoid salvage decay & QR crate photo verification', action: () => navigate('/resilience') },
    { id: 'nav-ev', type: 'Navigation', icon: Calendar, title: 'Local Events & Demand Surges', subtitle: 'Festivals, IPL matches, and weather event modifiers', action: () => navigate('/events') },
    { id: 'nav-pb', type: 'Navigation', icon: Workflow, title: 'Automated Playbooks', subtitle: 'Trigger-condition-action workflow automation engine', action: () => navigate('/playbooks') },

    // City Quick Switch
    { id: 'city-blr', type: 'Switch City', icon: Map, title: 'Switch to Bengaluru', subtitle: 'Active Tier 1 Hub · 24 Pincodes', action: () => { setCity('Bangalore'); toast.success('Switched to Bengaluru'); } },
    { id: 'city-del', type: 'Switch City', icon: Map, title: 'Switch to Delhi NCR', subtitle: 'Active Tier 1 Hub · 32 Pincodes', action: () => { setCity('Delhi'); toast.success('Switched to Delhi NCR'); } },
    { id: 'city-mum', type: 'Switch City', icon: Map, title: 'Switch to Mumbai', subtitle: 'Active Tier 1 Hub · 28 Pincodes', action: () => { setCity('Mumbai'); toast.success('Switched to Mumbai'); } },
    { id: 'city-hyd', type: 'Switch City', icon: Map, title: 'Switch to Hyderabad', subtitle: 'Active Tier 1 Hub · 18 Pincodes', action: () => { setCity('Hyderabad'); toast.success('Switched to Hyderabad'); } },
    { id: 'city-pune', type: 'Switch City', icon: Map, title: 'Switch to Pune', subtitle: 'Active Tier 2 Hub · 14 Pincodes', action: () => { setCity('Pune'); toast.success('Switched to Pune'); } },

    // Quick Actions
    {
      id: 'act-tour',
      type: 'Action',
      icon: Sparkles,
      title: 'Start Product Tour',
      subtitle: 'Walk through dark store operational lenses, digital twin, and VRP dispatch',
      action: () => {
        window.dispatchEvent(new CustomEvent('darkstori:open-tour'));
      }
    },
    {
      id: 'act-export',
      type: 'Action',
      icon: Download,
      title: 'Export Intelligence CSV',
      subtitle: 'Download complete demographic & competitor CSV dataset',
      action: async () => {
        try {
          toast.info('Generating CSV report...');
          await api.exportNeighborhoodsCSV(currentCity);
          toast.success('CSV Export downloaded successfully');
        } catch (e) {
          toast.error('Failed to export CSV');
        }
      }
    },
    {
      id: 'act-drift',
      type: 'Action',
      icon: Activity,
      title: 'Trigger Model Drift Check',
      subtitle: 'Scan feature distributions for Kolmogorov-Smirnov drift',
      action: async () => {
        try {
          toast.info('Scanning model drift...');
          const res = await api.checkDriftAndRetrain();
          toast.success(`Scan complete: ${res.drift_status || 'No critical drift detected'}`);
        } catch (e) {
          toast.error('Drift scan request failed');
        }
      }
    },
    {
      id: 'act-monsoon',
      type: 'Action',
      icon: Zap,
      title: 'Activate Pre-Emptive Monsoon Geofence Protocol',
      subtitle: 'Contract geofence radius to 1.6km and apply 1.4x rider surge payout',
      action: () => {
        toast.success('Pre-emptive Monsoon Protocol activated: Geofences contracted');
        navigate('/dashboard');
      }
    },
    {
      id: 'act-rebalance',
      type: 'Action',
      icon: ArrowRight,
      title: 'Trigger Inter-Hub Micro-Transfer Cross-Docking',
      subtitle: 'Rebalance surplus milk and dairy SKUs across adjacent hubs (<= 3.5km)',
      action: () => {
        toast.success('Inter-hub runner dispatched: 50 units Amul Milk transferred');
        navigate('/resilience');
      }
    },
    {
      id: 'act-decay',
      type: 'Action',
      icon: Zap,
      title: 'Simulate 12h Shelf Life Decay',
      subtitle: 'Run Sigmoid price markdown on perishable SKUs',
      action: async () => {
        try {
          toast.info('Simulating decay curve...');
          await api.simulateDecay(12, currentCity);
          toast.success('12h Decay simulation calculated');
          navigate('/resilience');
        } catch (e) {
          navigate('/resilience');
        }
      }
    }
  ];

  const filtered = items.filter(item => {
    const matchesCat = selectedCategory === 'All' || item.type === selectedCategory;
    if (!matchesCat) return false;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4 bg-black/65 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="w-full max-w-2xl bg-card/95 border border-border/80 rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.55)] overflow-hidden backdrop-blur-2xl ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            {/* Apple Spotlight Search Input Bar */}
            <div className="flex items-center px-4 py-3.5 border-b border-border/60 gap-3 bg-secondary/20">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <Search size={16} />
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search corridors, actions, metrics, or metros (e.g. 'forecast', 'mumbai', 'decay')..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                className="flex-1 bg-transparent border-none text-foreground placeholder:text-muted-foreground/60 text-sm md:text-base focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
              )}
              <kbd className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border/60">
                ESC
              </kbd>
            </div>

            {/* Category Segment Tabs */}
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/40 bg-secondary/10 overflow-x-auto no-scrollbar text-xs">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); setSelectedIndex(0); }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Results List */}
            <div ref={listRef} className="max-h-96 overflow-y-auto p-2 space-y-1">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <p>No matching commands or corridors found.</p>
                  <span className="text-xs text-muted-foreground/60">Try searching for "forecast", "transshipment", or "mumbai"</span>
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => { item.action(); onClose(); }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-amber-500/10 border border-amber-500/30 text-foreground shadow-sm' 
                          : 'hover:bg-accent/40 text-foreground/80 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl transition-colors ${
                          isSelected 
                            ? 'bg-amber-500 text-black' 
                            : 'bg-secondary/80 text-secondary-foreground'
                        }`}>
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{item.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/80 text-muted-foreground font-mono">
                              {item.type}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-1.5 text-amber-500 shrink-0 ml-2">
                          <kbd className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">↵</kbd>
                          <ArrowRight size={14} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Apple Status Footer */}
            <div className="px-4 py-2.5 bg-secondary/40 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-card border text-[10px]">↑↓</kbd>
                  <span className="hidden sm:inline">Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-card border text-[10px]">↵</kbd>
                  <span className="hidden sm:inline">Select</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-card border text-[10px]">ESC</kbd>
                  <span className="hidden sm:inline">Close</span>
                </span>
              </div>
              <span className="text-[11px] font-medium text-amber-500 font-mono">Darkstori Spotlight</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
