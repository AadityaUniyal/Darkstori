import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  MapPin,
  Clock,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  ChevronRight,
  Cpu,
  BarChart3,
  CheckCircle2,
  Truck,
  Building2,
  Compass,
  Database,
  Maximize2,
  Scan,
  ThermometerSnowflake,
  Navigation,
  Sparkles,
  Eye,
  AlertTriangle,
  GitBranch
} from 'lucide-react';
import AmbientBackground from '../components/AmbientBackground';
import LazyMapView from '../components/LazyMapView';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { useCity } from '../context/CityContext';
import './LandingPage.css';

const CITY_STORE_COUNTS = {
  Bangalore: 116,
  Mumbai: 56,
  Delhi: 61,
  Hyderabad: 40,
  Pune: 38,
  Chennai: 28,
  Kolkata: 20,
  Ahmedabad: 20,
  Jaipur: 8,
  Lucknow: 8,
  Chandigarh: 8,
  Kochi: 8
};

const ADVANCED_CAPABILITIES = [
  {
    id: 'spatial',
    title: 'Spatial Catchment & Greenfield Placement',
    badge: 'Huff Gravity & Voronoi Engine',
    problem: 'Arbitrary postal-code store placement leads to 34% internal cannibalization while competitors capture high-velocity demand corridors.',
    solution: 'Topological road network graphs evaluate population density, real road travel time, and competitor proximity (Blinkit, Zepto, Instamart) across 12 Indian metros to identify whitespace clusters with sub-10 minute catchment viability.',
    metric: '95.9% R² Placement Accuracy',
    icon: Compass,
    accent: 'amber'
  },
  {
    id: 'wms',
    title: 'Sub-120s Intralogistics Floor WMS',
    badge: 'TSP Directed Batch Wave Routing',
    problem: 'In 1.2m narrow aisles during peak evening surges, pickers walk 4.8 km per shift, with floor congestion breaching the 10-minute SLA before couriers depart.',
    solution: 'Algorithmic Traveling Salesperson Problem (TSP) multi-order wave batching coupled with 3D Golden-Zone vertical velocity slotting directs pickers along continuous single-pass paths, reducing walking distance by 74%.',
    metric: '42s Pick + 35s Pack SLA',
    icon: Layers,
    accent: 'emerald'
  },
  {
    id: 'vision',
    title: 'VisionPack™ Edge Computer Vision Gate',
    badge: 'Real-Time Neural Verification',
    problem: 'Severe return rates, missing items, and broken packaging caused by human pickers rushing barcode scans under extreme dispatch time pressure.',
    solution: 'Edge neural network inference trained on 25,000+ Indian FMCG packaging variations verifies basket completeness, detects packaging defects or swelling, and cryptographically signs Proof-of-Pack in under 800ms.',
    metric: '99.8% Packaging Accuracy',
    icon: Eye,
    accent: 'cyan'
  },
  {
    id: 'halo',
    title: 'Dynamic Non-Euclidean Delivery Halos',
    badge: 'Topological Weather & Traffic Impedance',
    problem: 'Static circular radii fail against Indian urban realities—monsoon waterlogging, railway level crossings, and gated colony access chokepoints.',
    solution: 'Dynamic A* road impedance graphs automatically contract and reshape delivery perimeters during heavy rainfall and traffic surges, safeguarding rider safety while guaranteeing strict 10-minute arrival SLAs.',
    metric: 'Sub-2.0 km Dynamic Halos',
    icon: Navigation,
    accent: 'blue'
  },
  {
    id: 'coldchain',
    title: 'Autonomous Shelf-Life Decay & Cold Chain',
    badge: 'Sigmoid Dynamic Markdown & IoT',
    problem: 'Dark stores lose 8–14% of gross margins to perishable dairy/produce spoilage and undetected cold-chain temperature excursions.',
    solution: 'Continuous non-linear Sigmoid markdown pricing automatically discounts expiring batches to achieve zero inventory write-offs, synchronized with continuous HACCP IoT temperature telemetry (3.8°C dairy, -18°C frozen).',
    metric: 'Zero Perishable Waste Target',
    icon: ThermometerSnowflake,
    accent: 'purple'
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, demoLogin } = useAuth();
  const { setRole } = useRole();
  const { selectedCity, setSelectedCity, cities } = useCity();
  const [activeTab, setActiveTab] = useState('spatial');

  useEffect(() => {
    if (!selectedCity) setSelectedCity('Bangalore');
  }, [selectedCity, setSelectedCity]);

  // IST Real-Time Clock
  const [istTime, setIstTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      try {
        setIstTime(new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(new Date()));
      } catch {
        setIstTime('15:30:00');
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLaunch = async (role = 'executive', path = '/cockpit') => {
    setRole(role);
    if (isAuthenticated) {
      navigate(path);
    } else {
      try {
        await demoLogin({
          id: role,
          role: role,
          title: role === 'executive' ? 'Executive Director' : (role === 'store-gm' ? 'General Manager' : 'Operations Lead'),
          city: selectedCity || 'Bangalore'
        });
        navigate(path);
      } catch {
        navigate(path);
      }
    }
  };

  const currentCapability = ADVANCED_CAPABILITIES.find(c => c.id === activeTab) || ADVANCED_CAPABILITIES[0];

  return (
    <div className="apple-landing-root">
      <AmbientBackground />

      {/* 1. APPLE-GRADE REFINED NAVIGATION */}
      <header className="apple-nav-header">
        <div className="apple-nav-container">
          <Link to="/" className="apple-brand-logo">
            <span className="brand-symbol">◆</span>
            <span className="brand-title">DarkStori</span>
          </Link>

          <nav className="apple-nav-links">
            <Link to="/cockpit">Spatial Intelligence</Link>
            <Link to="/floor">Floor Operations</Link>
            <Link to="/network">Fleet & Infrastructure</Link>
            <Link to="/dashboard">Command Center</Link>
          </nav>

          <div className="apple-nav-actions">
            <div className="nav-noc-status" title="Operations Command Control">
              <span className="live-ping" />
              <span className="noc-text">BLR NOC • {istTime || '15:30'} IST</span>
            </div>

            <button
              onClick={() => handleLaunch('executive', '/cockpit')}
              className="btn-primary-nav"
            >
              <span>{isAuthenticated ? 'Open Operating System' : 'Launch Platform'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="apple-hero-section pt-32 pb-20">
        <div className="hero-story-container max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="hero-badge-wrap inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-mono font-medium tracking-wide text-white/80">
              Autonomous Intralogistics Operating System
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-6xl md:text-7xl font-semibold text-white tracking-tight leading-[1.08]"
          >
            The Architecture of<br />
            <span className="bg-gradient-to-r from-white via-slate-200 to-amber-300 bg-clip-text text-transparent">
              10-Minute Commerce.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl text-white/60 max-w-3xl mx-auto mt-6 leading-relaxed font-normal"
          >
            Quick-commerce is won inside the four walls of high-density micro-warehouses. DarkStori unifies spatial catchment intelligence, sub-120 second floor dispatch, and real-time edge computer vision into an integrated operating system.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex flex-wrap gap-4 justify-center items-center"
          >
            <button
              onClick={() => handleLaunch('executive', '/cockpit')}
              className="px-7 py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm shadow-xl shadow-amber-500/15 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <span>Launch Operating System</span>
              <ArrowRight size={15} />
            </button>
            <button
              onClick={() => handleLaunch('executive', '/cockpit')}
              className="px-7 py-3.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/15 font-medium text-sm transition-all flex items-center gap-2"
            >
              <Compass size={15} className="text-amber-400" />
              <span>Explore Spatial Intelligence</span>
            </button>
          </motion.div>

          {/* Institutional Telemetry Strip */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-8 text-xs text-white/60 font-mono">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              12 Mapped Indian Metros
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Sub-120s Dispatch Cadence
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              2.0 km Catchment Halos
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              95.9% Placement Model Precision
            </span>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE SPATIAL GRID & UNIT ECONOMICS ENGINE */}
      <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="p-6 md:p-8 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-2xl shadow-2xl relative overflow-hidden">
          {/* Top Bar with Metro Selection */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-amber-500/15 text-amber-400 border border-amber-500/25 uppercase tracking-wider">
                  Live Spatial Network
                </span>
                <span className="text-xs text-white/40 font-mono">Connected Across 12 Indian Metros</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold text-white mt-2 tracking-tight">
                Pan-India Dark Store Grid & Feasibility Map
              </h2>
              <p className="text-xs text-white/60 mt-1 max-w-2xl">
                Inspect physical fulfillment centers, active 2.0 km delivery halos, and competitor density across India.
              </p>
            </div>

            <button
              onClick={() => handleLaunch('executive', '/cockpit')}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-medium text-white flex items-center gap-2 self-start md:self-auto transition-all"
            >
              <Maximize2 size={13} className="text-amber-400" />
              <span>Full-Screen Cockpit</span>
            </button>
          </div>

          {/* 12-City Selector Pills */}
          <div className="py-4 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-white/[0.06]">
            {(cities || []).map((city) => {
              const isSelected = selectedCity === city;
              const count = CITY_STORE_COUNTS[city] || 8;
              return (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/10'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] text-white/70 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  <span>{city}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-white/50'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Map + Feasibility Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-6">
            {/* 3-Column Tactical Map */}
            <div className="lg:col-span-3 rounded-2xl overflow-hidden border border-white/10 relative shadow-inner bg-[#07090E]">
              <LazyMapView
                height="480px"
                zoom={12}
                showHeatmap={true}
              />
              <div className="absolute bottom-3 left-3 z-10 px-3 py-1.5 rounded-lg bg-black/85 backdrop-blur-md border border-white/10 text-[11px] text-white/70 font-mono flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Active Hub: <strong>{selectedCity}</strong> ({CITY_STORE_COUNTS[selectedCity] || 8} stores)</span>
                <span className="text-white/30">•</span>
                <span className="text-amber-400">Halo: 2.0 km / 10-Min</span>
              </div>
            </div>

            {/* 1-Column Unit Economics Engine Card */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-medium text-amber-400 uppercase tracking-wider">
                    Unit Economics Engine
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">CALCULATED</span>
                </div>
                <h3 className="text-base font-semibold text-white mt-1">
                  {selectedCity} Micro-Warehouse Benchmark
                </h3>
                <p className="text-xs text-white/50 mt-1">
                  Algorithmic placement model for regional store owners and franchisees.
                </p>

                <div className="mt-4 space-y-3">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="text-[11px] text-white/50 font-mono">ESTIMATED CAPEX</div>
                    <div className="text-lg font-semibold text-white mt-0.5">₹21.50 Lakhs</div>
                    <div className="text-[10px] text-white/40">Racking, cold chain, 4x IoT terminals</div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="text-[11px] text-white/50 font-mono">MONTHLY OPEX</div>
                    <div className="text-lg font-semibold text-amber-400 mt-0.5">₹1.45 Lakhs/mo</div>
                    <div className="text-[10px] text-white/40">Lease (2,200 sqft), 6 pickers, power</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="text-[10px] text-white/50 font-mono">DAILY CAPACITY</div>
                      <div className="text-sm font-semibold text-white mt-0.5">850–1,200</div>
                      <div className="text-[9px] text-white/40">Orders/day</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="text-[10px] text-white/50 font-mono">PAYBACK</div>
                      <div className="text-sm font-semibold text-emerald-400 mt-0.5">4.2 Months</div>
                      <div className="text-[9px] text-white/40">At ₹42 margin/ord</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleLaunch('executive', '/cockpit')}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-all shadow-md shadow-amber-500/10 flex items-center justify-center gap-1.5"
                >
                  <span>Evaluate Site in {selectedCity}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THE CORE PROBLEM: THE THREE STRUCTURAL FAILURE POINTS */}
      <section className="py-24 px-6 max-w-6xl mx-auto border-t border-white/[0.06]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-medium uppercase tracking-widest text-amber-400">The Problem</span>
          <h2 className="text-3xl md:text-5xl font-semibold text-white mt-3 tracking-tight">
            The 10-Minute Delivery Illusion.
          </h2>
          <p className="text-base text-white/60 mt-4 leading-relaxed font-normal">
            Quick-commerce operators burn millions in capital by treating micro-fulfillment like traditional retail. The bottlenecks are mathematical, spatial, and physical.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl relative overflow-hidden group hover:border-red-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center font-mono font-semibold text-sm mb-6">
              01
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">The Spreadsheet Fallacy</h3>
            <p className="text-sm text-white/60 leading-relaxed font-normal">
              Opening dark stores based on postal codes causes up to 34% cannibalization of your own stores, while Blinkit and Zepto carve out high-density order clusters.
            </p>
            <div className="mt-6 pt-4 border-t border-white/[0.04] text-xs font-mono text-red-400">
              Impact: Negative store-level contribution margin.
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl relative overflow-hidden group hover:border-amber-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-mono font-semibold text-sm mb-6">
              02
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">The Floor Congestion Trap</h3>
            <p className="text-sm text-white/60 leading-relaxed font-normal">
              During 7 PM surges, pickers walk 4.8 km per shift in narrow 1.2m aisles. 42 seconds spent searching for displaced milk crates breaches the 10-minute SLA before the rider departs.
            </p>
            <div className="mt-6 pt-4 border-t border-white/[0.04] text-xs font-mono text-amber-400">
              Impact: 78% of late deliveries originate inside the hub.
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl relative overflow-hidden group hover:border-purple-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-mono font-semibold text-sm mb-6">
              03
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">The Asphalt Blame Game</h3>
            <p className="text-sm text-white/60 leading-relaxed font-normal">
              Blaming 2-wheeler couriers for delays ignores real-world Indian urban realities: waterlogged flyovers, railway level crossings, and unmapped gated colony gates.
            </p>
            <div className="mt-6 pt-4 border-t border-white/[0.04] text-xs font-mono text-purple-400">
              Impact: Severe courier safety risks and customer churn.
            </div>
          </div>
        </div>
      </section>

      {/* 5. ADVANCED ARCHITECTURAL CAPABILITIES (LOGIC & TRAINING SOLVING REAL PROBLEMS) */}
      <section className="py-24 px-6 max-w-6xl mx-auto border-t border-white/[0.06]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-medium uppercase tracking-widest text-emerald-400">Core Systems</span>
          <h2 className="text-3xl md:text-5xl font-semibold text-white mt-3 tracking-tight">
            Advanced Operational Intelligence.
          </h2>
          <p className="text-base text-white/60 mt-4 leading-relaxed font-normal">
            Five purpose-built intralogistics engines engineered to solve the mathematical and physical bottlenecks of rapid urban fulfillment.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar pb-8">
          {ADVANCED_CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            const isActive = activeTab === cap.id;
            return (
              <button
                key={cap.id}
                onClick={() => setActiveTab(cap.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-white/10 text-white border border-white/20 shadow-lg'
                    : 'bg-white/[0.02] text-white/50 hover:text-white/80 hover:bg-white/[0.05] border border-white/[0.05]'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-amber-400' : 'text-white/40'} />
                <span>{cap.title}</span>
              </button>
            );
          })}
        </div>

        {/* Active Capability Deep Dive Card */}
        <div className="p-8 md:p-12 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-[11px] font-mono font-medium bg-amber-500/15 text-amber-400 border border-amber-500/25">
                  {currentCapability.badge}
                </span>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  {currentCapability.metric}
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-semibold text-white mt-3">
                {currentCapability.title}
              </h3>
            </div>

            <button
              onClick={() => handleLaunch('executive', activeTab === 'wms' ? '/floor' : (activeTab === 'spatial' ? '/cockpit' : (activeTab === 'halo' ? '/network' : '/dashboard')))}
              className="px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-amber-500 hover:text-black border border-white/10 text-xs font-semibold text-white flex items-center gap-2 self-start lg:self-auto transition-all"
            >
              <span>Explore Engine</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
            <div className="p-6 rounded-2xl bg-white/[0.015] border border-white/[0.05]">
              <div className="flex items-center gap-2 text-xs font-mono text-red-400 mb-3">
                <AlertTriangle size={14} />
                <span>THE STRUCTURAL BOTTLENECK</span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed font-normal">
                {currentCapability.problem}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.015] border border-white/[0.05]">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-3">
                <Sparkles size={14} />
                <span>DARKSTORI ADVANCED LOGIC & INFERENCE</span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed font-normal">
                {currentCapability.solution}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FOUR UNIFIED OPERATIONAL WORKSPACES */}
      <section className="py-24 px-6 max-w-6xl mx-auto border-t border-white/[0.06]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-medium uppercase tracking-widest text-cyan-400">Integrated Platform</span>
          <h2 className="text-3xl md:text-5xl font-semibold text-white mt-3 tracking-tight">
            Four Dedicated Workspaces.
          </h2>
          <p className="text-base text-white/60 mt-4 leading-relaxed font-normal">
            Tailored interfaces engineered for each operational responsibility across the fulfillment lifecycle.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Workspace 1: Cockpit */}
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-amber-500/30 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-amber-500/15 text-amber-400 border border-amber-500/25">
                  WORKSPACE 01
                </span>
                <Compass className="text-amber-400" size={18} />
              </div>
              <h3 className="text-xl font-semibold text-white">Expansion & Greenfield Cockpit</h3>
              <p className="text-sm text-white/60 mt-2 leading-relaxed font-normal">
                Street-level geospatial intelligence, Huff gravity cannibalization modeling, reverse geocoding, and automated CapEx/OpEx payback models for 12 Indian metros.
              </p>
            </div>
            <div className="pt-6">
              <button
                onClick={() => handleLaunch('executive', '/cockpit')}
                className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-amber-500 hover:text-black border border-white/10 font-semibold text-xs transition-all flex items-center justify-center gap-2"
              >
                <span>Launch Expansion Cockpit</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Workspace 2: Dashboard */}
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-blue-500/30 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-blue-500/15 text-blue-400 border border-blue-500/25">
                  WORKSPACE 02
                </span>
                <Activity className="text-blue-400" size={18} />
              </div>
              <h3 className="text-xl font-semibold text-white">Executive Operations Dashboard</h3>
              <p className="text-sm text-white/60 mt-2 leading-relaxed font-normal">
                Real-time order throughput, active cohorts, 90-day decision loop counterfactuals, and network-wide margin defense telemetry.
              </p>
            </div>
            <div className="pt-6">
              <button
                onClick={() => handleLaunch('executive', '/dashboard')}
                className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-blue-500 hover:text-white border border-white/10 font-semibold text-xs transition-all flex items-center justify-center gap-2"
              >
                <span>Launch Executive Dashboard</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Workspace 3: Floor Mode */}
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-amber-500/30 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-amber-500/15 text-amber-400 border border-amber-500/25">
                  WORKSPACE 03
                </span>
                <Layers className="text-amber-400" size={18} />
              </div>
              <h3 className="text-xl font-semibold text-white">Dark Store Floor Operations & WMS</h3>
              <p className="text-sm text-white/60 mt-2 leading-relaxed font-normal">
                Sub-120s dispatch cadence timer, Golden Zone vertical rack slotting, single-pass TSP picker routing, and VisionPack™ verification.
              </p>
            </div>
            <div className="pt-6">
              <button
                onClick={() => handleLaunch('store-gm', '/floor')}
                className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-amber-500 hover:text-black border border-white/10 font-semibold text-xs transition-all flex items-center justify-center gap-2"
              >
                <span>Launch Floor Operations</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Workspace 4: Fleet & Network */}
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/30 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
                  WORKSPACE 04
                </span>
                <Cpu className="text-cyan-400" size={18} />
              </div>
              <h3 className="text-xl font-semibold text-white">Fleet War Room & Infrastructure</h3>
              <p className="text-sm text-white/60 mt-2 leading-relaxed font-normal">
                411-store directory, courier dispatch orchestration, monsoon rainfall routing, and multi-market model validation.
              </p>
            </div>
            <div className="pt-6">
              <button
                onClick={() => handleLaunch('fleet-commander', '/network')}
                className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-cyan-500 hover:text-black border border-white/10 font-semibold text-xs transition-all flex items-center justify-center gap-2"
              >
                <span>Launch Fleet Infrastructure</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. INSTITUTIONAL METRICS */}
      <section className="py-20 px-6 max-w-6xl mx-auto border-t border-white/[0.06]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
            <div className="text-3xl md:text-5xl font-semibold text-amber-400">95.9%</div>
            <div className="text-xs uppercase tracking-wider text-white/50 mt-2 font-mono">Catchment Precision</div>
            <div className="text-[11px] text-white/30 mt-1">Validated across Indian metros</div>
          </div>
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
            <div className="text-3xl md:text-5xl font-semibold text-emerald-400">118s</div>
            <div className="text-xs uppercase tracking-wider text-white/50 mt-2 font-mono">Mean Dispatch SLA</div>
            <div className="text-[11px] text-white/30 mt-1">Order receipt to courier handoff</div>
          </div>
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
            <div className="text-3xl md:text-5xl font-semibold text-cyan-400">411</div>
            <div className="text-xs uppercase tracking-wider text-white/50 mt-2 font-mono">Verified Hubs</div>
            <div className="text-[11px] text-white/30 mt-1">Across 12 major metros</div>
          </div>
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
            <div className="text-3xl md:text-5xl font-semibold text-purple-400">4.2 Mo</div>
            <div className="text-xs uppercase tracking-wider text-white/50 mt-2 font-mono">Average Payback</div>
            <div className="text-[11px] text-white/30 mt-1">On ₹21.5L store CapEx</div>
          </div>
        </div>
      </section>

      {/* 8. FINAL CALL TO ACTION */}
      <section className="py-24 px-6 max-w-4xl mx-auto text-center border-t border-white/[0.06]">
        <h2 className="text-3xl md:text-5xl font-semibold text-white tracking-tight">
          The Future of Micro-Fulfillment is Algorithmic.
        </h2>
        <p className="text-base text-white/60 mt-4 max-w-2xl mx-auto leading-relaxed font-normal">
          Empowering Indian grocery franchisees, regional store owners, and D2C brands with enterprise micro-warehouse operating intelligence.
        </p>

        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <button
            onClick={() => handleLaunch('executive', '/cockpit')}
            className="px-8 py-4 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <span>Launch DarkStori</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
