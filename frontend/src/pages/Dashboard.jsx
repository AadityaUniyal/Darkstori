import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  TrendingUp, MapPin, Building2, Zap,
  Star, ChevronRight, AlertTriangle
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
import RangoliGauge from '../components/RangoliGauge';
import './Dashboard.css';

const IMPACT_COLORS = {
  HIGH: 'var(--spice-500)',
  MEDIUM: 'var(--marigold-500)',
  LOW: 'var(--monsoon-500)',
};

const PLATFORM_COLORS = {
  Blinkit: 'var(--marigold-500)',
  Zepto: '#A855F7',
  Instamart: 'var(--saffron-500)',
  'Swiggy Instamart': 'var(--saffron-500)',
  'Swiggy Genie': 'var(--peacock-500)',
};

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

  const handleLiveOrder = (order) => {
    setLiveOrders((prev) => {
      const next = [order, ...prev];
      return next.length > 100 ? next.slice(0, 100) : next;
    });
  };

  return (
    <div className="dashboard">
      <AmbientBackground />

      {/* Inline Fallback Banner */}
      {isUsingFallback && (
        <div style={{
          background: 'var(--peacock-100)',
          borderLeft: '4px solid var(--peacock-500)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.88rem',
          color: 'var(--color-text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: 'var(--space-2)'
        }}>
          <AlertTriangle size={18} color="var(--peacock-500)" />
          <span>Showing sample data — live metrics unavailable</span>
        </div>
      )}

      {/* Header */}
      <motion.div
        className="dash-header"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div>
          <h1 className="dash-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            Intelligence Dashboard
          </h1>
          <p className="dash-subtitle" style={{ fontFamily: 'var(--font-body)' }}>
            Real-time hyperlocal insights across focus cities
          </p>
        </div>
      </motion.div>

      {/* ROW 1: Summary Strip (4 KPI cards) */}
      <StaggerChildren className="dash-kpi-row">
        <AnimatedCounter
          value={summary?.total_stores || 42}
          label="Active Dark Stores"
          icon={Building2}
          color="var(--peacock-500)"
        />
        <AnimatedCounter
          value={summary?.total_neighborhoods || 85}
          label="Neighborhoods Mapped"
          icon={MapPin}
          color="var(--saffron-500)"
        />
        <AnimatedCounter
          value={summary?.total_orders_30d || 118420}
          label="Orders (30 days)"
          icon={Zap}
          color="var(--monsoon-500)"
        />
        <AnimatedCounter
          value={summary?.total_competitive_moves || 24}
          label="Competitor Moves"
          icon={TrendingUp}
          color="var(--spice-500)"
        />
      </StaggerChildren>

      {/* ROW 2: Map + City Pulse (60/40 Split) */}
      <div className="dash-map-row">
        <AnimatedCard className="dash-map-section" delay={0.1}>
          <div className="dash-map-header" style={{ marginBottom: 'var(--space-3)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem' }}>City Coverage Map</h2>
            <div className="dash-map-controls" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className={`btn-secondary ${showHeatmap ? 'active' : ''}`}
                onClick={() => setShowHeatmap((v) => !v)}
                style={{ padding: '4px 12px', fontSize: '0.8rem', borderColor: showHeatmap ? 'var(--peacock-500)' : 'var(--color-border)' }}
              >
                {showHeatmap ? 'Hide' : 'Show'} Heatmap
              </button>
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

        <AnimatedCard className="dash-pulse-section" delay={0.15}>
          <CityPulse />
        </AnimatedCard>
      </div>

      {/* ROW 3: Top Opportunities (3 Columns card grid) */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
          Top Opportunities
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          {topOpps.slice(0, 3).map((opp, idx) => (
            <div
              key={opp.neighborhood_id || idx}
              onClick={() => navigate(`/neighborhoods?city=${opp.city}`)}
              className="glass-card interactive"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {opp.neighborhood_name}
                </span>
                <span className="badge badge-success" style={{ alignSelf: 'flex-start', background: 'var(--peacock-100)', color: 'var(--peacock-500)', border: 'none' }}>
                  {opp.city}
                </span>
              </div>
              <RangoliGauge value={opp.opportunity_score} max={10} type="opportunity" size={64} />
            </div>
          ))}
        </div>
      </div>

      {/* ROW 4: Platform Sentiment & Recent Competitor Moves */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
        {/* Platform Sentiment using stacked bar chart */}
        <AnimatedCard className="dash-card" delay={0.2}>
          <div className="dash-card-header" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>Platform Sentiment</h2>
            <span className="badge" style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>Last 30 days</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sentiment.map((s) => (
              <div key={s.platform} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                  <span style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                    {s.platform}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: s.avg_sentiment > 0 ? 'var(--monsoon-500)' : 'var(--spice-500)', fontWeight: 600 }}>
                    {s.avg_sentiment > 0 ? '+' : ''}{s.avg_sentiment.toFixed(2)}
                  </span>
                </div>
                {/* Stacked bar */}
                <div style={{ height: '8px', background: 'var(--color-border)', borderRadius: 'var(--radius-full)', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${s.positive_pct}%`, background: 'var(--monsoon-500)' }} />
                  <div style={{ width: `${100 - s.positive_pct - s.negative_pct}%`, background: 'var(--color-text-muted)', opacity: 0.2 }} />
                  <div style={{ width: `${s.negative_pct}%`, background: 'var(--spice-500)' }} />
                </div>
              </div>
            ))}
          </div>
        </AnimatedCard>

        {/* Competitor Alerts */}
        <AnimatedCard className="dash-card" delay={0.25}>
          <div className="dash-card-header" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>Competitor Alerts</h2>
            <span className="badge" style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>Last 7 days</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {competitiveMoves.slice(0, 3).map((move) => {
              const badgeColor = IMPACT_COLORS[move.impact_level] || 'var(--color-text-muted)';
              const platformColor = PLATFORM_COLORS[move.platform] || 'var(--color-text-muted)';
              return (
                <div
                  key={move.move_id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge" style={{ background: `${platformColor}15`, color: platformColor, border: `1px solid ${platformColor}30` }}>
                      {move.platform}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: badgeColor }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: badgeColor, fontWeight: 700 }}>
                        {move.impact_level} IMPACT
                      </span>
                    </div>
                  </div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                    {move.description}
                  </p>
                </div>
              );
            })}
          </div>
        </AnimatedCard>
      </div>

      {/* ROW 5: Market Evolution (Time Machine) */}
      <AnimatedCard as="section" className="dash-pulse-section" delay={0.3}>
        <div className="section-header">
          <div className="section-header-left">
            <div className="section-header-icon">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>Market Evolution</h2>
              <p className="section-header-subtitle">Time Machine · scrub through market growth since 2020</p>
            </div>
          </div>
        </div>
        <TimeMachine height={360} />
      </AnimatedCard>

      {/* ROW 6: SLA Monitor */}
      <AnimatedCard as="section" className="dash-pulse-section" delay={0.35}>
        <div className="section-header">
          <div className="section-header-left">
            <div className="section-header-icon">
              <Zap size={18} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>Delivery SLA Monitor</h2>
              <p className="section-header-subtitle">Pincode-level delivery performance · breach rate tracking</p>
            </div>
          </div>
        </div>
        <SLAHeatmap />
      </AnimatedCard>

      {/* ROW 7: Cohort Dashboard */}
      <AnimatedCard as="section" className="dash-pulse-section" delay={0.4}>
        <div className="section-header">
          <div className="section-header-left">
            <div className="section-header-icon">
              <Building2 size={18} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>Customer Cohort Dashboard</h2>
              <p className="section-header-subtitle">Retention analytics · user lifecycle tracking</p>
            </div>
          </div>
        </div>
        <CohortDashboard />
      </AnimatedCard>
    </div>
  );
}
