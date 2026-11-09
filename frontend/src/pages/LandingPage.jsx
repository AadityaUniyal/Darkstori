import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  ChevronRight,
  BarChart3,
  CheckCircle2,
  Truck,
  Building2,
  Compass,
  Sparkles,
  AlertTriangle,
  Clock,
  TrendingUp,
  Boxes,
  Lock,
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeRole, setRole } = useRole();

  const handleLaunch = (roleId = 'executive') => {
    setRole(roleId);
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="darkstor-landing-page">
      {/* 1. TOP ENTERPRISE NAVIGATION */}
      <header className="darkstor-nav-header">
        <div className="nav-container max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="brand-logo-mark">
              <span className="logo-symbol">◆</span>
            </div>
            <span className="brand-title tracking-tight text-xl font-bold text-white">
              DarkStori
            </span>
            <span className="brand-pill text-xs uppercase tracking-wider px-2.5 py-0.5 rounded-full font-medium">
              Enterprise OS
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
            <a href="#problem" className="hover:text-white transition-colors">The Problem</a>
            <a href="#story" className="hover:text-white transition-colors">The Story</a>
            <a href="#what-we-are" className="hover:text-white transition-colors">What We Are</a>
            <a href="#roles" className="hover:text-white transition-colors">Operational Lenses</a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={() => navigate('/expansion')}
                className="launch-button-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg cursor-pointer text-black"
              >
                <span>Go to Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-white/80 hover:text-white px-3 py-2 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="launch-button-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg cursor-pointer text-black"
                >
                  <span>Provision New Hub</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="darkstor-hero-section relative pt-28 pb-20 overflow-hidden">
        <div className="hero-glow-backdrop" />
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs uppercase tracking-widest text-white/90 font-semibold">
              Introducing DarkStori
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="hero-headline text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight sm:leading-none mb-6"
          >
            Sub-10-Minute Delivery Built on <span className="highlight-text">Mathematical Order</span>, Not Operational Chaos.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="hero-subtext text-lg sm:text-xl text-white/70 max-w-3xl mx-auto font-normal leading-relaxed mb-10"
          >
            Quick-commerce is redefining retail, but negative unit economics, chaotic store floors,
            and blind rider dispatch threaten the entire industry. DarkStori is the unified operating system
            engineering resilience, micro-warehouse speed, and sustainable profitability across your dark store network.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/register"
              className="enter-platform-btn w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-xl text-base font-bold text-black transition-all shadow-2xl cursor-pointer"
            >
              <span>Provision DarkStori Hub</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login?mode=demo"
              className="view-story-btn w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-white/90 hover:text-white border border-white/15 hover:border-amber-400/40 transition-all bg-white/5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Instant Sandbox Demo</span>
            </Link>
          </motion.div>

          {/* Quick Metrics Bar */}
          <div className="hero-metrics-grid mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-white/10 text-left">
            <div className="metric-box p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="metric-num text-2xl font-bold text-amber-400">sub-60s</div>
              <div className="metric-label text-xs text-white/60 uppercase tracking-wider mt-1">Pick-to-Bag Time</div>
            </div>
            <div className="metric-box p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="metric-num text-2xl font-bold text-emerald-400">99.4%</div>
              <div className="metric-label text-xs text-white/60 uppercase tracking-wider mt-1">SLA Adherence Rate</div>
            </div>
            <div className="metric-box p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="metric-num text-2xl font-bold text-purple-400">Zero</div>
              <div className="metric-label text-xs text-white/60 uppercase tracking-wider mt-1">Unplanned Cannibalization</div>
            </div>
            <div className="metric-box p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="metric-num text-2xl font-bold text-sky-400">+4.2%</div>
              <div className="metric-label text-xs text-white/60 uppercase tracking-wider mt-1">EBITDA Margin Delta</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THE PROBLEM SECTION */}
      <section id="problem" className="darkstor-section py-24 bg-white/[0.01] border-t border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <AlertTriangle className="w-3.5 h-3.5" />
              The Quick-Commerce Crisis
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
              Sub-10 Minutes is a Masterclass in Customer Love, and an Operational Nightmare.
            </h2>
            <p className="text-white/60 text-base leading-relaxed">
              Behind the glossy consumer promise lies a fragile web of micro-fulfillment friction.
              Without mathematical precision, quick commerce networks bleed capital at every node.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="problem-card p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-red-500/30 transition-all">
              <div className="problem-icon w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 mb-5 font-bold text-lg">
                01
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Unit Economics Collapse</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                When average order values stay modest while rider delivery payouts and picking wages rise,
                blended profit metrics mask dark stores that lose money on every single package dispatched.
              </p>
            </div>

            <div className="problem-card p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-amber-500/30 transition-all">
              <div className="problem-icon w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-5 font-bold text-lg">
                02
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Chaotic Micro-Floors</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Racking layouts arranged arbitrarily force pickers to walk crisscrossing, serpentine paths.
                Aisles get congested, fresh produce is damaged, and pick-to-bag times blow past 150 seconds.
              </p>
            </div>

            <div className="problem-card p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-purple-500/30 transition-all">
              <div className="problem-icon w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-5 font-bold text-lg">
                03
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Blind Cannibalization</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Opening new dark stores based on simple radius circles or postal codes cannibalizes your own
                profitable stores, splitting order density and duplicating fixed warehouse overheads.
              </p>
            </div>

            <div className="problem-card p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-blue-500/30 transition-all">
              <div className="problem-icon w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-5 font-bold text-lg">
                04
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Unforgiving Shocks</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                A sudden 25mm rainstorm, grid power failure, or festival demand spike collapses delivery times
                to 45 minutes, damages brand reputation, and leaves fleets paralyzed without automated protocols.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THE STORY SECTION */}
      <section id="story" className="darkstor-section py-24 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            The Origin of DarkStori
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-8">
            Built from the Warehouse Floor, Not from an Ivory Tower.
          </h2>

          <div className="story-content text-base sm:text-lg text-white/70 space-y-6 leading-relaxed">
            <p>
              In dense urban corridors across India and Southeast Asia, dark store managers were fighting an impossible daily battle.
              Operating in 2,500-square-foot storefronts converted into micro-warehouses, they managed 3,000 daily orders across 4,000 SKUs,
              relying on walkie-talkies, handwritten packing slips, and intuition to keep up with the timer ticking down from 10 minutes.
            </p>
            <p>
              Meanwhile, corporate executive suites saw conflicting reports. Regional growth dashboards claimed exponential volume,
              yet net margins were evaporating under excessive rider incentives, spoiled milk and perishables, and runaway real estate leases.
            </p>
            <blockquote className="my-8 pl-6 border-l-2 border-amber-400 text-white font-medium text-lg sm:text-xl italic">
              "We realized quick-commerce didn’t need another generic BI dashboard. It needed an intelligent nervous system
              connecting real estate physics, micro-warehouse ergonomics, and rider dispatch into an integrated closed loop."
            </blockquote>
            <p>
              That realization became <strong className="text-white">DarkStori</strong>.
              We engineered a system where spatial gravity models protect against self-cannibalization,
              shelf slotting algorithms guide pickers to sub-45-second bag seals, and automated playbooks
              instantly contract delivery radiuses the second a monsoon downpour begins.
            </p>
          </div>
        </div>
      </section>

      {/* 5. WHAT WE ARE SECTION */}
      <section id="what-we-are" className="darkstor-section py-24 bg-white/[0.01] border-t border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <CheckCircle2 className="w-3.5 h-3.5" />
              What DarkStori Is
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
              The Intelligent Operating System for Quick-Commerce Dark Store Networks.
            </h2>
            <p className="text-white/60 text-base leading-relaxed">
              DarkStori is not a simulation or a prototype. It is the comprehensive operational platform
              powering high-throughput micro-fulfillment across four interconnected pillars.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="feature-pillar-card p-8 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-6">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">1. Spatial Catchment & Site Selection</h3>
                <p className="text-sm text-white/60 leading-relaxed mb-6">
                  Replaces gut-feel store openings with scientific road network topology, Huff gravity catchment models,
                  and automated cannibalization scoring against existing stores and competitors (Zepto, Blinkit, Instamart).
                </p>
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-amber-400 uppercase tracking-wider">
                <span>Feature 01: Expansion Cockpit</span>
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>

            <div className="feature-pillar-card p-8 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">2. Micro-Warehouse Floor Digital Twin</h3>
                <p className="text-sm text-white/60 leading-relaxed mb-6">
                  Configures optimal racking layouts, dynamic aisle heatmaps, and "Golden Zone" shelf allocations
                  that place top-velocity SKUs at eye level adjacent to packing stations to slash picker walking paths.
                </p>
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-purple-400 uppercase tracking-wider">
                <span>Feature 03: Floor Mode & Layout</span>
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>

            <div className="feature-pillar-card p-8 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">3. Autonomous Rider Swarm Dispatch</h3>
                <p className="text-sm text-white/60 leading-relaxed mb-6">
                  Solves dynamic vehicle routing with real-time order batching, pairing dense apartment deliveries
                  to maximize drops per rider while preserving unbreakable 10-minute delivery SLA commitments.
                </p>
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                <span>Feature 04: Rider Swarm & SLA</span>
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>

            <div className="feature-pillar-card p-8 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-6">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">4. Unit Economics & EBITDA Simulator</h3>
                <p className="text-sm text-white/60 leading-relaxed mb-6">
                  Reveals store-by-store Contribution Margin 1, 2, and 3 down to the individual delivery drop,
                  tracking rider payouts, picker seconds, rent overheads, and shrinkage tolerances.
                </p>
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-sky-400 uppercase tracking-wider">
                <span>Feature 07: EBITDA & Unit Economics</span>
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. OPERATIONAL ROLES & WORKFLOWS */}
      <section id="roles" className="darkstor-section py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <Boxes className="w-3.5 h-3.5" />
              Dedicated Operational Lenses
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
              Three Specialized Views. Zero Clutter.
            </h2>
            <p className="text-white/60 text-base leading-relaxed">
              An Executive Strategist does not need picker aisle heatmaps, and a Dark Store General Manager
              does not need city-wide CapEx models. DarkStori adapts its entire navigation, telemetry,
              and color palette to the active role.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Executive Role */}
            <div className="role-lens-card p-8 rounded-2xl bg-gradient-to-b from-[#F59E0B]/5 to-transparent border border-[#F59E0B]/20 flex flex-col justify-between">
              <div>
                <div className="role-badge inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] text-xs font-bold uppercase tracking-wider mb-6">
                  C-Suite & Growth
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Executive Lens</h3>
                <p className="text-xs text-[#F59E0B] font-mono mb-4">Chromatic Accent: Liquid Amber Gold</p>
                <p className="text-sm text-white/60 leading-relaxed mb-6">
                  Designed for Chief Operating Officers, Expansion Heads, and Finance Directors. Focuses on network EBITDA,
                  competitor encroachment, capital expenditure payback, and greenfield site approvals.
                </p>
                <ul className="space-y-2.5 text-xs text-white/70 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#F59E0B]" />
                    <span>Catchment Isochrone Modeling</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#F59E0B]" />
                    <span>Unit Economics Contribution 1/2/3</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#F59E0B]" />
                    <span>Competitor Price Radar & Parity</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => handleLaunch('executive')}
                className="w-full py-3 rounded-xl bg-[#F59E0B] text-black font-bold text-sm hover:brightness-110 transition-all cursor-pointer"
              >
                Launch Executive Lens
              </button>
            </div>

            {/* Store GM Role */}
            <div className="role-lens-card p-8 rounded-2xl bg-gradient-to-b from-[#8B5CF6]/5 to-transparent border border-[#8B5CF6]/20 flex flex-col justify-between">
              <div>
                <div className="role-badge inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] text-xs font-bold uppercase tracking-wider mb-6">
                  Inside The 4 Walls
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Store GM Lens</h3>
                <p className="text-xs text-[#8B5CF6] font-mono mb-4">Chromatic Accent: Electric Amethyst</p>
                <p className="text-sm text-white/60 leading-relaxed mb-6">
                  Designed for Dark Store General Managers and Warehouse Supervisors. Focuses on inside-the-four-walls
                  micro-fulfillment ergonomics, shelf restocking, picker velocity, and vision packing QA.
                </p>
                <ul className="space-y-2.5 text-xs text-white/70 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#8B5CF6]" />
                    <span>Floor Digital Twin & Aisle Heatmaps</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#8B5CF6]" />
                    <span>Dynamic Demand & Stock Predictor</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#8B5CF6]" />
                    <span>Vision Proof-of-Pack Passports</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => handleLaunch('store-gm')}
                className="w-full py-3 rounded-xl bg-[#8B5CF6] text-white font-bold text-sm hover:brightness-110 transition-all cursor-pointer"
              >
                Launch Store GM Lens
              </button>
            </div>

            {/* Fleet Commander Role */}
            <div className="role-lens-card p-8 rounded-2xl bg-gradient-to-b from-[#10B981]/5 to-transparent border border-[#10B981]/20 flex flex-col justify-between">
              <div>
                <div className="role-badge inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] text-xs font-bold uppercase tracking-wider mb-6">
                  Last-Mile Logistics
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Fleet Commander Lens</h3>
                <p className="text-xs text-[#10B981] font-mono mb-4">Chromatic Accent: Hyper Emerald</p>
                <p className="text-sm text-white/60 leading-relaxed mb-6">
                  Designed for Logistics Dispatchers and Fleet Operators. Focuses on 2-wheeler swarm dispatch,
                  dynamic batch clustering, weather disruption mitigation, and preserving sub-10 minute SLAs.
                </p>
                <ul className="space-y-2.5 text-xs text-white/70 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span>Live Order Dispatch Queue & Batching</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span>Automated Monsoon Crisis Playbooks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span>Real-Time SLA Breach Predictor</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => handleLaunch('fleet-commander')}
                className="w-full py-3 rounded-xl bg-[#10B981] text-black font-bold text-sm hover:brightness-110 transition-all cursor-pointer"
              >
                Launch Fleet Commander Lens
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. ENTERPRISE CTA & FOOTER */}
      <footer className="darkstor-footer py-16 border-t border-white/10 bg-black/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-12 border-b border-white/10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="logo-symbol text-amber-400 text-lg">◆</span>
                <span className="text-xl font-bold text-white">DarkStori</span>
              </div>
              <p className="text-sm text-white/50 max-w-md">
                The Enterprise Operating System for Autonomous Quick-Commerce Networks.
                Engineering mathematical precision and profitability across Indian and global metros.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleLaunch('executive')}
                className="px-6 py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 transition-all cursor-pointer"
              >
                Open DarkStori Console
              </button>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-white/40 gap-4">
            <p>© 2026 DarkStori Systems, Inc. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span>Zero-Leak Enterprise Security</span>
              <span>Neon PostgreSQL Backed</span>
              <span>Vercel / Railway Ready</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
