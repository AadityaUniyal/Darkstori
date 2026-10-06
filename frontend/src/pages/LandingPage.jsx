import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  ChevronRight,
  Cpu,
  BarChart2,
  DollarSign,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Truck,
  Leaf,
  Navigation,
  Globe2,
  Lock,
  ChevronDown
} from 'lucide-react';
import KineticScrambleHeadline from '../components/KineticScrambleHeadline';
import AmbientBackground from '../components/AmbientBackground';
import InteractiveProductDemo from '../components/InteractiveProductDemo';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

const FOCUS_METROS = [
  { id: 'bangalore', name: 'Bangalore', hubs: 48, status: 'Active', latency: '42ms', greenfields: 'HSR, Indiranagar, Whitefield' },
  { id: 'mumbai', name: 'Mumbai', hubs: 62, status: 'Active', latency: '38ms', greenfields: 'Bandra West, Powai, Andheri East' },
  { id: 'delhi', name: 'Delhi-NCR', hubs: 54, status: 'Active', latency: '45ms', greenfields: 'Gurugram Sec-43, Noida Sec-62, Saket' },
  { id: 'hyderabad', name: 'Hyderabad', hubs: 36, status: 'Active', latency: '50ms', greenfields: 'Hitec City, Gachibowli, Jubilee Hills' },
  { id: 'pune', name: 'Pune', hubs: 28, status: 'Active', latency: '48ms', greenfields: 'Koregaon Park, Baner, Viman Nagar' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Interactive Live Calculator State
  const [selectedCity, setSelectedCity] = useState('bangalore');
  const [storeSqft, setStoreSqft] = useState(1800);
  const [perishableHours, setPerishableHours] = useState(14);
  const [activeSimTab, setActiveSimTab] = useState('expansion');
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  // Dynamic calculations for live sandbox widget
  const calculatedDailyOrders = Math.round(storeSqft * 0.48 + (selectedCity === 'mumbai' ? 120 : selectedCity === 'bangalore' ? 95 : 70));
  const calculatedMonthlyRev = Math.round((calculatedDailyOrders * 385 * 30) / 100000); // In Lakhs INR
  const estimatedBreakeven = Math.max(5, Math.round(22 - (storeSqft / 200)));
  const calculatedOpportunityScore = Math.min(98, Math.round(72 + (storeSqft / 300) + (selectedCity === 'bangalore' ? 12 : 8)));

  // Sigmoid Decay Calculation
  const sigmoidDecay = (hours) => {
    const k = 0.35;
    const x0 = 12;
    const decay = 1 / (1 + Math.exp(-k * (x0 - hours)));
    const discountPct = Math.min(75, Math.max(0, Math.round((1 - decay) * 85)));
    const salvageRev = Math.round(100 - (discountPct * 0.7));
    return { discountPct, salvageRev };
  };

  const { discountPct, salvageRev } = sigmoidDecay(perishableHours);

  const handleLaunchApp = () => {
    if (isAuthenticated) {
      navigate('/cockpit');
    } else {
      navigate('/login');
    }
  };

  const handleQuickDemo = () => {
    // Navigate with demo persona prefill
    navigate('/login?mode=demo');
  };

  return (
    <div className="landing-page-root">
      <AmbientBackground />

      {/* Floating Header */}
      <header className="apple-nav-header">
        <div className="apple-nav-container">
          <Link to="/" className="apple-brand-logo">
            <span className="brand-title">Darkstori</span>
            <span className="brand-dot">.</span>
            <span className="brand-pill">3.0 OS</span>
          </Link>

          <nav className="apple-nav-links">
            <a href="#story">The 10-Min War</a>
            <a href="#interactive-sim">Live Simulators</a>
            <a href="#pillars">Core Engines</a>
            <a href="#comparison">Compare</a>
            <a href="#metros">Metros</a>
          </nav>

          <div className="apple-nav-actions">
            <button onClick={() => setIsDemoModalOpen(true)} className="btn-ghost-nav">
              <Sparkles size={15} />
              <span>Interactive Tour</span>
            </button>
            <button onClick={handleLaunchApp} className="btn-primary-nav">
              <span>{isAuthenticated ? 'Open Cockpit' : 'Partner Sign In'}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="apple-hero-section">
        <div className="hero-content-wrapper">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="hero-badge-pill"
          >
            <span className="pulse-indicator" />
            <span>Hyperlocal Quick Commerce Intelligence Platform</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="hero-title-main"
          >
            Sub-10-Minute Dark Store Precision.
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="hero-kinetic-container"
          >
            <span className="hero-lead-text">Automate operational execution with </span>
            <KineticScrambleHeadline
              phrases={[
                'PostGIS Greenfield Placement',
                'Zero-Waste Sigmoid Markdown',
                '10-Min VRP Fleet Dispatch',
                'Walk-Forward XGBoost Forecasting',
                'Network Cannibalization Defense'
              ]}
              interval={3600}
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="hero-subtext-description"
          >
            Quick commerce is a war of seconds and wafer-thin margins. Traditional dashboards only tell you what broke yesterday. Darkstori is the prescriptive AI operating system that automates location scouting, dynamic pricing decay, rider routing, and demand surges across India's focus metros.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="hero-cta-group"
          >
            <button onClick={handleLaunchApp} className="hero-btn-primary">
              <span>Launch Darkstori Cockpit</span>
              <ArrowRight size={18} />
            </button>
            <button onClick={() => setIsDemoModalOpen(true)} className="hero-btn-secondary">
              <Sparkles size={18} className="sparkle-gold" />
              <span>Interactive Live Tour</span>
            </button>
            <button onClick={handleQuickDemo} className="hero-btn-tertiary">
              <Play size={16} fill="currentColor" />
              <span>1-Click Sandbox</span>
            </button>
          </motion.div>

          {/* Quick Metrics Ticker */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="hero-metrics-ticker"
          >
            <div className="ticker-item">
              <span className="ticker-val">99.4%</span>
              <span className="ticker-lbl">10-Min SLA Fulfillment</span>
            </div>
            <div className="ticker-divider" />
            <div className="ticker-item">
              <span className="ticker-val">0%</span>
              <span className="ticker-lbl">Perishable Landfill Target</span>
            </div>
            <div className="ticker-divider" />
            <div className="ticker-item">
              <span className="ticker-val">2.8x</span>
              <span className="ticker-lbl">Faster Greenfield Breakeven</span>
            </div>
            <div className="ticker-divider" />
            <div className="ticker-item">
              <span className="ticker-val">5 Metros</span>
              <span className="ticker-lbl">BLR • BOM • DEL • HYD • PNQ</span>
            </div>
          </motion.div>
        </div>

        {/* Cinematic Mockup Frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.0, delay: 0.3 }}
          className="hero-device-viewport"
        >
          <div className="device-top-bar">
            <div className="device-dots">
              <span className="dot dot-red" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
            </div>
            <div className="device-url-bar">
              <Lock size={12} />
              <span>darkstori.io/cockpit/bangalore-hsr-hub</span>
            </div>
            <div className="device-live-tag">
              <span className="live-ping" />
              <span>LIVE TELEMETRY STREAM</span>
            </div>
          </div>

          <div className="device-canvas-preview">
            <div className="preview-grid">
              {/* Left mini widget: Greenfield Radar */}
              <div className="preview-panel radar-panel">
                <div className="panel-header">
                  <span className="panel-title">PostGIS DBSCAN Cluster</span>
                  <span className="badge-emerald">Score: 94.2/100</span>
                </div>
                <div className="radar-visual">
                  <div className="radar-circle circle-1" />
                  <div className="radar-circle circle-2" />
                  <div className="radar-circle circle-3" />
                  <div className="radar-sweep" />
                  <div className="node node-hub" style={{ top: '48%', left: '48%' }} title="Proposed Dark Store" />
                  <div className="node node-comp" style={{ top: '25%', left: '70%' }} title="Competitor Blinkit" />
                  <div className="node node-comp" style={{ top: '75%', left: '30%' }} title="Competitor Zepto" />
                  <div className="node node-cluster" style={{ top: '35%', left: '35%' }} title="High Density Demand Hub" />
                </div>
                <div className="panel-footer">
                  <span>HSR Layout Sector 4 • Greenfield Radius 1.8km</span>
                </div>
              </div>

              {/* Center mini widget: Sigmoid Salvage */}
              <div className="preview-panel sigmoid-panel">
                <div className="panel-header">
                  <span className="panel-title">Dynamic Sigmoid Salvage</span>
                  <span className="badge-amber">-35% Markdown Active</span>
                </div>
                <div className="sigmoid-visual">
                  <svg viewBox="0 0 300 120" className="chart-svg">
                    <defs>
                      <linearGradient id="sigGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="50%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#EF4444" />
                      </linearGradient>
                    </defs>
                    <path d="M 10 20 C 100 20, 150 100, 290 100" stroke="url(#sigGrad)" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <circle cx="160" cy="65" r="5" fill="#F59E0B" className="pulse-point" />
                  </svg>
                  <div className="curve-labels">
                    <span>100% Fresh</span>
                    <span>T-8h Critical Markdown</span>
                    <span>Salvaged</span>
                  </div>
                </div>
                <div className="panel-footer">
                  <span>Simulated Salvage Revenue: ₹48,200 saved / month</span>
                </div>
              </div>

              {/* Right mini widget: VRP Dispatch */}
              <div className="preview-panel vrp-panel">
                <div className="panel-header">
                  <span className="panel-title">Clarke-Wright 10-Min VRP</span>
                  <span className="badge-indigo">3 Drops • 8.2 min ETA</span>
                </div>
                <div className="vrp-list">
                  <div className="vrp-step">
                    <span className="step-idx">1</span>
                    <div className="step-info">
                      <strong>Hub Dispatch</strong>
                      <small>0.0 km • 00:00</small>
                    </div>
                  </div>
                  <div className="vrp-step">
                    <span className="step-idx">2</span>
                    <div className="step-info">
                      <strong>Stop A: 14th Main Rd</strong>
                      <small>1.2 km • 04:20 ETA</small>
                    </div>
                  </div>
                  <div className="vrp-step">
                    <span className="step-idx">3</span>
                    <div className="step-info">
                      <strong>Stop B: 27th Cross Rd</strong>
                      <small>2.1 km • 08:15 ETA</small>
                    </div>
                  </div>
                </div>
                <div className="panel-footer">
                  <span>-38% Distance Traveled • 0.24 kg CO2 Prevented</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Narrative Section: The 10-Minute War */}
      <section id="story" className="apple-story-section">
        <div className="section-container">
          <div className="section-badge">
            <Activity size={14} />
            <span>THE QUICK COMMERCE CRISIS</span>
          </div>
          <h2 className="section-title">The High-Stakes War of 10-Minute Deliveries</h2>
          <p className="section-subtitle">
            78% of dark stores fail to turn profitable within their first 18 months. Why? Because quick commerce cannot be solved by spreadsheets or standard BI dashboards.
          </p>

          <div className="crisis-grid">
            <div className="crisis-card">
              <div className="crisis-icon danger">
                <XCircle size={24} />
              </div>
              <h3>Blind Greenfield Expansion</h3>
              <p>Opening hubs without spatial PostGIS clustering leads to internal cannibalization—stealing orders from your own existing stores while leaving lucrative competitor whitespace untouched.</p>
              <div className="stat-pill-red">Avg ₹28L CapEx Wasted</div>
            </div>

            <div className="crisis-card">
              <div className="crisis-icon danger">
                <XCircle size={24} />
              </div>
              <h3>The Perishable Death Spiral</h3>
              <p>Flat discounts on milk, berries, and vegetables are enacted too late. Store managers either dump rotten inventory into landfills or panic-sell at zero margin.</p>
              <div className="stat-pill-red">14-18% Margins Erased</div>
            </div>

            <div className="crisis-card">
              <div className="crisis-icon danger">
                <XCircle size={24} />
              </div>
              <h3>Rider Dispatch Bottlenecks</h3>
              <p>Sending 1 rider for every single order creates crippling fleet congestion during rain surges, leading to SLA breaches, churned customers, and blown logistics budgets.</p>
              <div className="stat-pill-red">42% Excess Rider Fuel</div>
            </div>

            <div className="crisis-card">
              <div className="crisis-icon danger">
                <XCircle size={24} />
              </div>
              <h3>Descriptive Dashboard Fatigue</h3>
              <p>Looking at yesterday’s sales in Tableau tells you what died yesterday, but leaves store operators stranded with zero automated guidance for what to do right now.</p>
              <div className="stat-pill-red">0 Prescriptive Action</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Simulator Section */}
      <section id="interactive-sim" className="apple-interactive-section">
        <div className="section-container">
          <div className="section-badge">
            <Cpu size={14} />
            <span>REAL-TIME SIMULATION SANDBOX</span>
          </div>
          <h2 className="section-title">Test the Algorithms Live in Your Browser</h2>
          <p className="section-subtitle">
            Experience how Darkstori’s prescriptive engines calculate optimal store placement, perishable pricing decay, and multi-drop batch routing in real time.
          </p>

          <div className="interactive-card">
            {/* Tabs */}
            <div className="sim-tabs-header">
              <button
                className={`sim-tab-btn ${activeSimTab === 'expansion' ? 'active' : ''}`}
                onClick={() => setActiveSimTab('expansion')}
              >
                <MapPin size={16} />
                <span>Greenfield & ROI Calculator</span>
              </button>
              <button
                className={`sim-tab-btn ${activeSimTab === 'sigmoid' ? 'active' : ''}`}
                onClick={() => setActiveSimTab('sigmoid')}
              >
                <DollarSign size={16} />
                <span>Sigmoid Perishable Salvage</span>
              </button>
              <button
                className={`sim-tab-btn ${activeSimTab === 'vrp' ? 'active' : ''}`}
                onClick={() => setActiveSimTab('vrp')}
              >
                <Truck size={16} />
                <span>10-Min VRP Dispatch</span>
              </button>
            </div>

            {/* Content for Tab 1: Expansion */}
            {activeSimTab === 'expansion' && (
              <div className="sim-content-pane">
                <div className="sim-controls-col">
                  <div className="sim-field">
                    <label>Target Metro City</label>
                    <div className="city-pill-selector">
                      {FOCUS_METROS.map((m) => (
                        <button
                          key={m.id}
                          className={`city-pill ${selectedCity === m.id ? 'selected' : ''}`}
                          onClick={() => setSelectedCity(m.id)}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sim-field">
                    <div className="slider-label-row">
                      <label>Hub Floor Size (Sq. Ft.)</label>
                      <span className="slider-val">{storeSqft.toLocaleString()} sqft</span>
                    </div>
                    <input
                      type="range"
                      min="800"
                      max="3500"
                      step="100"
                      value={storeSqft}
                      onChange={(e) => setStoreSqft(Number(e.target.value))}
                      className="apple-slider"
                    />
                    <div className="slider-limits">
                      <span>800 sqft (Micro-Hub)</span>
                      <span>3,500 sqft (Mega-Darkstore)</span>
                    </div>
                  </div>

                  <div className="sim-info-box">
                    <Sparkles size={16} className="info-icon" />
                    <span>Calculations factor in real road-network circuity (1.35x Indian urban grid) and PostGIS demographic density.</span>
                  </div>
                </div>

                <div className="sim-results-col">
                  <div className="sim-result-card highlight">
                    <div className="res-header">
                      <span>Opportunity Score</span>
                      <span className="pill-gold">Top Tier Greenfield</span>
                    </div>
                    <div className="res-big-number">{calculatedOpportunityScore}<small>/100</small></div>
                    <p className="res-detail">High working-professional density with competitor saturation below 1.4 stores/km².</p>
                  </div>

                  <div className="sim-metrics-grid">
                    <div className="res-mini-card">
                      <span className="res-mini-lbl">Est. Daily Orders</span>
                      <strong className="res-mini-val">{calculatedDailyOrders.toLocaleString()} /day</strong>
                    </div>
                    <div className="res-mini-card">
                      <span className="res-mini-lbl">Monthly Revenue</span>
                      <strong className="res-mini-val">₹{calculatedMonthlyRev} Lakhs</strong>
                    </div>
                    <div className="res-mini-card">
                      <span className="res-mini-lbl">Breakeven Horizon</span>
                      <strong className="res-mini-val">{estimatedBreakeven} Months</strong>
                    </div>
                    <div className="res-mini-card">
                      <span className="res-mini-lbl">Cannibalization Risk</span>
                      <strong className="res-mini-val" style={{ color: '#10B981' }}>Low (4.2%)</strong>
                    </div>
                  </div>

                  <button onClick={handleLaunchApp} className="sim-action-btn">
                    <span>Simulate Full Store P&L in Cockpit</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Content for Tab 2: Sigmoid */}
            {activeSimTab === 'sigmoid' && (
              <div className="sim-content-pane">
                <div className="sim-controls-col">
                  <div className="sim-field">
                    <div className="slider-label-row">
                      <label>Hours Remaining Until Expiry</label>
                      <span className="slider-val">{perishableHours} Hours</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="36"
                      step="1"
                      value={perishableHours}
                      onChange={(e) => setPerishableHours(Number(e.target.value))}
                      className="apple-slider"
                    />
                    <div className="slider-limits">
                      <span>2h (Critical Clearance)</span>
                      <span>36h (Fresh Harvest)</span>
                    </div>
                  </div>

                  <div className="sim-math-explanation">
                    <h4>The Sigmoid Formulation</h4>
                    <code>P(t) = P_base × [ 1 / (1 + e^(-k × (t_crit - t))) ]</code>
                    <p>Unlike blunt 50% discounts, our Sigmoid engine continuously optimizes the markdown curve to clear 100% of perishables right at maximum consumer willingness to pay.</p>
                  </div>
                </div>

                <div className="sim-results-col">
                  <div className="sim-result-card">
                    <div className="res-header">
                      <span>Recommended Markdown</span>
                      <span className="pill-emerald">Automated Pricing</span>
                    </div>
                    <div className="res-big-number">-{discountPct}%</div>
                    <p className="res-detail">Dynamic discount ensures batch clears within {Math.max(1, Math.round(perishableHours * 0.7))} hours with zero landfill waste.</p>
                  </div>

                  <div className="sim-metrics-grid">
                    <div className="res-mini-card">
                      <span className="res-mini-lbl">Salvage Revenue Recovery</span>
                      <strong className="res-mini-val">{salvageRev}% of Base</strong>
                    </div>
                    <div className="res-mini-card">
                      <span className="res-mini-lbl">Landfill Avoidance</span>
                      <strong className="res-mini-val" style={{ color: '#10B981' }}>100% Guaranteed</strong>
                    </div>
                  </div>

                  <button onClick={handleLaunchApp} className="sim-action-btn">
                    <span>Connect Live Inventory Batches</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Content for Tab 3: VRP */}
            {activeSimTab === 'vrp' && (
              <div className="sim-content-pane">
                <div className="sim-controls-col">
                  <div className="vrp-sim-summary">
                    <h4>Clarke-Wright Savings Heuristic</h4>
                    <p>When 10 customer orders arrive within 4 minutes, Darkstori clusters proximate drop points into optimized 2-3 stop loops without breaching the 10-minute delivery SLA.</p>
                    <div className="vrp-stat-box">
                      <div className="vrp-stat">
                        <span>Original Single Rider Trips:</span>
                        <strong>10 Riders (34.2 km total)</strong>
                      </div>
                      <div className="vrp-stat highlight">
                        <span>Optimized Batched Routes:</span>
                        <strong>4 Riders (19.6 km total)</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sim-results-col">
                  <div className="sim-result-card highlight">
                    <div className="res-header">
                      <span>Fleet Efficiency Gain</span>
                      <span className="pill-indigo">SLA Compliant</span>
                    </div>
                    <div className="res-big-number">+42.7%</div>
                    <p className="res-detail">Saved 14.6 km of delivery rider travel and eliminated 1.24 kg of CO2 in a single peak hour.</p>
                  </div>

                  <div className="sim-metrics-grid">
                    <div className="res-mini-card">
                      <span className="res-mini-lbl">Average Drop ETA</span>
                      <strong className="res-mini-val">8.4 Mins</strong>
                    </div>
                    <div className="res-mini-card">
                      <span className="res-mini-lbl">Rider Cost Reduction</span>
                      <strong className="res-mini-val">-35.8%</strong>
                    </div>
                  </div>

                  <button onClick={handleLaunchApp} className="sim-action-btn">
                    <span>View Live VRP Dispatcher</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bento Grid: 4 Core Pillars */}
      <section id="pillars" className="apple-pillars-section">
        <div className="section-container">
          <div className="section-badge">
            <Layers size={14} />
            <span>THE 4 PROPRIETARY AI ENGINES</span>
          </div>
          <h2 className="section-title">Engineered to Outmaneuver Every Competitor</h2>
          <p className="section-subtitle">
            Every module in Darkstori is built around prescriptive execution, not passive observation.
          </p>

          <div className="bento-grid">
            {/* Pillar 1: Greenfield */}
            <div className="bento-card bento-span-2">
              <div className="bento-icon"><MapPin size={28} /></div>
              <h3>1. PostGIS DBSCAN Spatial Greenfield Placement</h3>
              <p>Identifies high-density demographic zones unserved by Blinkit, Zepto, or Swiggy Instamart. Runs Huff’s Gravity Model with 1.35x road grid circuity to simulate market share capture while guaranteeing zero cannibalization of your existing stores.</p>
              <div className="bento-tags">
                <span>ST_ClusterDBSCAN</span>
                <span>Huff Gravity Model</span>
                <span>Cannibalization Guard</span>
              </div>
            </div>

            {/* Pillar 2: Sigmoid Perishables */}
            <div className="bento-card">
              <div className="bento-icon"><TrendingUp size={28} /></div>
              <h3>2. Sigmoid Dynamic Salvage Decay</h3>
              <p>Automates markdown pricing on perishables to ensure 100% zero-waste clearance while maximizing salvage margins before shelf expiration.</p>
              <div className="bento-tags">
                <span>Zero-Waste</span>
                <span>Automated Pricing</span>
              </div>
            </div>

            {/* Pillar 3: VRP Dispatch */}
            <div className="bento-card">
              <div className="bento-icon"><Truck size={28} /></div>
              <h3>3. 10-Minute VRP Fleet Optimizer</h3>
              <p>Clarke-Wright Savings heuristic clusters pending orders into multi-drop rider routes that strictly preserve your 10-minute SLA promise.</p>
              <div className="bento-tags">
                <span>Clarke-Wright Heuristic</span>
                <span>CO2 Reduction</span>
              </div>
            </div>

            {/* Pillar 4: XGBoost Forecasting */}
            <div className="bento-card bento-span-2">
              <div className="bento-icon"><Zap size={28} /></div>
              <h3>4. Walk-Forward XGBoost Demand Forecaster</h3>
              <p>Predicts localized hourly SKU load factoring in Open-Meteo rain surges, IPL cricket matches, local Indian festivals, and historical lag features with walk-forward temporal cross-validation.</p>
              <div className="bento-tags">
                <span>Walk-Forward Backtesting</span>
                <span>Rain Surge Multiplier</span>
                <span>Event Intelligence</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Matrix Table */}
      <section id="comparison" className="apple-comparison-section">
        <div className="section-container">
          <div className="section-badge">
            <CheckCircle2 size={14} />
            <span>THE COMPETITIVE ADVANTAGE</span>
          </div>
          <h2 className="section-title">Descriptive BI vs Darkstori Prescriptive AI</h2>
          <p className="section-subtitle">
            See how Darkstori stands in a completely different class compared to generic dashboards.
          </p>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Capability</th>
                  <th className="th-competitor">Traditional BI (Tableau / PowerBI)</th>
                  <th className="th-darkstori">Darkstori 3.0 Prescriptive OS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Decision Mode</strong></td>
                  <td className="td-competitor"><XCircle size={16} /> Backward-looking historical graphs</td>
                  <td className="td-darkstori"><CheckCircle2 size={16} /> <strong>Real-time Prescriptive Action Recommendations</strong></td>
                </tr>
                <tr>
                  <td><strong>Store Placement</strong></td>
                  <td className="td-competitor"><XCircle size={16} /> Manual spreadsheet guesswork</td>
                  <td className="td-darkstori"><CheckCircle2 size={16} /> <strong>PostGIS DBSCAN Spatial Saturation & Cannibalization Engine</strong></td>
                </tr>
                <tr>
                  <td><strong>Perishable Waste</strong></td>
                  <td className="td-competitor"><XCircle size={16} /> Written off as losses (14% wasted)</td>
                  <td className="td-darkstori"><CheckCircle2 size={16} /> <strong>Continuous Sigmoid Markdown Decay (Target 0% Waste)</strong></td>
                </tr>
                <tr>
                  <td><strong>Rider Dispatch</strong></td>
                  <td className="td-competitor"><XCircle size={16} /> Naive 1-to-1 dispatch (high cost)</td>
                  <td className="td-darkstori"><CheckCircle2 size={16} /> <strong>Capacitated Multi-Drop 10-Min VRP Batching</strong></td>
                </tr>
                <tr>
                  <td><strong>Surge Intelligence</strong></td>
                  <td className="td-competitor"><XCircle size={16} /> Reactive after delivery delays occur</td>
                  <td className="td-darkstori"><CheckCircle2 size={16} /> <strong>Pre-emptive Weather & Event Surge Predictive Scaling</strong></td>
                </tr>
                <tr>
                  <td><strong>Real-Time Sync</strong></td>
                  <td className="td-competitor"><XCircle size={16} /> Periodic REST Polling (Slow)</td>
                  <td className="td-darkstori"><CheckCircle2 size={16} /> <strong>PostgreSQL LISTEN/NOTIFY + Socket.IO Zero-Polling</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Focus Metros Showcase */}
      <section id="metros" className="apple-metros-section">
        <div className="section-container">
          <div className="section-badge">
            <Globe2 size={14} />
            <span>INDIAN HYPERLOCAL FOCUS METROS</span>
          </div>
          <h2 className="section-title">Deep Hyperlocal Calibration Across 5 Focus Cities</h2>
          <p className="section-subtitle">
            Tuned with micro-market demographics, pincode-level purchasing power, and local traffic circuity factors.
          </p>

          <div className="metros-grid">
            {FOCUS_METROS.map((metro) => (
              <div key={metro.id} className="metro-card">
                <div className="metro-top">
                  <h3>{metro.name}</h3>
                  <span className="metro-badge">{metro.hubs} Active Hubs</span>
                </div>
                <div className="metro-details">
                  <div className="metro-stat">
                    <span>Avg Telemetry Latency:</span>
                    <strong>{metro.latency}</strong>
                  </div>
                  <div className="metro-stat">
                    <span>Key Greenfield Corridors:</span>
                    <small>{metro.greenfields}</small>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedCity(metro.id);
                    document.getElementById('interactive-sim')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="metro-explore-btn"
                >
                  <span>Simulate {metro.name}</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="apple-final-cta">
        <div className="cta-box-glow">
          <h2 className="cta-headline">Ready to Supercharge Your Dark Store Network?</h2>
          <p className="cta-subheadline">
            Join forward-thinking operators, regional directors, and quick commerce brands running sub-10-minute prescriptive intelligence.
          </p>
          <div className="cta-buttons-wrap">
            <button onClick={handleLaunchApp} className="hero-btn-primary">
              <span>Launch Darkstori Cockpit</span>
              <ArrowRight size={18} />
            </button>
            <button onClick={handleQuickDemo} className="hero-btn-secondary">
              <Sparkles size={18} className="sparkle-gold" />
              <span>Try Instant Guest Sandbox</span>
            </button>
          </div>
          <p className="cta-footnote">No credit card required • Instant access to 5 focus metros • SOC-2 & ISO 27001 Ready</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="apple-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="brand-wordmark">
              Darkstori<span className="saffron-dot">.</span>
            </div>
            <p>Enterprise Hyperlocal Quick Commerce Intelligence & Prescriptive Automation Platform.</p>
            <small>© {new Date().getFullYear()} Darkstori Inc. All rights reserved.</small>
          </div>

          <div className="footer-links-group">
            <h4>Engines</h4>
            <a href="#interactive-sim">PostGIS DBSCAN Placement</a>
            <a href="#interactive-sim">Sigmoid Dynamic Salvage</a>
            <a href="#interactive-sim">Clarke-Wright 10-Min VRP</a>
            <a href="#interactive-sim">XGBoost Surge Forecaster</a>
          </div>

          <div className="footer-links-group">
            <h4>Metros</h4>
            <a href="#metros">Bangalore</a>
            <a href="#metros">Mumbai</a>
            <a href="#metros">Delhi-NCR</a>
            <a href="#metros">Hyderabad & Pune</a>
          </div>

          <div className="footer-links-group">
            <h4>Platform</h4>
            <Link to="/login">Partner Portal</Link>
            <Link to="/login?mode=register">Create Hub Account</Link>
            <Link to="/login?mode=demo">Instant Sandbox</Link>
          </div>
        </div>
      </footer>

      {/* Interactive Live Product Demo Modal */}
      <InteractiveProductDemo
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </div>
  );
}
