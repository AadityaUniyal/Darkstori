import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, MapPin, Building2, Zap, CloudRain,
  Eye, Compass, ShieldCheck, Clock, Percent, ArrowRight,
  Sparkles, Layers, Sliders, CheckCircle2, ChevronRight,
  BarChart2, Radio, Activity, AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { useCity } from '../context/CityContext';
import { useRole } from '../context/RoleContext';
import LazyMapView from '../components/LazyMapView';
import LiveTracker from '../components/LiveTracker';
import CityPulse from '../components/CityPulse';
import WeatherRadarCard from '../components/WeatherRadarCard';
import VrpDispatchCard from '../components/VrpDispatchCard';
import ExecutiveRoiBanner from '../components/ExecutiveRoiBanner';
import DecisionQueue from '../components/DecisionQueue';
import DarkStorePipelineMonitor from '../components/DarkStorePipelineMonitor';
import DarkStoreDigitalTwin from '../components/DarkStoreDigitalTwin';
import GodsEyeWarRoom from '../components/GodsEyeWarRoom';
import ApplePersonaSelector from '../components/ApplePersonaSelector';
import AppleDynamicIsland from '../components/AppleDynamicIsland';
import AmbientBackground from '../components/AmbientBackground';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/empty-state';
import QuickSetupWizard from '../components/QuickSetupWizard';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [liveOrders, setLiveOrders] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const { currentCity: selectedCity } = useCity();
  const { activeRole, setRole: setGlobalRole } = useRole();
  const [activePersona, setActivePersona] = useState(activeRole || 'executive');
  const [primaryCanvas, setPrimaryCanvas] = useState(
    activeRole === 'store-gm' ? 'digital-twin' : activeRole === 'fleet-commander' ? 'war-room' : 'map'
  );
  const [deepAnalyticsTab, setDeepAnalyticsTab] = useState('roi'); // 'roi' | 'sentiment' | 'pipeline'

  // Fetch store list to get active store ID
  const { data: stores = [] } = useQuery({
    queryKey: ['stores-list', selectedCity, 'physical-stores-only'],
    queryFn: () => api.getStores({ city: selectedCity, include_competitors: false }),
  });
  const activeStoreId = stores?.[0]?.id || null;

  // Fetch weather alerts
  const { data: weatherAlert } = useQuery({
    queryKey: ['weather-alert', activeStoreId],
    queryFn: () => api.getStoreWeatherAlert(activeStoreId),
    enabled: !!activeStoreId,
    refetchInterval: 15 * 60 * 1000,
  });

  const { data: metrics, isLoading, isError: metricsError } = useQuery({
    queryKey: ['dashboard-metrics', selectedCity],
    queryFn: () => api.getDashboardMetrics(selectedCity),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const displayMetrics = metrics || {};
  const summary = displayMetrics.summary || {};
  const topOpps = displayMetrics.top_opportunities || [];
  const sentiment = displayMetrics.sentiment || [];
  const competitiveMoves = displayMetrics.recent_competitive_moves?.moves || [];

  const isCleanZeroState = !isLoading && !metricsError && (summary.total_stores === 0 && topOpps.length === 0);
  const metricValue = (value) => metricsError || value == null ? '—' : Number(value || 0).toLocaleString('en-IN');

  useEffect(() => {
    if (activeRole && activeRole !== activePersona) {
      setActivePersona(activeRole);
      if (activeRole === 'executive') setPrimaryCanvas('map');
      else if (activeRole === 'store-gm') setPrimaryCanvas('digital-twin');
      else if (activeRole === 'fleet-commander') setPrimaryCanvas('war-room');
    }
  }, [activeRole]);

  const handlePersonaChange = (personaId) => {
    setActivePersona(personaId);
    setGlobalRole(personaId);
    if (personaId === 'executive') {
      setPrimaryCanvas('map');
    } else if (personaId === 'store-gm') {
      setPrimaryCanvas('digital-twin');
    } else if (personaId === 'fleet-commander') {
      setPrimaryCanvas('war-room');
    }
  };

  return (
    <div className="dashboard-studio">
      <AmbientBackground />

      {/* Floating Dynamic Island Live Capsule */}
      <AppleDynamicIsland city={selectedCity} />

      {/* 1. STUDIO MASTER CONTROL BAR */}
      <header className="studio-topbar">
        <div className="studio-brand-zone">
          <div className="flex items-center gap-3">
            <h1 className="studio-title">Command Center</h1>
              <span className="studio-live-pill">
              <span>{metricsError ? 'Metrics unavailable' : `Recorded network · ${selectedCity || 'India-wide'}`}</span>
            </span>
          </div>
          <p className="studio-subtitle">
            City operations cockpit · {selectedCity || 'India-wide map'}
          </p>
        </div>

        {/* Center: Apple Persona Lens Switcher */}
        <div className="studio-persona-zone">
          <ApplePersonaSelector
            activePersona={activePersona}
            onSelectPersona={handlePersonaChange}
          />
        </div>

        {/* Right: Weather Status & Shortcuts Pill */}
        <div className="studio-aux-zone">
          {weatherAlert?.alert && (
            <div className="studio-weather-pill" title={weatherAlert.alert}>
              <CloudRain size={14} className="animate-pulse text-[#38BDF8]" />
              <span className="truncate max-w-[140px] text-xs font-medium text-white/90">
                {weatherAlert.alert}
              </span>
            </div>
          )}
          <button
            onClick={() => {
              const event = new CustomEvent('darkstori:open-command-palette');
              window.dispatchEvent(event);
            }}
            className="studio-shortcut-pill"
            title="Open Command Palette (⌘K)"
          >
            <span className="text-[11px] font-mono text-white/60">⌘K</span>
            <span className="text-xs font-medium text-white/80">Command</span>
          </button>
        </div>
      </header>

      {/* Zero State Setup Onboarding */}
      {isCleanZeroState && (
        <div className="mb-4">
          <QuickSetupWizard
            totalStores={summary.total_stores}
            totalBatches={0}
            totalPlaybooks={0}
          />
        </div>
      )}

      {/* 2. AT-A-GLANCE METRIC STRIP */}
      <section className="studio-kpi-strip">
        <div className="studio-kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">STORES IN NETWORK</span>
            <span className="kpi-badge kpi-badge-success">{metricsError ? 'Unavailable' : 'DB'}</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-val">{metricValue(summary.total_stores)}</span>
            <span className="kpi-sub-val">{selectedCity}</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-indicator bg-emerald-400" />
            <span>{metricsError ? 'Could not load connected data' : 'Connected database aggregate'}</span>
          </div>
        </div>

        <div className="studio-kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">ORDERS · LAST 30 DAYS</span>
            <span className="kpi-badge kpi-badge-blue">{metricsError ? 'Unavailable' : 'DB'}</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-val text-[#38BDF8]">{metricValue(summary.total_orders_30d)}</span>
            <span className="kpi-sub-val">{summary.total_orders_30d == null ? 'feed not connected' : 'recorded orders'}</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-indicator bg-[#FF9F1C]" />
            <span>Aggregate for the selected city</span>
          </div>
        </div>

        <div className="studio-kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">NEIGHBORHOODS TRACKED</span>
            <span className="kpi-badge kpi-badge-success">{metricsError ? 'Unavailable' : 'DB'}</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-val text-emerald-400">{metricValue(summary.total_neighborhoods)}</span>
            <span className="kpi-sub-val">in the current dataset</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-indicator bg-emerald-400" />
            <span>Coverage from the connected API</span>
          </div>
        </div>

        <div className="studio-kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">COMPETITIVE MOVES</span>
            <span className="kpi-badge kpi-badge-purple">{metricsError ? 'Unavailable' : 'DB'}</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-val text-purple-300">{metricValue(summary.total_competitive_moves)}</span>
            <span className="kpi-sub-val">available signals</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-indicator bg-purple-400" />
            <span>As reported by the current data source</span>
          </div>
        </div>
      </section>

      {/* 3. COMMAND STUDIO WORKSPACE GRID (Left 65% Stage | Right 35% Inspector Rail) */}
      <div className="studio-workspace-grid">
        {/* Left Column: Primary Visual Command Stage */}
        <main className="studio-stage-column">
          <div className="studio-stage-frame">
            {/* Stage Mode Switcher Ribbon */}
            <div className="studio-stage-nav">
              <div className="stage-pill-group">
                <button
                  onClick={() => setPrimaryCanvas('map')}
                  className={`stage-nav-pill ${primaryCanvas === 'map' ? 'stage-nav-pill-active' : ''}`}
                >
                  <Compass size={14} />
                  <span>Recorded Network Map</span>
                </button>
                <button
                  onClick={() => setPrimaryCanvas('war-room')}
                  className={`stage-nav-pill ${primaryCanvas === 'war-room' ? 'stage-nav-pill-warroom' : ''}`}
                >
                  <Zap size={14} />
                  <span>God&apos;s Eye War Room</span>
                </button>
                <button
                  onClick={() => setPrimaryCanvas('digital-twin')}
                  className={`stage-nav-pill ${primaryCanvas === 'digital-twin' ? 'stage-nav-pill-twin' : ''}`}
                >
                  <Eye size={14} />
                  <span>Store Digital Twin</span>
                </button>
              </div>

              {/* Contextual Stage Controls */}
              {primaryCanvas === 'map' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`stage-action-pill ${showHeatmap ? 'stage-action-pill-active' : ''}`}
                  >
                    {showHeatmap ? 'Hide Opportunity Heatmap' : 'Show Opportunity Heatmap'}
                  </button>
                </div>
              )}
            </div>

            {/* Active Canvas Stage Container */}
            <div className="studio-stage-body">
              {primaryCanvas === 'map' && (
                <div className="stage-canvas-wrapper">
                  <LazyMapView
                    neighborhoods={topOpps}
                    height="540px"
                    liveOrders={liveOrders}
                    showHeatmap={showHeatmap}
                    onSelect={(item) => {
                      if (item?.neighborhood_id) {
                        navigate(`/neighborhoods?city=${encodeURIComponent(item.city || selectedCity || '')}`);
                      }
                    }}
                  />
                </div>
              )}

              {primaryCanvas === 'war-room' && (
                <div className="stage-canvas-wrapper">
                  <GodsEyeWarRoom />
                </div>
              )}

              {primaryCanvas === 'digital-twin' && (
                <div className="stage-canvas-wrapper">
                  <DarkStoreDigitalTwin />
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right Column: Tactical Inspector Rail */}
        <aside className="studio-inspector-column">
          {/* Tile 1: Evidence-backed operator decision queue */}
          <div className="inspector-card">
            <DecisionQueue city={selectedCity} />
          </div>

          {/* Tile 2: Tactical Telemetry & Radar */}
          <div className="inspector-card">
            <div className="inspector-card-header">
              <span className="inspector-title">TACTICAL RADAR & DISPATCH</span>
              <span className="inspector-tag">Feed status</span>
            </div>
            {activePersona === 'fleet-commander' ? (
              <div className="flex flex-col gap-3">
                <WeatherRadarCard storeId={activeStoreId} />
                <VrpDispatchCard storeId={activeStoreId} />
              </div>
            ) : activePersona === 'store-gm' ? (
              <CityPulse />
            ) : (
              <div className="flex flex-col gap-3">
                <WeatherRadarCard storeId={activeStoreId} />
                <CityPulse />
              </div>
            )}
          </div>

          {/* Tile 3: Live Order Feed */}
          <div className="inspector-card">
            <LiveTracker onOrdersUpdate={setLiveOrders} />
          </div>
        </aside>
      </div>

      {/* 4. DEEP STRATEGY & ANALYTICS DRAWER */}
      <section className="studio-analytics-drawer">
        <div className="drawer-header">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-[#38BDF8]" />
            <span className="drawer-title">Deep Operational Intelligence</span>
          </div>

          <div className="drawer-tab-switcher">
            <button
              onClick={() => setDeepAnalyticsTab('roi')}
              className={`drawer-tab-btn ${deepAnalyticsTab === 'roi' ? 'drawer-tab-btn-active' : ''}`}
            >
              Capital ROI & Alpha
            </button>
            <button
              onClick={() => setDeepAnalyticsTab('sentiment')}
              className={`drawer-tab-btn ${deepAnalyticsTab === 'sentiment' ? 'drawer-tab-btn-active' : ''}`}
            >
              Sentiment & Competitor Signals
            </button>
            <button
              onClick={() => setDeepAnalyticsTab('pipeline')}
              className={`drawer-tab-btn ${deepAnalyticsTab === 'pipeline' ? 'drawer-tab-btn-active' : ''}`}
            >
              Dark Store Pipeline Monitor
            </button>
          </div>
        </div>

        <div className="drawer-content">
          {deepAnalyticsTab === 'roi' && (
            <ExecutiveRoiBanner selectedCity={selectedCity} metrics={displayMetrics} />
          )}

          {deepAnalyticsTab === 'sentiment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white/90 mb-3">Customer Sentiment by Platform</h3>
                {isLoading ? (
                  <Skeleton className="h-[120px] w-full rounded-md" />
                ) : sentiment.length === 0 ? (
                  <EmptyState title="No sentiment recorded" description="Platform sentiment will appear as orders flow." />
                ) : (
                  <div className="flex flex-col gap-3">
                    {sentiment.map((s) => (
                      <div key={s.platform} className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-white/80 font-medium">{s.platform}</span>
                          <span className={`font-mono font-semibold ${(s?.avg_sentiment || 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {(s?.avg_sentiment || 0) > 0 ? '+' : ''}{Number(s?.avg_sentiment || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
                          <div style={{ width: `${s.positive_pct}%` }} className="bg-emerald-500" />
                          <div style={{ width: `${100 - s.positive_pct - s.negative_pct}%` }} className="bg-white/10" />
                          <div style={{ width: `${s.negative_pct}%` }} className="bg-red-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white/90 mb-3">Competitor Movement Alerts (7 Days)</h3>
                {isLoading ? (
                  <Skeleton className="h-[120px] w-full rounded-md" />
                ) : competitiveMoves.length === 0 ? (
                  <EmptyState title="No recent moves" description="Competitor corridors are currently static." />
                ) : (
                  <div className="flex flex-col gap-2.5 max-h-[160px] overflow-y-auto pr-1">
                    {competitiveMoves.slice(0, 5).map((move, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span className="font-semibold text-white/90">{move.competitor || 'Blinkit'}</span>
                          <span className="text-white/60">added {move.type || 'hub'} in {move.neighborhood_name || 'HSR'}</span>
                        </div>
                        <span className="font-mono text-white/40 text-[10px]">{move.date || 'Today'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {deepAnalyticsTab === 'pipeline' && (
            <DarkStorePipelineMonitor />
          )}
        </div>
      </section>

    </div>
  );
}
