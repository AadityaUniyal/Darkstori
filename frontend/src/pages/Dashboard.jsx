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
import { ZERO_DASHBOARD_METRICS } from '../constants/fallbacks';
import QuickSetupWizard from '../components/QuickSetupWizard';
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

const FALLBACK_METRICS = ZERO_DASHBOARD_METRICS;

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

  const displayMetrics = metrics || FALLBACK_METRICS;
  const summary = displayMetrics.summary || { total_stores: 0, total_neighborhoods: 0, total_orders_30d: 0, total_competitive_moves: 0 };
  const cities = displayMetrics.city_overview || [];
  const topOpps = displayMetrics.top_opportunities || [];
  const sentiment = displayMetrics.sentiment || [];
  const competitiveMoves = displayMetrics.recent_competitive_moves?.moves || [];

  const isCleanZeroState = !isLoading && (summary.total_stores === 0 && topOpps.length === 0);

  const handleLiveOrder = (order) => {
    setLiveOrders((prev) => {
      const next = [order, ...prev];
      return next.length > 100 ? next.slice(0, 100) : next;
    });
  };

  const [activeSection, setActiveSection] = useState('opportunities'); // 'opportunities' | 'dispatch' | 'sla' | 'growth'

  return (
    <div className="dashboard">
      <AmbientBackground />

      {/* Weather Forecast Alert Banner */}
      {weatherAlert?.alert && (
        <div style={{
          background: 'rgba(0, 113, 227, 0.1)',
          borderLeft: '4px solid #0071E3',
          border: '1px solid rgba(0, 113, 227, 0.2)',
          padding: '14px 18px',
          borderRadius: '12px',
          fontSize: '0.9rem',
          color: 'var(--color-text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          backdropFilter: 'blur(10px)'
        }}>
          <CloudRain size={20} color="#0071E3" style={{ animation: 'pulse 2s infinite' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontWeight: 700, color: '#38BDF8' }}>Hyperlocal Weather Advisory</span>
            <span style={{ fontSize: '0.84rem', color: 'var(--color-text-primary)' }}>
              {weatherAlert.alert}
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
            Real-time network telemetry, demand heatmaps, and prescriptive actions
          </p>
        </div>
      </motion.div>

      {/* Quick Setup Onboarding for New Accounts or Zero-Stores */}
      {isCleanZeroState && (
        <QuickSetupWizard
          totalStores={summary.total_stores}
          totalBatches={0}
          totalPlaybooks={0}
        />
      )}

      {/* ROW 1: Summary Strip (4 KPI cards) */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[100px] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <StaggerChildren className="dash-kpi-row">
          <AnimatedCounter
            value={summary.total_stores ?? 0}
            label="Active Dark Stores"
            icon={Building2}
            color="#0071E3"
          />
          <AnimatedCounter
            value={summary.total_neighborhoods ?? 0}
            label="Neighborhoods Mapped"
            icon={MapPin}
            color="#38BDF8"
          />
          <AnimatedCounter
            value={summary.total_orders_30d ?? 0}
            label="Orders (30 days)"
            icon={Zap}
            color="#34C759"
          />
          <AnimatedCounter
            value={summary.total_competitive_moves ?? 0}
            label="Competitor Signals"
            icon={TrendingUp}
            color="#FF9500"
          />
        </StaggerChildren>
      )}

      {/* ROW 2: Map + City Pulse (60/40 Split) */}
      <div className="dash-map-row" style={{ marginBottom: '24px' }}>
        <AnimatedCard className="dash-map-section" delay={0.1}>
          <div className="dash-map-header" style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', margin: 0 }}>City Coverage Map</h2>
            <div className="dash-map-controls" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className={`btn-secondary ${showHeatmap ? 'active' : ''}`}
                onClick={() => setShowHeatmap((v) => !v)}
                style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '10px', borderColor: showHeatmap ? '#0071E3' : 'rgba(255,255,255,0.1)' }}
              >
                {showHeatmap ? 'Hide Opportunity Layer' : 'Show Opportunity Layer'}
              </button>
            </div>
          </div>
          <LazyMapView
            neighborhoods={topOpps.map((o) => ({ ...o, city: o.city || 'Focus Market' }))}
            height="420px"
            liveOrders={liveOrders}
            showHeatmap={showHeatmap}
            onSelect={(nb) => navigate(`/neighborhoods?city=${nb.city || 'Focus Market'}`)}
          />
        </AnimatedCard>

        <AnimatedCard className="dash-pulse-section" delay={0.15}>
          <CityPulse />
        </AnimatedCard>
      </div>

      {/* ROW 3: Segmented Intelligence Switcher */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '6px', background: '#0E121A', padding: '5px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', width: 'fit-content' }}>
          <button
            onClick={() => setActiveSection('opportunities')}
            style={{
              padding: '8px 18px',
              fontSize: '0.84rem',
              fontWeight: 600,
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              background: activeSection === 'opportunities' ? '#0071E3' : 'transparent',
              color: activeSection === 'opportunities' ? '#FFFFFF' : 'var(--color-text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            Market Opportunities & Intel
          </button>
          <button
            onClick={() => setActiveSection('dispatch')}
            style={{
              padding: '8px 18px',
              fontSize: '0.84rem',
              fontWeight: 600,
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              background: activeSection === 'dispatch' ? '#0071E3' : 'transparent',
              color: activeSection === 'dispatch' ? '#FFFFFF' : 'var(--color-text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            Weather Radar & Dispatch
          </button>
          <button
            onClick={() => setActiveSection('sla')}
            style={{
              padding: '8px 18px',
              fontSize: '0.84rem',
              fontWeight: 600,
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              background: activeSection === 'sla' ? '#0071E3' : 'transparent',
              color: activeSection === 'sla' ? '#FFFFFF' : 'var(--color-text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            Service Level SLAs
          </button>
          <button
            onClick={() => setActiveSection('growth')}
            style={{
              padding: '8px 18px',
              fontSize: '0.84rem',
              fontWeight: 600,
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              background: activeSection === 'growth' ? '#0071E3' : 'transparent',
              color: activeSection === 'growth' ? '#FFFFFF' : 'var(--color-text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            Growth & Customer Lifecycle
          </button>
        </div>

        {/* Section 1: Market Opportunities & Intel */}
        {activeSection === 'opportunities' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>
                High-Potential Expansion Hubs
              </h2>
              {isLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[180px] w-full rounded-xl" />
                  ))}
                </div>
              ) : topOpps.length === 0 ? (
                <EmptyState title="No opportunities found" description="No top market opportunities available for the selected city." />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
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
                          padding: '16px',
                          borderRadius: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {opp.neighborhood_name}
                          </span>
                          <span className="badge badge-success" style={{ alignSelf: 'flex-start', background: 'rgba(0, 113, 227, 0.15)', color: '#38BDF8', border: 'none' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <AnimatedCard className="dash-card" delay={0.2}>
                <div className="dash-card-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Customer Sentiment by Platform</h2>
                  <span className="badge" style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>30-Day Window</span>
                </div>
                {isLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-[48px] w-full rounded-md" />
                    ))}
                  </div>
                ) : sentiment.length === 0 ? (
                  <EmptyState title="No sentiment data" description="No customer platform sentiment recorded." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {sentiment.map((s) => (
                      <div key={s.platform} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                          <span style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                            {s.platform}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: s.avg_sentiment > 0 ? '#34C759' : '#FF3B30', fontWeight: 600 }}>
                            {s.avg_sentiment > 0 ? '+' : ''}{s.avg_sentiment.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ height: '8px', background: 'var(--color-border)', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                          <div style={{ width: `${s.positive_pct}%`, background: '#34C759' }} />
                          <div style={{ width: `${100 - s.positive_pct - s.negative_pct}%`, background: 'rgba(255,255,255,0.1)' }} />
                          <div style={{ width: `${s.negative_pct}%`, background: '#FF3B30' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AnimatedCard>

              <AnimatedCard className="dash-card" delay={0.25}>
                <div className="dash-card-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Competitor Movement Alerts</h2>
                  <span className="badge" style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>Recent 7 Days</span>
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
                      const badgeColor = IMPACT_COLORS[move.impact_level] || '#86868B';
                      const platformColor = PLATFORM_COLORS[move.platform] || '#0071E3';
                      return (
                        <div
                          key={move.move_id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="badge" style={{ background: `${platformColor}20`, color: platformColor, border: `1px solid ${platformColor}40` }}>
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
          </div>
        )}

        {/* Section 2: Weather Radar & Dispatch */}
        {activeSection === 'dispatch' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            <WeatherRadarCard storeId={activeStoreId} />
            <VrpDispatchCard storeId={activeStoreId} />
          </div>
        )}

        {/* Section 3: SLA Monitor */}
        {activeSection === 'sla' && (
          <AnimatedCard as="section" className="dash-pulse-section">
            <div className="section-header" style={{ marginBottom: '16px' }}>
              <div className="section-header-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="section-header-icon" style={{ background: 'rgba(0, 113, 227, 0.15)', color: '#0071E3', padding: '8px', borderRadius: '10px' }}>
                  <Zap size={18} />
                </div>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Delivery SLA Performance Monitor</h2>
                  <p className="section-header-subtitle" style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>Neighborhood-level delivery performance and on-time reliability</p>
                </div>
              </div>
            </div>
            <SLAHeatmap />
          </AnimatedCard>
        )}

        {/* Section 4: Growth & Customer Lifecycle */}
        {activeSection === 'growth' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <AnimatedCard as="section" className="dash-pulse-section">
              <div className="section-header" style={{ marginBottom: '16px' }}>
                <div className="section-header-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="section-header-icon" style={{ background: 'rgba(0, 113, 227, 0.15)', color: '#0071E3', padding: '8px', borderRadius: '10px' }}>
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Market Evolution & Growth Simulation</h2>
                    <p className="section-header-subtitle" style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>Explore multi-year market expansion and store density evolution</p>
                  </div>
                </div>
              </div>
              <TimeMachine height={360} />
            </AnimatedCard>

            <AnimatedCard as="section" className="dash-pulse-section">
              <div className="section-header" style={{ marginBottom: '16px' }}>
                <div className="section-header-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="section-header-icon" style={{ background: 'rgba(52, 199, 89, 0.15)', color: '#34C759', padding: '8px', borderRadius: '10px' }}>
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Customer Cohort & Retention Dashboard</h2>
                    <p className="section-header-subtitle" style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>Longitudinal order frequency, retention cohorts, and user lifecycle health</p>
                  </div>
                </div>
              </div>
              <CohortDashboard />
            </AnimatedCard>
          </div>
        )}
      </div>
    </div>
  );
}
