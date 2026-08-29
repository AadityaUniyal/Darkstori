import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ArrowRight
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { toast } from 'sonner';
import { api } from '../services/api';

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { currentCity, setCity, cities } = useCity();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const items = [
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border/60 gap-3">
          <Search size={18} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, page, city, or action (e.g. 'forecast', 'mumbai', 'export')..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            className="flex-1 bg-transparent border-none text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none"
          />
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-96 overflow-y-auto p-2 divide-y divide-border/20">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No matching commands or pages found.
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
                      ? 'bg-primary/10 border border-primary/20 text-foreground' 
                      : 'hover:bg-accent/50 text-foreground/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{item.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/80 text-muted-foreground font-mono">
                          {item.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <ArrowRight size={14} className="text-primary shrink-0 ml-2" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-secondary/40 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 rounded bg-card border text-[10px]">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-card border text-[10px]">↵</kbd> Select</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-card border text-[10px]">ESC</kbd> Close</span>
          </div>
          <span className="text-[11px] font-medium text-primary">Darkstori Omnibar</span>
        </div>
      </div>
    </div>
  );
}
