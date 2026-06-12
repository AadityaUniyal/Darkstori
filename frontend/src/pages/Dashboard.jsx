import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  TrendingUp, MapPin, Building2, Zap,
  Star, ChevronRight,
} from 'lucide-react';
import { api } from '../services/api';
import MapView from '../components/MapView';
import LiveTracker from '../components/LiveTracker';
import CityPulse from '../components/CityPulse';
import TimeMachine from '../components/TimeMachine';
import SLAHeatmap from '../components/SLAHeatmap';
import CohortDashboard from '../components/CohortDashboard';
import AmbientBackground from '../components/AmbientBackground';
import AnimatedCounter from '../components/AnimatedCounter';
import AnimatedCard from '../components/AnimatedCard';
import StaggerChildren from '../components/StaggerChildren';
import './Dashboard.css';

const CITY_EMOJI = {
  Bangalore: '\u{1F306}', Delhi: '\u{1F3DB}', Mumbai: '\u{1F30A}', Hyderabad: '\u{1F48E}', Pune: '\u{1F393}',
};
const CITY_EMOJI_DEFAULT = '\u{1F4CD}';

const IMPACT_COLOR = { HIGH: '#fa709a', MEDIUM: '#f6d365', LOW: '#43e97b' };

const FALLBACK_METRICS = {
  summary: {
    total_stores: 42,
    total_neighborhoods: 85,
    total_orders_30d: 118420,
    total_competitive_moves: 24,
  },
  city_overview: [
    { city: 'Bangalore', store_count: 12, neighborhood_count: 24, avg_opportunity_score: 8.2 },
    { city: 'Delhi', store_count: 8, neighborhood_count: 16, avg_opportunity_score: 7.1 },
    { city: 'Mumbai', store_count: 10, neighborhood_count: 20, avg_opportunity_score: 7.8 },
    { city: 'Hyderabad', store_count: 7, neighborhood_count: 15, avg_opportunity_score: 8.0 },
    { city: 'Pune', store_count: 5, neighborhood_count: 10, avg_opportunity_score: 7.4 },
  ],
  top_opportunities: [
    { neighborhood_id: 1, neighborhood_name: 'Koramangala', city: 'Bangalore', opportunity_score: 9.2 },
    { neighborhood_id: 2, neighborhood_name: 'Indiranagar', city: 'Bangalore', opportunity_score: 8.9 },
    { neighborhood_id: 3, neighborhood_name: 'HSR Layout', city: 'Bangalore', opportunity_score: 8.2 },
    { neighborhood_id: 4, neighborhood_name: 'Saket', city: 'Delhi', opportunity_score: 9.0 },
    { neighborhood_id: 5, neighborhood_name: 'Hitech City', city: 'Hyderabad', opportunity_score: 8.8 },
    { neighborhood_id: 6, neighborhood_name: 'Andheri West', city: 'Mumbai', opportunity_score: 8.5 },
  ],
  sentiment: [
    { platform: 'Instamart', positive_pct: 68, negative_pct: 12, avg_sentiment: 0.56 },
    { platform: 'Zepto', positive_pct: 72, negative_pct: 10, avg_sentiment: 0.62 },
    { platform: 'Blinkit', positive_pct: 61, negative_pct: 18, avg_sentiment: 0.43 },
    { platform: 'Swiggy Genie', positive_pct: 54, negative_pct: 22, avg_sentiment: 0.32 },
  ],
  recent_competitive_moves: {
    moves: [
      { move_id: 1, platform: 'Zepto', move_type: 'payout_increase', description: 'Increased rider payout structure by 12% in Koramangala.', city: 'Bangalore', impact_level: 'HIGH' },
      { move_id: 2, platform: 'Blinkit', move_type: 'dark_store_launch', description: 'Opened a new large-format dark store in Rohini.', city: 'Delhi', impact_level: 'MEDIUM' },
      { move_id: 3, platform: 'Instamart', move_type: 'free_delivery_promo', description: 'Launched a free delivery promo for orders above ₹99 in Powai.', city: 'Mumbai', impact_level: 'LOW' },
    ]
  }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [liveOrders, setLiveOrders] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const { data: metrics, isError } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: api.getDashboardMetrics,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  const isUsingFallback = !metrics || isError;
  const displayMetrics = metrics || FALLBACK_METRICS;
  const summary = displayMetrics.summary;
  const cities = displayMetrics.city_overview || [];
  const topOpps = displayMetrics.top_opportunities || [];
  const sentiment = displayMetrics.sentiment || [];
  const competitiveMoves = displayMetrics.recent_competitive_moves?.moves || [];

  // Capture live orders for the map
  const handleLiveOrder = (order) => {
    setLiveOrders((prev) => {
      const next = [order, ...prev];
      return next.length > 100 ? next.slice(0, 100) : next;
    });
  };

  return (
    <div className="dashboard">
      <AmbientBackground />

      {/* Header */}
      <motion.div
        className="dash-header"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 className="dash-title">Intelligence Dashboard</h1>
            {isUsingFallback && (
              <span style={{
                background: 'rgba(251, 191, 36, 0.12)',
                border: '1px solid rgba(251, 191, 36, 0.25)',
                color: '#fbbf24',
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: '9999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                DEMO MODE — Connect database for real data
              </span>
            )}
          </div>
          <p className="dash-subtitle">
            Real-time hyperlocal insights across 5 focus cities
          </p>
        </div>
      </motion.div>

      <StaggerChildren className="dash-kpi-row">
        <AnimatedCounter
          value={summary?.total_stores || 0}
          label="Active Dark Stores"
          icon={Building2}
          color="#f6d365"
        />
        <AnimatedCounter
          value={summary?.total_neighborhoods || 0}
          label="Neighborhoods Mapped"
          icon={MapPin}
          color="#667eea"
        />
        <AnimatedCounter
          value={summary?.pincode_coverage_rate || 0}
          label="PIN Code Coverage"
          icon={MapPin}
          color="#a855f7"
          suffix="%"
        />
        <AnimatedCounter
          value={summary?.total_orders_30d || 0}
          label="Orders (30 days)"
          icon={Zap}
          color="#43e97b"
        />
        <AnimatedCounter
          value={summary?.total_competitive_moves || 0}
          label="Competitor Moves"
          icon={TrendingUp}
          color="#fa709a"
        />
      </StaggerChildren>

      {/* ── Living City Pulse ────────────────────────────────────── */}
      <AnimatedCard as="section" className="dash-pulse-section" delay={0.1}>
        <div className="section-header">
          <div className="section-header-left">
            <div className="section-header-icon">
              <MapPin size={18} />
            </div>
            <div>
              <h2>Living City Pulse</h2>
              <p className="section-header-subtitle">3D real-time store activity · auto-rotating</p>
            </div>
          </div>
        </div>
        <CityPulse height={420} />
      </AnimatedCard>

      {/* ── Time Machine ──────────────────────────────────────────── */}
      <AnimatedCard as="section" className="dash-pulse-section" delay={0.15}>
        <div className="section-header">
          <div className="section-header-left">
            <div className="section-header-icon">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2>Market Evolution</h2>
              <p className="section-header-subtitle">Time Machine · scrub through market growth since 2020</p>
            </div>
          </div>
        </div>
        <TimeMachine height={360} />
      </AnimatedCard>

      {/* ── Map + Live Tracker Row ────────────────────────────────── */}
      <motion.div
        className="dash-map-row"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <AnimatedCard className="dash-map-section" delay={0.25}>
          <div className="dash-map-header">
            <h2>City Coverage Map</h2>
            <div className="dash-map-controls">
              <button
                className={`dash-heat-toggle ${showHeatmap ? 'active' : ''}`}
                onClick={() => setShowHeatmap((v) => !v)}
              >
                {showHeatmap ? 'Hide' : '3D'} Heatmap
              </button>
              <span className="dash-card-tag">{cities.length} cities</span>
            </div>
          </div>
          <MapView
            neighborhoods={topOpps.map((o) => ({ ...o, city: o.city || 'Bangalore' }))}
            center={[20.0, 77.0]}
            zoom={5}
            height="400px"
            liveOrders={liveOrders}
            showHeatmap={showHeatmap}
            onSelect={(nb) => navigate(`/neighborhoods?city=${nb.city || 'Bangalore'}`)}
          />
        </AnimatedCard>
        <div className="dash-live-section">
          <LiveTracker onOrder={handleLiveOrder} />
        </div>
      </motion.div>

      {/* ── Two Column: Cities + Opportunities ────────────────────── */}
      <StaggerChildren className="dash-grid">
        <AnimatedCard as="section" className="dash-card" delay={0.1}>
          <div className="dash-card-header">
            <h2>Focus Cities</h2>
            <span className="dash-card-tag">{cities.length} active</span>
          </div>
          <div className="dash-city-list">
            {cities.map((c) => (
              <div
                key={c.city}
                className="dash-city-row"
                onClick={() => navigate(`/neighborhoods?city=${c.city}`)}
              >
                <span className="dash-city-emoji">{CITY_EMOJI[c.city] || CITY_EMOJI_DEFAULT}</span>
                <div className="dash-city-info">
                  <span className="dash-city-name">{c.city}</span>
                  <span className="dash-city-stats">
                    {c.store_count} stores · {c.neighborhood_count} nbhds
                  </span>
                </div>
                <div className="dash-city-score">
                  <Star size={14} />
                  <span>{(c.avg_opportunity_score || 0).toFixed(1)}</span>
                </div>
                <ChevronRight size={16} className="dash-city-arrow" />
              </div>
            ))}
          </div>
        </AnimatedCard>

        <AnimatedCard as="section" className="dash-card dash-opportunities" delay={0.15}>
          <div className="dash-card-header">
            <h2>Top Opportunities</h2>
            <span className="dash-card-tag">Highest score</span>
          </div>
          {topOpps.length === 0 ? (
            <div className="dash-opps-empty">
              <MapPin size={24} />
              <p>No opportunities found.</p>
            </div>
          ) : (
            <div className="dash-opps-list">
              {topOpps.slice(0, 5).map((opp, i) => (
                <div key={opp.neighborhood_name || opp.neighborhood_id || i} className="dash-opp-row">
                  <span className="dash-opp-rank">#{i + 1}</span>
                  <div className="dash-opp-info">
                    <span className="dash-opp-name">{opp.neighborhood_name}</span>
                    <span className="dash-opp-city">{opp.city || 'Bangalore'}</span>
                  </div>
                  <div className="dash-opp-bar-wrap">
                    <div
                      className="dash-opp-bar"
                      style={{
                        width: `${Math.min((opp.opportunity_score || 0) * 10, 100)}%`,
                        background: opp.opportunity_score > 7
                          ? 'linear-gradient(90deg, #43e97b, #38f9d7)'
                          : 'linear-gradient(90deg, #f6d365, #fda085)',
                      }}
                    />
                  </div>
                  <span className="dash-opp-score">{(opp.opportunity_score || 0).toFixed(1)}</span>
                  <button
                    className="dash-opp-sim"
                    onClick={() => navigate(`/simulator?nbhd=${opp.neighborhood_name}`)}
                  >
                    Simulate
                  </button>
                </div>
              ))}
            </div>
          )}
        </AnimatedCard>
      </StaggerChildren>

      {/* ── SLA Heatmap ─────────────────────────────────────────────── */}
      <AnimatedCard as="section" className="dash-pulse-section" delay={0.2}>
        <div className="section-header">
          <div className="section-header-left">
            <div className="section-header-icon">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2>Delivery SLA Monitor</h2>
              <p className="section-header-subtitle">Pincode-level delivery performance · breach rate tracking</p>
            </div>
          </div>
        </div>
        <SLAHeatmap />
      </AnimatedCard>

      {/* ── Cohort Dashboard ─────────────────────────────────────────── */}
      <AnimatedCard as="section" className="dash-pulse-section" delay={0.25}>
        <div className="section-header">
          <div className="section-header-left">
            <div className="section-header-icon">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2>Customer Cohort Dashboard</h2>
              <p className="section-header-subtitle">Retention analytics · user lifecycle tracking</p>
            </div>
          </div>
        </div>
        <CohortDashboard />
      </AnimatedCard>

      {/* ── Bottom Row: Sentiment + Alerts ────────────────────────── */}
      <StaggerChildren className="dash-grid">
        <AnimatedCard as="section" className="dash-card" delay={0.1}>
          <div className="dash-card-header">
            <h2>Platform Sentiment</h2>
            <span className="dash-card-tag">Last 30 days</span>
          </div>
          <div className="dash-sentiment">
            {sentiment.length === 0
              ? <p className="dash-empty-text">No sentiment data available.</p>
              : sentiment.map((s) => (
                <div key={s.platform} className="dash-sent-row">
                  <span className="dash-sent-platform">{s.platform}</span>
                  <div className="dash-sent-bar-wrap">
                    <div className="dash-sent-bar-track">
                      <div className="dash-sent-positive" style={{ width: `${s.positive_pct}%` }} />
                      <div className="dash-sent-negative" style={{ width: `${s.negative_pct}%` }} />
                    </div>
                  </div>
                  <span className="dash-sent-score" style={{ color: s.avg_sentiment > 0 ? '#43e97b' : '#fa709a' }}>
                    {s.avg_sentiment > 0 ? '+' : ''}{s.avg_sentiment.toFixed(2)}
                  </span>
                </div>
              ))}
          </div>
        </AnimatedCard>

        <AnimatedCard as="section" className="dash-card dash-alerts" delay={0.2}>
          <div className="dash-card-header">
            <h2>Competitor Alerts</h2>
            <span className="dash-card-tag">Last 7 days</span>
          </div>
          {competitiveMoves.length === 0 ? (
            <div className="dash-alerts-empty">
              <TrendingUp size={24} className="dash-alerts-empty-icon" />
              <p>No competitor moves detected.</p>
            </div>
          ) : (
            <div className="dash-alerts-list">
              {competitiveMoves.slice(0, 5).map((m) => (
                <div key={m.move_id} className="dash-alert-row">
                  <div className="dash-alert-impact" style={{ background: IMPACT_COLOR[m.impact_level] + '20', color: IMPACT_COLOR[m.impact_level] }}>
                    {m.impact_level}
                  </div>
                  <div className="dash-alert-info">
                    <span className="dash-alert-title">{m.platform} — {m.move_type?.replace('_', ' ')}</span>
                    <span className="dash-alert-desc">{m.description}</span>
                  </div>
                  <span className="dash-alert-city">{m.city}</span>
                </div>
              ))}
            </div>
          )}
        </AnimatedCard>
      </StaggerChildren>
    </div>
  );
}
