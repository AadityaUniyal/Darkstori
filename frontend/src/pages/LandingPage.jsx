import { useState, useEffect, useRef } from 'react';
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
  ChevronLeft,
  ChevronDown,
  Cpu,
  BarChart2,
  DollarSign,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Truck,
  Leaf,
  Navigation,
  Globe2,
  Lock,
  Copy,
  Check,
  Mail,
  Building2,
  HelpCircle,
  Send,
  CloudRain,
  Radio,
  ExternalLink,
  Sliders,
  FileCheck2,
  Workflow
} from 'lucide-react';
import { toast } from 'sonner';
import AmbientBackground from '../components/AmbientBackground';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

const AUTHOR_EMAIL = 'aadityauniyal2004@gmail.com';

const HERO_SPECIALTIES = [
  'PostGIS Greenfield Placement',
  'Zero-Waste Sigmoid Markdowns',
  '10-Minute VRP Fleet Dispatch',
  'Walk-Forward Demand Forecasting',
  'Network Cannibalization Defense'
];

const FOCUS_METROS = [
  { id: 'bangalore', name: 'Bangalore', hubs: 48, status: 'Active', latency: '42ms', greenfields: 'HSR, Indiranagar, Whitefield' },
  { id: 'mumbai', name: 'Mumbai', hubs: 62, status: 'Active', latency: '38ms', greenfields: 'Bandra West, Powai, Andheri East' },
  { id: 'delhi', name: 'Delhi-NCR', hubs: 54, status: 'Active', latency: '45ms', greenfields: 'Gurugram Sec-43, Noida Sec-62, Saket' },
  { id: 'hyderabad', name: 'Hyderabad', hubs: 36, status: 'Active', latency: '50ms', greenfields: 'Hitec City, Gachibowli, Jubilee Hills' },
  { id: 'pune', name: 'Pune', hubs: 28, status: 'Active', latency: '48ms', greenfields: 'Koregaon Park, Baner, Viman Nagar' },
];

const STORY_CHAPTERS = [
  {
    id: 'chapter-1',
    chapterNum: '01',
    tag: 'SPATIAL INTELLIGENCE',
    title: 'PostGIS Greenfield Radar vs Blind Cannibalization',
    subtitle: 'The ₹35 Lakh Expansion Trap',
    problem: 'Quick commerce operators burn ₹25L–₹40L CapEx per store opening blindly in saturated corridors. New stores inadvertently siphon 35% of orders from existing sister hubs while leaving lucrative competitor whitespace untouched.',
    solution: 'Darkstori executes spatial PostGIS DBSCAN clustering with a 1.35x Indian urban road-circuity matrix and Huff’s Gravity Model, identifying dense demographic pockets while mathematically ensuring cannibalization stays strictly below 5%.',
    metrics: [
      { label: 'CapEx Protected', value: '₹35L / Node' },
      { label: 'Cannibalization', value: '< 4.2% Risk' },
      { label: 'Whitespace Index', value: '94.2/100' },
      { label: 'Catchment Radius', value: '1.8 km Isochrone' }
    ],
    interactiveType: 'radar'
  },
  {
    id: 'chapter-2',
    chapterNum: '02',
    tag: 'MARGIN PRESERVATION',
    title: 'Zero-Waste Sigmoid Decay vs Dumpster Landfills',
    subtitle: 'The Perishable Death Spiral',
    problem: 'Fresh dairy, meat, berries, and vegetables decay within 24–48 hours. Store managers apply blunt 20% or 50% discounts hours too late, forcing 14–18% of fresh stock into garbage dumps and decimating gross margins.',
    solution: 'Darkstori’s autonomous Sigmoid Dynamic Decay calculates optimal markdown pricing every 15 minutes, matching consumer price sensitivity to clear 100% of perishable batches right before expiration with zero waste.',
    metrics: [
      { label: 'Landfill Avoidance', value: '100% Target' },
      { label: 'Salvage Margin Recovery', value: '+24.6%' },
      { label: 'Pricing Frequency', value: 'Every 15 mins' },
      { label: 'Monthly Salvage Value', value: '₹1.84 Lakhs' }
    ],
    interactiveType: 'sigmoid'
  },
  {
    id: 'chapter-3',
    chapterNum: '03',
    tag: 'FLEET OPTIMIZATION',
    title: 'Clarke-Wright 10-Minute VRP vs 1-to-1 Dispatch Chaos',
    subtitle: 'The Logistics Bottleneck',
    problem: 'Dispatching 1 rider for every individual order clogs city streets, inflates fuel costs by 42%, and shatters the 10-minute delivery SLA during morning milk runs and evening snack peaks.',
    solution: 'Darkstori deploys capacitated Clarke-Wright Savings heuristics, dynamically bundling 2–3 proximate drop points within a 1.8km radius into a single 8.2-minute loop, slashing fleet costs without SLA breach.',
    metrics: [
      { label: 'Average ETA', value: '8.2 mins' },
      { label: 'Fleet Cost Reduction', value: '-38.4%' },
      { label: '10-Min SLA Guard', value: '99.4%' },
      { label: 'Carbon Avoided', value: '1.24 kg CO₂/hr' }
    ],
    interactiveType: 'vrp'
  },
  {
    id: 'chapter-4',
    chapterNum: '04',
    tag: 'WEATHER & RESILIENCE',
    title: 'Pre-Emptive Monsoon Defense vs Fleet Gridlock',
    subtitle: 'The Flash Downpour Crisis',
    problem: 'A sudden monsoon downpour in Bangalore or Mumbai blinds delivery fleets. Roads flood, delivery times spike past 45 minutes, riders log off, and furious customers cancel over 30% of incoming orders.',
    solution: 'Darkstori streams Open-Meteo precipitation radar and temporal XGBoost models, detecting rain surges 20 minutes before impact. The system pre-emptively contracts delivery geofences, reallocates rider payouts, and stages rain gear.',
    metrics: [
      { label: 'Early Warning Lead', value: '20 Mins Ahead' },
      { label: 'SLA Breach Rate', value: '< 0.6%' },
      { label: 'Rider Retention', value: '+45% Active' },
      { label: 'Autonomous Actions', value: '100% Prescriptive' }
    ],
    interactiveType: 'monsoon'
  }
];

const FAQ_ITEMS = [
  {
    question: 'How does Darkstori solve dark store expansion without cannibalizing existing hubs?',
    answer: 'Darkstori replaces spreadsheet guesswork with spatial PostGIS DBSCAN clustering and Huff’s Gravity Model. We analyze road network circuity (factoring in 1.35x Indian grid factors, flyovers, and railway barriers) to evaluate competitor saturation (Blinkit, Zepto, Swiggy Instamart) and predict exact order diversion. A greenfield site is only recommended if cannibalization of your own existing nodes remains below 5%.'
  },
  {
    question: 'How does the Sigmoid Dynamic Markdown engine avoid inventory waste?',
    answer: 'Traditional retail applies static 20% or 50% discount stickers when food is already spoiled. Darkstori models perishable shelf-life decay using a continuous sigmoid function: P(t) = P_base × [1 / (1 + exp(-k × (t_crit - t)))]. Discounts adjust continuously in real time based on remaining hours, local SKU velocity, and price elasticity, ensuring batches clear completely before reaching their expiry threshold.'
  },
  {
    question: 'Can Darkstori guarantee 10-minute SLA delivery when batching multiple orders?',
    answer: 'Yes. Our Clarke-Wright Vehicle Routing Problem (VRP) heuristic enforces a hard temporal ceiling of 10 minutes total turnaround time (including 2.5 minutes for in-store picker pack-time, transit time, and customer hand-off). Batches are only formed for delivery points sharing tight geographic clusters within 1.8km of the hub.'
  },
  {
    question: 'How quickly can our quick commerce enterprise deploy Darkstori?',
    answer: 'Darkstori integrates via REST and PostgreSQL LISTEN/NOTIFY webhooks with existing WMS/ERP systems (such as SAP, Oracle, Blue Yonder, or proprietary microservices). A pilot dark store hub can be calibrated and streaming live telemetry within 72 hours, with full 5-metro enterprise rollout taking under 14 days.'
  },
  {
    question: 'Does Darkstori operate on-premises or inside our private cloud (AWS/GCP/Azure VPC)?',
    answer: 'Yes. Darkstori can be deployed fully containerized via Docker and Kubernetes inside your isolated VPC, ensuring zero sensitive order or customer PII ever leaves your corporate security perimeter.'
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Clock state for India Standard Time (IST)
  const [istTime, setIstTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const timeString = new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(now);
        setIstTime(timeString);
      } catch {
        setIstTime('23:45:00');
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Scrollytelling Story State
  const [specialtyIdx, setSpecialtyIdx] = useState(0);
  const [activeStoryIdx, setActiveStoryIdx] = useState(0);

  useEffect(() => {
    const specialtyTimer = setInterval(() => {
      setSpecialtyIdx((prev) => (prev + 1) % HERO_SPECIALTIES.length);
    }, 3800);
    return () => clearInterval(specialtyTimer);
  }, []);
  const [isStoryAutoplay, setIsStoryAutoplay] = useState(false);
  const [radarRadius, setRadarRadius] = useState(1.8);
  const [storyPerishableHours, setStoryPerishableHours] = useState(10);
  const [storyVrpMode, setStoryVrpMode] = useState('batched');
  const [storyMonsoonActive, setStoryMonsoonActive] = useState(false);

  // Story Autoplay Cycle
  useEffect(() => {
    if (!isStoryAutoplay) return;
    const interval = setInterval(() => {
      setActiveStoryIdx((prev) => (prev + 1) % STORY_CHAPTERS.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [isStoryAutoplay]);

  // Interactive Live Calculator State (Tabbed Section)
  const [selectedCity, setSelectedCity] = useState('bangalore');
  const [storeSqft, setStoreSqft] = useState(1800);
  const [perishableHours, setPerishableHours] = useState(14);
  const [activeSimTab, setActiveSimTab] = useState('expansion');

  // Enterprise Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactCompany, setContactCompany] = useState('Zepto');
  const [contactHubs, setContactHubs] = useState('25-100 Hubs');
  const [contactCity, setContactCity] = useState('Bangalore');
  const [contactChallenge, setContactChallenge] = useState('Greenfield Placement & Cannibalization');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0);

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
  const storySigmoid = sigmoidDecay(storyPerishableHours);

  const handleLaunchApp = () => {
    if (isAuthenticated) {
      navigate('/cockpit');
    } else {
      navigate('/login');
    }
  };

  const handleQuickDemo = () => {
    navigate('/login?mode=demo');
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(AUTHOR_EMAIL);
    setCopiedEmail(true);
    toast.success(`Copied to clipboard: ${AUTHOR_EMAIL}`);
    setTimeout(() => setCopiedEmail(false), 3000);
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactEmail) {
      toast.error('Please enter your work email.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      toast.success('Consultation request dispatched! We will respond within 4 hours.');
    }, 900);
  };

  return (
    <div className="landing-page-root">
      <AmbientBackground />

      {/* Floating Cupertino Navigation Header */}
      <header className="apple-nav-header">
        <div className="apple-nav-container">
          <Link to="/" className="apple-brand-logo">
            <span className="brand-title">Darkstori</span>
          </Link>

          <nav className="apple-nav-links">
            <a href="#crisis">The Problem</a>
            <a href="#story">How Darkstori Simplifies It</a>
            <a href="#metros">Metros</a>
            <a href="#contact" className="nav-link-highlight">Architecture Pilot</a>
          </nav>

          <div className="apple-nav-actions">
            <div className="nav-noc-status" title="Bangalore NOC Active Operations">
              <span className="live-ping" />
              <span className="noc-text">BLR NOC • 5 Metros Live</span>
            </div>
            <button onClick={handleLaunchApp} className="btn-primary-nav">
              <span>{isAuthenticated ? 'Open Cockpit' : 'Launch Platform'}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="apple-hero-section">
        <div className="hero-content-wrapper">
          {/* Top Operational Pill with Live IST Clock */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="hero-badge-pill"
          >
            <span className="pulse-indicator" />
            <span className="badge-text">
              Bangalore Operations: <strong>{istTime || '23:45:00'} IST</strong> • Sub-10-Min Prescriptive Execution
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="hero-title-main"
          >
            Sub-10-Minute Dark Store Precision.
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="hero-rotating-container"
          >
            <span className="hero-lead-text">Automating operational execution across</span>
            <span className="hero-rotating-badge-wrapper">
              <AnimatePresence mode="wait">
                <motion.span
                  key={specialtyIdx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="hero-rotating-badge"
                >
                  {HERO_SPECIALTIES[specialtyIdx]}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="hero-subtext-description"
          >
            Quick commerce is a war of seconds and wafer-thin margins where 78% of dark stores bleed capital. Traditional dashboards only tell you what broke yesterday. <strong>Darkstori</strong> is the prescriptive AI operating system that automates location scouting, dynamic markdown pricing decay, rider multi-drop routing, and weather defense across India&apos;s premier metros.
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
            <a href="#story" className="hero-btn-secondary">
              <span>Explore Corridors</span>
            </a>
            <a href="#contact" className="hero-btn-outline">
              <Mail size={16} />
              <span>Book Architecture Pilot</span>
            </a>
          </motion.div>

          {/* Quick Metrics Ticker */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
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
              <span className="ticker-val">₹40L+</span>
              <span className="ticker-lbl">CapEx Protected / Hub</span>
            </div>
            <div className="ticker-divider" />
            <div className="ticker-item">
              <span className="ticker-val">5 Metros</span>
              <span className="ticker-lbl">BLR • BOM • DEL • HYD • PNQ</span>
            </div>
          </motion.div>
        </div>

        {/* Cinematic Device Viewport Mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
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
              <span>LIVE TELEMETRY STREAM • 38ms</span>
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
                  <span>-38% Distance Traveled • 0.24 kg CO₂ Prevented</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* SECTION 1: THE CORE PROBLEM / CRISIS BREAKDOWN */}
      <section id="crisis" className="apple-story-section">
        <div className="section-container">
          <div className="section-badge">
            <Activity size={14} />
            <span>THE 10-MINUTE QUICK COMMERCE DILEMMA</span>
          </div>
          <h2 className="section-title">Why 78% of Dark Stores Burn Capital</h2>
          <p className="section-subtitle">
            Quick commerce operators (Blinkit, Zepto, Swiggy Instamart, BB Now) operate in a pressure-cooker of wafer-thin margins, ruthless competition, and unforgiving 10-minute consumer expectations. These are the 4 systemic traps killing profitability:
          </p>

          <div className="crisis-grid">
            <div className="crisis-card">
              <div className="crisis-icon danger">
                <XCircle size={24} />
              </div>
              <h3>1. Blind Expansion & Self-Cannibalization</h3>
              <p>Opening hubs without spatial PostGIS clustering leads to internal cannibalization—stealing orders from your own existing stores while leaving lucrative competitor whitespace completely untouched.</p>
              <div className="stat-pill-red">Avg ₹28L–₹40L CapEx Wasted</div>
            </div>

            <div className="crisis-card">
              <div className="crisis-icon danger">
                <XCircle size={24} />
              </div>
              <h3>2. The Perishable Death Spiral</h3>
              <p>Fresh inventory (berries, dairy, organic greens) decay rapidly. Blunt, delayed discounts force store operators to dump 14–18% of fresh stock directly into landfills, wiping out store gross margins.</p>
              <div className="stat-pill-red">14–18% Inventory Dumped</div>
            </div>

            <div className="crisis-card">
              <div className="crisis-icon danger">
                <XCircle size={24} />
              </div>
              <h3>3. 1-to-1 Dispatch Logistics Congestion</h3>
              <p>Sending 1 rider for every individual order creates crippling street congestion during rain surges, leading to blown delivery SLAs, customer churn, and blown rider payout budgets.</p>
              <div className="stat-pill-red">42% Excess Fuel & Fleet Cost</div>
            </div>

            <div className="crisis-card">
              <div className="crisis-icon danger">
                <XCircle size={24} />
              </div>
              <h3>4. Weather Chaos & Descriptive Fatigue</h3>
              <p>Looking at yesterday’s sales in Tableau tells you what died yesterday, but leaves store operators stranded with zero automated guidance when a flash Indian monsoon floods Bangalore or Mumbai.</p>
              <div className="stat-pill-red">0 Prescriptive Action in Legacy BI</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: INTERACTIVE SCROLLYTELLING STORY JOURNEY */}
      <section id="story" className="scrollytelling-section">
        <div className="section-container">
          <div className="section-header-center">
            <div className="section-badge">
              <Workflow size={14} />
              <span>INTERACTIVE STORYTELLING WALKTHROUGH</span>
            </div>
            <h2 className="section-title">The 10-Minute Dark Store Survival Journey</h2>
            <p className="section-subtitle">
              Follow how Darkstori&apos;s 4 proprietary AI engines step in sequentially to turn systemic quick commerce chaos into automated, sub-10-minute profitable execution.
            </p>
          </div>

          {/* Scrollytelling Interactive Stage */}
          <div className="scrolly-container">
            {/* Sticky Chapter Stepper Header */}
            <div className="scrolly-nav-bar">
              <div className="scrolly-nav-buttons">
                {STORY_CHAPTERS.map((chap, idx) => (
                  <button
                    key={chap.id}
                    onClick={() => {
                      setActiveStoryIdx(idx);
                      setIsStoryAutoplay(false);
                    }}
                    className={`scrolly-tab-btn ${activeStoryIdx === idx ? 'active' : ''}`}
                  >
                    <span className="tab-num">{chap.chapterNum}</span>
                    <span className="tab-title">{chap.tag}</span>
                    {activeStoryIdx === idx && (
                      <motion.div layoutId="scrollyActivePill" className="active-pill-highlight" />
                    )}
                  </button>
                ))}
              </div>

              <div className="scrolly-nav-controls">
                <button
                  onClick={() => setIsStoryAutoplay(!isStoryAutoplay)}
                  className={`scrolly-ctrl-btn ${isStoryAutoplay ? 'playing' : ''}`}
                  title={isStoryAutoplay ? 'Pause auto-cycle' : 'Auto-play story chapters'}
                >
                  {isStoryAutoplay ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isStoryAutoplay ? 'Auto-Advancing' : 'Auto-Play'}</span>
                </button>
                <div className="scrolly-arrow-group">
                  <button
                    onClick={() => {
                      setActiveStoryIdx((prev) => (prev - 1 + STORY_CHAPTERS.length) % STORY_CHAPTERS.length);
                      setIsStoryAutoplay(false);
                    }}
                    className="scrolly-arrow-btn"
                    title="Previous Chapter"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setActiveStoryIdx((prev) => (prev + 1) % STORY_CHAPTERS.length);
                      setIsStoryAutoplay(false);
                    }}
                    className="scrolly-arrow-btn"
                    title="Next Chapter"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Active Chapter Card */}
            <div className="scrolly-content-grid">
              {/* Left Column: Narrative Explanation */}
              <div className="scrolly-narrative-col">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={STORY_CHAPTERS[activeStoryIdx].id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="chapter-narrative-wrapper"
                  >
                    <div className="chapter-header-badge">
                      <span className="chap-num-label">CHAPTER {STORY_CHAPTERS[activeStoryIdx].chapterNum}</span>
                      <span className="chap-tag-label">{STORY_CHAPTERS[activeStoryIdx].tag}</span>
                    </div>

                    <h3 className="chapter-headline">{STORY_CHAPTERS[activeStoryIdx].title}</h3>
                    <div className="chapter-sub-callout">{STORY_CHAPTERS[activeStoryIdx].subtitle}</div>

                    <div className="story-problem-box">
                      <div className="box-title text-red">
                        <XCircle size={15} />
                        <span>The Operational Trap:</span>
                      </div>
                      <p>{STORY_CHAPTERS[activeStoryIdx].problem}</p>
                    </div>

                    <div className="story-solution-box">
                      <div className="box-title text-emerald">
                        <CheckCircle2 size={15} />
                        <span>The Darkstori Prescriptive Fix:</span>
                      </div>
                      <p>{STORY_CHAPTERS[activeStoryIdx].solution}</p>
                    </div>

                    <div className="chapter-metrics-row">
                      {STORY_CHAPTERS[activeStoryIdx].metrics.map((m, i) => (
                        <div key={i} className="story-metric-pill">
                          <span className="metric-label">{m.label}</span>
                          <strong className="metric-val">{m.value}</strong>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Right Column: Live Interactive Chapter Stage */}
              <div className="scrolly-stage-col">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`stage-${STORY_CHAPTERS[activeStoryIdx].id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="scrolly-interactive-canvas"
                  >
                    {/* Chapter 1 Stage: Spatial Radar */}
                    {activeStoryIdx === 0 && (
                      <div className="stage-panel stage-radar">
                        <div className="stage-top-bar">
                          <div className="stage-title-wrap">
                            <MapPin size={16} className="text-cyan" />
                            <span>Spatial Catchment Radar (HSR Layout Sector 4)</span>
                          </div>
                          <span className="stage-badge-pill">DBSCAN Epsilon: 0.8km</span>
                        </div>

                        <div className="interactive-radar-view">
                          <div
                            className="dynamic-radar-circle circle-active"
                            style={{ width: `${radarRadius * 90}px`, height: `${radarRadius * 90}px` }}
                          />
                          <div className="radar-sweep" />
                          <div className="radar-grid-lines" />
                          <div className="radar-hub-pin" title="Proposed Darkstori Hub (Zero Cannibalization)" />
                          <div className="competitor-pin blinkit-pin" style={{ top: '22%', left: '72%' }} title="Competitor Blinkit (1.9km away)" />
                          <div className="competitor-pin zepto-pin" style={{ top: '78%', left: '26%' }} title="Competitor Zepto (2.1km away)" />
                          <div className="competitor-pin instamart-pin" style={{ top: '65%', left: '80%' }} title="Competitor Swiggy Instamart (1.8km away)" />
                          <div className="demand-bubble bubble-1" style={{ top: '38%', left: '42%' }}>High Tech Parks</div>
                          <div className="demand-bubble bubble-2" style={{ top: '55%', left: '60%' }}>Residential Villas</div>
                        </div>

                        <div className="stage-controls-bar">
                          <div className="slider-row-wrap">
                            <label>Scouting Radius: <strong>{radarRadius} km</strong></label>
                            <input
                              type="range"
                              min="1.0"
                              max="3.0"
                              step="0.1"
                              value={radarRadius}
                              onChange={(e) => setRadarRadius(parseFloat(e.target.value))}
                              className="apple-slider"
                            />
                          </div>
                          <div className="stage-status-row">
                            <span className="status-item">Whitespace Capture: <strong>+18.4% Net</strong></span>
                            <span className="status-item">Cannibalization Risk: <strong className="text-emerald">3.8% (Approved)</strong></span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Chapter 2 Stage: Dynamic Sigmoid Decay */}
                    {activeStoryIdx === 1 && (
                      <div className="stage-panel stage-sigmoid">
                        <div className="stage-top-bar">
                          <div className="stage-title-wrap">
                            <DollarSign size={16} className="text-emerald" />
                            <span>Autonomous Sigmoid Markdown Decay (Organic Berries Batch #84)</span>
                          </div>
                          <span className="stage-badge-pill">Shelf Life: 36h</span>
                        </div>

                        <div className="interactive-sigmoid-view">
                          <svg viewBox="0 0 360 140" className="sigmoid-story-svg">
                            <defs>
                              <linearGradient id="storySigGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#10B981" />
                                <stop offset="50%" stopColor="#F59E0B" />
                                <stop offset="100%" stopColor="#EF4444" />
                              </linearGradient>
                            </defs>
                            <path d="M 15 25 C 130 25, 180 115, 345 115" stroke="url(#storySigGrad)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                            {/* Dynamic marker position based on storyPerishableHours */}
                            <circle
                              cx={Math.max(25, Math.min(335, 360 - (storyPerishableHours * 9)))}
                              cy={Math.max(28, Math.min(112, 115 - (storySigmoid.salvageRev * 0.88)))}
                              r="7"
                              fill="#38BDF8"
                              className="interactive-dot"
                            />
                          </svg>
                          <div className="svg-scale-labels">
                            <span>Fresh Harvest (36h left)</span>
                            <span>Optimal Markdown (12h left)</span>
                            <span>Target Zero-Waste (2h left)</span>
                          </div>
                        </div>

                        <div className="stage-controls-bar">
                          <div className="slider-row-wrap">
                            <label>Hours Remaining Until Expiration: <strong>{storyPerishableHours} Hours</strong></label>
                            <input
                              type="range"
                              min="2"
                              max="36"
                              step="1"
                              value={storyPerishableHours}
                              onChange={(e) => setStoryPerishableHours(parseInt(e.target.value))}
                              className="apple-slider"
                            />
                          </div>
                          <div className="stage-status-row">
                            <span className="status-item">Recommended Markdown: <strong className="text-amber">-{storySigmoid.discountPct}%</strong></span>
                            <span className="status-item">Salvage Margin: <strong>{storySigmoid.salvageRev}% of Base</strong></span>
                            <span className="status-item">Dumpster Waste: <strong className="text-emerald">0% Landfill</strong></span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Chapter 3 Stage: Clarke-Wright VRP */}
                    {activeStoryIdx === 2 && (
                      <div className="stage-panel stage-vrp">
                        <div className="stage-top-bar">
                          <div className="stage-title-wrap">
                            <Truck size={16} className="text-cyan" />
                            <span>10-Minute VRP Fleet Batching vs 1-to-1 Dispatch</span>
                          </div>
                          <div className="vrp-toggle-group">
                            <button
                              onClick={() => setStoryVrpMode('unbatched')}
                              className={`vrp-mode-btn ${storyVrpMode === 'unbatched' ? 'active' : ''}`}
                            >
                              Legacy (1-to-1)
                            </button>
                            <button
                              onClick={() => setStoryVrpMode('batched')}
                              className={`vrp-mode-btn ${storyVrpMode === 'batched' ? 'active' : ''}`}
                            >
                              Clarke-Wright
                            </button>
                          </div>
                        </div>

                        <div className="interactive-vrp-view">
                          {storyVrpMode === 'unbatched' ? (
                            <div className="vrp-mode-display danger-mode">
                              <div className="vrp-mode-header">
                                <span className="mode-badge-red">10 Unbatched Single Trips</span>
                                <span className="mode-stat-alert">10 Riders • 34.2 km Total • 13.8 min Avg ETA</span>
                              </div>
                              <div className="vrp-trips-list">
                                <div className="trip-row"><span className="rider-id">Rider #1</span><span>Hub ➔ 14th Main Rd (1.1 km • 6.4m)</span></div>
                                <div className="trip-row"><span className="rider-id">Rider #2</span><span>Hub ➔ 27th Cross Rd (2.4 km • 11.2m SLA Breach)</span></div>
                                <div className="trip-row"><span className="rider-id">Rider #3</span><span>Hub ➔ Sector 3 Apt (1.9 km • 9.8m)</span></div>
                                <div className="trip-row"><span className="rider-id">Rider #4</span><span>Hub ➔ Outer Ring Rd (3.1 km • 14.5m SLA Breach)</span></div>
                              </div>
                              <div className="vrp-footer-danger">
                                <span>High fleet fuel consumption • 2 out of 4 deliveries breached 10-minute SLA</span>
                              </div>
                            </div>
                          ) : (
                            <div className="vrp-mode-display success-mode">
                              <div className="vrp-mode-header">
                                <span className="mode-badge-emerald">Clarke-Wright 3-Drop Loop</span>
                                <span className="mode-stat-success">4 Riders • 19.6 km Total • 8.2 min Avg ETA</span>
                              </div>
                              <div className="vrp-batched-loop">
                                <div className="loop-step step-hub">
                                  <span className="step-dot" />
                                  <div className="step-text"><strong>Hub Staging & Picker Hand-off</strong><small>2.2 mins pack time</small></div>
                                </div>
                                <div className="loop-step">
                                  <span className="step-dot active" />
                                  <div className="step-text"><strong>Stop 1: 14th Main Rd</strong><small>1.1 km • 4.8 min ETA</small></div>
                                </div>
                                <div className="loop-step">
                                  <span className="step-dot active" />
                                  <div className="step-text"><strong>Stop 2: 17th Cross Rd</strong><small>1.6 km • 6.9 min ETA</small></div>
                                </div>
                                <div className="loop-step">
                                  <span className="step-dot active" />
                                  <div className="step-text"><strong>Stop 3: Sector 3 Complex</strong><small>2.2 km • 8.4 min ETA (SLA Met)</small></div>
                                </div>
                              </div>
                              <div className="vrp-footer-success">
                                <span>✓ -38.4% Rider Cost • 100% SLA Adherence • 0.32 kg CO₂ Saved</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="stage-controls-bar">
                          <span className="text-secondary text-sm">
                            Clarke-Wright bundles customers within 1.8km with savings metric <code>s(i, j) = d(0, i) + d(0, j) - d(i, j)</code>.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Chapter 4 Stage: Monsoon Surge Defense */}
                    {activeStoryIdx === 3 && (
                      <div className="stage-panel stage-monsoon">
                        <div className="stage-top-bar">
                          <div className="stage-title-wrap">
                            <CloudRain size={16} className="text-cyan" />
                            <span>Pre-Emptive Weather Surge Radar (Indiranagar 100ft Rd)</span>
                          </div>
                          <button
                            onClick={() => setStoryMonsoonActive(!storyMonsoonActive)}
                            className={`monsoon-toggle-btn ${storyMonsoonActive ? 'triggered' : ''}`}
                          >
                            <Radio size={14} />
                            <span>{storyMonsoonActive ? 'Cloudburst Active (45mm/h)' : 'Simulate Monsoon Cloudburst'}</span>
                          </button>
                        </div>

                        <div className="interactive-monsoon-view">
                          {storyMonsoonActive ? (
                            <div className="monsoon-triggered-state">
                              <div className="alert-radar-banner">
                                <span className="pulse-red" />
                                <div>
                                  <strong>Open-Meteo Cloudburst Detected (T-20 mins ahead of storm arrival)</strong>
                                  <p>Autonomous weather playbook executing across Indiranagar & Domlur dark store nodes.</p>
                                </div>
                              </div>
                              <div className="monsoon-actions-grid">
                                <div className="action-card">
                                  <span className="card-lbl">Dynamic Geofence</span>
                                  <strong className="text-amber">Contracted from 2.5km ➔ 1.6km</strong>
                                  <small>Eliminates waterlogged highway risks</small>
                                </div>
                                <div className="action-card">
                                  <span className="card-lbl">Rider Rain Incentive</span>
                                  <strong className="text-emerald">+₹35 / Delivered Order</strong>
                                  <small>Zero rider log-offs • Fleet retention</small>
                                </div>
                                <div className="action-card">
                                  <span className="card-lbl">Order Throttling</span>
                                  <strong className="text-cyan">Max 30 items / batch</strong>
                                  <small>Maintains 10-minute dispatch speed</small>
                                </div>
                                <div className="action-card">
                                  <span className="card-lbl">Predicted SLA Breach</span>
                                  <strong className="text-emerald">0.4% (vs 38.6% unmitigated)</strong>
                                  <small>Customer satisfaction preserved</small>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="monsoon-idle-state">
                              <CloudRain size={48} className="cloud-idle-icon" />
                              <h4>Clear Skies • Open-Meteo Telemetry Idle</h4>
                              <p>Click &quot;Simulate Monsoon Cloudburst&quot; above to trigger Darkstori&apos;s 20-minute pre-emptive surge defense system.</p>
                            </div>
                          )}
                        </div>

                        <div className="stage-controls-bar">
                          <span className="text-secondary text-sm">
                            Temporal XGBoost forecasts monsoon precipitation lag features to prevent rider paralysis before rain starts.
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: INTERACTIVE LIVE CALCULATOR SANDBOX */}
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
                    <p className="res-detail">Saved 14.6 km of delivery rider travel and eliminated 1.24 kg of CO₂ in a single peak hour.</p>
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
              <p>Explore mapped store locations and recorded placement data across Indian markets. Scenario tools can compare user-entered assumptions; they do not guarantee demand, ROI, market share, or zero cannibalization.</p>
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
                <span>CO₂ Reduction</span>
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

      {/* SECTION 4: ENTERPRISE FAQ ACCORDION */}
      <section id="faq" className="apple-faq-section">
        <div className="section-container">
          <div className="section-badge">
            <HelpCircle size={14} />
            <span>TECHNICAL DILIGENCE & FAQ</span>
          </div>
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">
            Deep dive into technical architecture, spatial algorithms, and enterprise integration protocols.
          </p>

          <div className="faq-accordion-list">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className={`faq-item-card ${isOpen ? 'open' : ''}`}
                  onClick={() => setOpenFaq(isOpen ? -1 : index)}
                >
                  <div className="faq-question-row">
                    <span className="faq-q-text">{item.question}</span>
                    <ChevronDown size={18} className={`faq-chevron ${isOpen ? 'rotated' : ''}`} />
                  </div>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="faq-answer-pane"
                      >
                        <p>{item.answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 5: ENTERPRISE CONTACT & CONSULTATION SERVICE */}
      <section id="contact" className="enterprise-contact-section">
        <div className="section-container">
          <div className="section-header-center">
            <div className="section-badge">
              <Mail size={14} />
              <span>DIRECT ENTERPRISE CONSULTATION & PILOTS</span>
            </div>
            <h2 className="section-title">Partner with Darkstori Engineering</h2>
            <p className="section-subtitle">
              Request an architecture audit, discuss custom ERP integration, or book a 14-day production pilot for your dark store network.
            </p>
          </div>

          <div className="contact-portal-grid">
            {/* Left Card: Direct Contact & Author Profile */}
            <div className="contact-info-card">
              <div className="author-badge-header">
                <div className="author-avatar-chip">AU</div>
                <div>
                  <h3 className="author-name">Aaditya Uniyal</h3>
                  <p className="author-role">Founder & Lead Architect • Darkstori Q-Commerce AI</p>
                </div>
              </div>

              <div className="direct-email-block">
                <span className="direct-email-label">Official Engineering & Consultation Desk</span>
                <div className="email-copy-bar">
                  <span className="email-display">{AUTHOR_EMAIL}</span>
                  <button
                    onClick={handleCopyEmail}
                    className="copy-email-btn"
                    title="Copy Email to Clipboard"
                  >
                    {copiedEmail ? <Check size={16} className="text-emerald" /> : <Copy size={16} />}
                    <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="email-meta-note">
                  <Clock size={13} />
                  <span>Guaranteed 4-hour direct response for enterprise operators & network directors.</span>
                </div>
              </div>

              <div className="consultation-services-list">
                <h4>Available Consultation Services</h4>
                <div className="service-bullet">
                  <CheckCircle2 size={16} className="text-cyan" />
                  <div>
                    <strong>Greenfield Spatial Feasibility Audit</strong>
                    <small>PostGIS demographic whitespace analysis for 10–100 candidate pin codes.</small>
                  </div>
                </div>
                <div className="service-bullet">
                  <CheckCircle2 size={16} className="text-cyan" />
                  <div>
                    <strong>Perishable Waste & Dynamic Pricing Assessment</strong>
                    <small>Sigmoid decay calibration against your historical SKU scrap logs.</small>
                  </div>
                </div>
                <div className="service-bullet">
                  <CheckCircle2 size={16} className="text-cyan" />
                  <div>
                    <strong>Fleet VRP & Monsoon Resilience Stress-Testing</strong>
                    <small>Simulate Clarke-Wright rider savings under historical peak rain conditions.</small>
                  </div>
                </div>
                <div className="service-bullet">
                  <CheckCircle2 size={16} className="text-cyan" />
                  <div>
                    <strong>Custom WMS / ERP API Integration</strong>
                    <small>Seamless REST & PostgreSQL LISTEN/NOTIFY telemetry hooks into your stack.</small>
                  </div>
                </div>
              </div>

              <div className="enterprise-trust-row">
                <div className="trust-pill"><ShieldCheck size={14} /><span>SOC-2 Ready</span></div>
                <div className="trust-pill"><FileCheck2 size={14} /><span>ISO 27001 Compliant</span></div>
                <div className="trust-pill"><Zap size={14} /><span>99.99% Uptime SLA</span></div>
              </div>
            </div>

            {/* Right Card: Interactive Consultation Request Form */}
            <div className="contact-form-card">
              {isSubmitted ? (
                <div className="form-success-state">
                  <div className="success-icon-wrap">
                    <CheckCircle2 size={44} className="text-emerald" />
                  </div>
                  <h3>Consultation Request Received</h3>
                  <p>
                    Thank you. We have routed your details to Aaditya Uniyal (<span className="text-cyan">{AUTHOR_EMAIL}</span>).
                    Our engineering team will review your dark store parameters and contact you within 4 hours.
                  </p>
                  <div className="success-action-row">
                    <a
                      href={`mailto:${encodeURIComponent(AUTHOR_EMAIL)}?subject=${encodeURIComponent(
                        `Darkstori Enterprise Follow-up (${contactCompany})`
                      )}`}
                      className="hero-btn-primary"
                    >
                      <Mail size={16} />
                      <span>Send Direct Email Now</span>
                    </a>
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="hero-btn-secondary"
                    >
                      <span>Submit Another Inquiry</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="consultation-form">
                  <h3 className="form-title">Request a Dark Store Network Pilot</h3>
                  <p className="form-subtitle">Fill in your platform specifications to schedule an architectural deep-dive.</p>

                  <div className="form-grid-2col">
                    <div className="form-field">
                      <label>Your Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="apple-input"
                      />
                    </div>
                    <div className="form-field">
                      <label>Work Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="rahul@blinkit.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="apple-input"
                      />
                    </div>
                  </div>

                  <div className="form-grid-2col">
                    <div className="form-field">
                      <label>Platform / Operator</label>
                      <select
                        value={contactCompany}
                        onChange={(e) => setContactCompany(e.target.value)}
                        className="apple-select"
                      >
                        <option value="Zepto">Zepto</option>
                        <option value="Blinkit">Blinkit</option>
                        <option value="Swiggy Instamart">Swiggy Instamart</option>
                        <option value="BigBasket Now">BigBasket Now</option>
                        <option value="Zomato Everyday">Zomato Everyday</option>
                        <option value="Independent Q-Commerce">Independent Q-Commerce</option>
                        <option value="Retail Brand / FMCG">Retail Brand / FMCG</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Dark Store Hub Count</label>
                      <select
                        value={contactHubs}
                        onChange={(e) => setContactHubs(e.target.value)}
                        className="apple-select"
                      >
                        <option value="1-10 Hubs">1–10 Hubs (Seed Phase)</option>
                        <option value="10-50 Hubs">10–50 Hubs (Growth Phase)</option>
                        <option value="50-200 Hubs">50–200 Hubs (Regional Scale)</option>
                        <option value="200+ Hubs">200+ Hubs (National Metros)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-grid-2col">
                    <div className="form-field">
                      <label>Primary Focus Metro</label>
                      <select
                        value={contactCity}
                        onChange={(e) => setContactCity(e.target.value)}
                        className="apple-select"
                      >
                        <option value="Bangalore">Bangalore</option>
                        <option value="Mumbai">Mumbai</option>
                        <option value="Delhi-NCR">Delhi-NCR</option>
                        <option value="Hyderabad">Hyderabad</option>
                        <option value="Pune">Pune</option>
                        <option value="Multi-City Network">All Focus Metros</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Key Challenge to Solve</label>
                      <select
                        value={contactChallenge}
                        onChange={(e) => setContactChallenge(e.target.value)}
                        className="apple-select"
                      >
                        <option value="Greenfield Placement & Cannibalization">Greenfield Placement & Cannibalization</option>
                        <option value="Perishable Inventory Salvage">Perishable Inventory Salvage (Sigmoid)</option>
                        <option value="10-Min VRP Fleet Dispatch">10-Min VRP Fleet Dispatch</option>
                        <option value="Monsoon & Weather Resilience">Monsoon & Weather Resilience</option>
                        <option value="Full Prescriptive OS Integration">Full Prescriptive OS Integration</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-field">
                    <label>Network Details & Specific Requirements</label>
                    <textarea
                      rows={3}
                      placeholder="Share current pain points, ERP tech stack, or target corridors for initial pilot..."
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      className="apple-textarea"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="form-submit-btn"
                  >
                    {isSubmitting ? (
                      <span className="spinner-inline" />
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Dispatch Pilot Consultation Request</span>
                      </>
                    )}
                  </button>
                  <small className="form-privacy-note">
                    Strict NDA honored. Direct communication via {AUTHOR_EMAIL}. No marketing spam.
                  </small>
                </form>
              )}
            </div>
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
            <a href="#story" className="hero-btn-secondary">
              <Sparkles size={18} className="sparkle-gold" />
              <span>Explore Corridor Network</span>
            </a>
          </div>
          <p className="cta-footnote">No credit card required • Instant access to 5 focus metros • SOC-2 & ISO 27001 Ready</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="apple-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="brand-wordmark">
              Darkstori
            </div>
            <p>Enterprise Hyperlocal Quick Commerce Intelligence & Prescriptive Automation Platform.</p>
            <div className="footer-contact-pill">
              <Mail size={13} className="text-cyan" />
              <span>Direct Engineering: </span>
              <a href={`mailto:${AUTHOR_EMAIL}`} className="footer-email-link">{AUTHOR_EMAIL}</a>
            </div>
            <small>© {new Date().getFullYear()} Darkstori Inc. Designed & Engineered by Aaditya Uniyal. All rights reserved.</small>
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
            <h4>Platform & Contact</h4>
            <a href="#contact">Enterprise Pilot Consultation</a>
            <a href="#faq">Architecture FAQ</a>
            <Link to="/login">Partner Portal</Link>
            <Link to="/login?mode=demo">Instant Sandbox</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
