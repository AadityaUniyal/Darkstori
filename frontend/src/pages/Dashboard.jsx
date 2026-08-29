import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  TrendingUp, MapPin, Building2, Zap,
  Star, ChevronRight, AlertTriangle, CloudRain
} from 'lucide-react';
import { api } from '../services/api';
import { useCity } from '../context/CityContext';
import LazyMapView from '../components/LazyMapView';
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
import MoodGauge from '../components/MoodGauge';
import WeatherRadarCard from '../components/WeatherRadarCard';
import VrpDispatchCard from '../components/VrpDispatchCard';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/empty-state';
import { FALLBACK_DASHBOARD_METRICS } from '../constants/fallbacks';
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

const FALLBACK_METRICS = FALLBACK_DASHBOARD_METRICS;

export default function Dashboard() {
  const navigate = useNavigate();
  const [liveOrders, setLiveOrders] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const { selectedCity } = useCity();

  // Fetch first store in the selected city to get weather details
  const { data: stores = [] } = useQuery({
    queryKey: ['stores-list', selectedCity],
    queryFn: () => api.getStores({ city: selectedCity, limit: 1 }),
    enabled: !!selectedCity,
  });

  const activeStoreId = stores[0]?.id;

  // Fetch weather alerts
  const { data: weatherAlert } = useQuery({
    queryKey: ['weather-alert', activeStoreId],
    queryFn: () => api.getStoreWeatherAlert(activeStoreId),
    enabled: !!activeStoreId,
    refetchInterval: 15 * 60 * 1000,
  });

  const { data: metrics, isError, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: api.getDashboardMetrics,
    staleTime: Infinity, // Now driven purely by WebSockets
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

      {/* Weather Forecast Alert Banner */}
      {weatherAlert?.alert && (
        <div style={{
          background: 'rgba(235, 94, 85, 0.1)',
          borderLeft: '4px solid var(--saffron-500)',
          border: '1px solid rgba(235, 94, 85, 0.15)',
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.9rem',
          color: 'var(--color-text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: 'var(--space-4)',
          backdropFilter: 'blur(10px)'
        }}>
          <CloudRain size={20} color="var(--saffron-500)" style={{ animation: 'pulse 2s infinite' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontWeight: 700, color: 'var(--saffron-500)' }}>Hyperlocal Weather Alert</span>
            <span style={{ fontSize: '0.84rem', color: 'var(--color-text-primary)' }}>
              {weatherAlert.alert}
              <span style={{ marginLeft: '8px', fontSize: '0.68rem', background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)', padding: '2px 6px', borderRadius: '4px' }}>
                [Open-Meteo Forecast]
              </span>
            </span>
          </div>
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
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[100px] w-full rounded-xl" />
          ))}
        </div>
      ) : (
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
      )}

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
          <LazyMapView
            neighborhoods={topOpps.map((o) => ({ ...o, city: o.city || 'Sample Market' }))}
            center={[20.0, 77.0]}
            zoom={5}
            height="400px"
            liveOrders={liveOrders}
            showHeatmap={showHeatmap}
            onSelect={(nb) => navigate(`/neighborhoods?city=${nb.city || 'Sample Market'}`)}
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
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[180px] w-full rounded-xl" />
            ))}
          </div>
        ) : topOpps.length === 0 ? (
          <EmptyState title="No opportunities found" description="No top market opportunities available for the selected city." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
            {topOpps.slice(0, 3).map((opp, idx) => (
              <div key={opp.neighborhood_id || idx} className="space-y-4">
                <div
                  onClick={() => navigate(`/neighborhoods?city=${opp.city}`)}
                  className="glass-card interactive"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    margin: 0,
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
                <MoodGauge neighborhoodId={opp.neighborhood_id} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ROW 4: Platform Sentiment & Recent Competitor Moves */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
        {/* Platform Sentiment using stacked bar chart */}
        <AnimatedCard className="dash-card" delay={0.2}>
          <div className="dash-card-header" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>Platform Sentiment</h2>
            <span className="badge" style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>Last 30 days</span>
          </div>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[48px] w-full rounded-md" />
              ))}
            </div>
          ) : sentiment.length === 0 ? (
            <EmptyState title="No sentiment data" description="No customer platform sentiment recorded for the last 30 days." />
          ) : (
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
          )}
        </AnimatedCard>

        {/* Competitor Alerts */}
        <AnimatedCard className="dash-card" delay={0.25}>
          <div className="dash-card-header" style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              Competitor Alerts
              <span style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--color-text-muted)', marginLeft: '8px', verticalAlign: 'middle', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                [OSM Data]
              </span>
            </h2>
            <span className="badge" style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>Last 7 days</span>
          </div>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[64px] w-full rounded-md" />
              ))}
            </div>
          ) : competitiveMoves.length === 0 ? (
            <EmptyState title="No competitor alerts" description="No recent competitor moves detected." />
          ) : (
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
          )}
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

      {/* ROW 5.5: Hyperlocal Weather Radar & VRP Dispatch Command */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <WeatherRadarCard storeId={activeStoreId} />
        <VrpDispatchCard storeId={activeStoreId} />
      </div>

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
