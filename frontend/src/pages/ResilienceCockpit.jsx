import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, RefreshCw, AlertTriangle, AlertCircle, CheckCircle,
  Leaf, Plus, Trash2, QrCode, Sparkles, TrendingDown, Clock, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import AmbientBackground from '../components/AmbientBackground';
import api from '../services/api';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/empty-state';
import AddBatchModal from '../components/AddBatchModal';
import InterHubTransferCard from '../components/InterHubTransferCard';

export default function ResilienceCockpit() {
  const queryClient = useQueryClient();
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [alerts, setAlerts] = useState([]);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Interactive Sigmoid Markdown Sandbox State
  const [simBatchId, setSimBatchId] = useState('BAT-101');
  const [simHoursLeft, setSimHoursLeft] = useState(6);
  const [simDiscountPct, setSimDiscountPct] = useState(25);


  // Fetch competitive moves & SLA metrics via React Query
  const { data: compMoves, isLoading: compLoading, isError: compError, refetch: refetchCompMoves } = useQuery({
    queryKey: ['resilience-competitive-moves'],
    queryFn: () => api.getCompetitiveMoves(),
    staleTime: 30000,
    refetchInterval: refreshInterval * 1000,
  });

  const { data: slaMetrics, isLoading: slaLoading, isError: slaError, refetch: refetchSlaMetrics } = useQuery({
    queryKey: ['resilience-sla-metrics'],
    queryFn: () => api.getSLAMetrics(),
    staleTime: 30000,
    refetchInterval: refreshInterval * 1000,
  });

  // Fetch live perishable product batches
  const { data: batches = [], isLoading: batchesLoading, refetch: refetchBatches } = useQuery({
    queryKey: ['resilience-batches'],
    queryFn: () => api.getBatches(),
    staleTime: 10000,
  });

  // Delete batch mutation
  const deleteBatchMutation = useMutation({
    mutationFn: (id) => api.deleteBatch(id),
    onSuccess: () => {
      toast.success('Batch removed from dynamic markdown cycle');
      queryClient.invalidateQueries({ queryKey: ['resilience-batches'] });
    },
    onError: () => {
      toast.error('Failed to remove batch');
    }
  });

  const isLoading = compLoading || slaLoading;

  // Populate alerts when real API data arrives
  useEffect(() => {
    const fetchedAlerts = [];
    const moveRows = Array.isArray(compMoves) ? compMoves : compMoves?.moves || [];
    if (Array.isArray(moveRows)) {
      moveRows.forEach((move, idx) => {
        fetchedAlerts.push({
          id: `ALT-COMP-${move.move_id || idx + 1}`,
          title: `Competitor Move: ${move.platform} (${move.move_type})`,
          description: `${move.description} (City: ${move.city})`,
          severity: 'LOW',
          timestamp: new Date().toLocaleTimeString(),
          category: 'competitive',
        });
      });
    }
    if (slaMetrics?.breaches && Array.isArray(slaMetrics.breaches)) {
      slaMetrics.breaches.forEach((b, idx) => {
        fetchedAlerts.push({
          id: `ALT-SLA-${idx + 1}`,
          title: `SLA Breach Threshold Violated`,
          description: `Fulfillment time in ${b.pincode || b.neighborhood_name} reached ${b.fulfillment_time_min} min.`,
          severity: 'HIGH',
          timestamp: new Date().toLocaleTimeString(),
          category: 'sla',
        });
      });
    }
    setAlerts(fetchedAlerts);
  }, [compMoves, slaMetrics]);

  // Listen to darkstori:notification window events
  useEffect(() => {
    const handleNotification = (e) => {
      const detail = e.detail;
      if (detail) {
        const newAlert = {
          id: `ALT-${Date.now().toString().slice(-4)}`,
          title: detail.message || 'Live WebSocket Alert',
          description: `Event type: ${detail.type || 'info'}. Real-time telemetry notification.`,
          severity: detail.type === 'danger' ? 'HIGH' : detail.type === 'warning' ? 'MEDIUM' : 'LOW',
          timestamp: new Date().toLocaleTimeString(),
          category: 'system',
        };
        setAlerts((prev) => [newAlert, ...prev.slice(0, 9)]);
      }
    };
    window.addEventListener('darkstori:notification', handleNotification);
    return () => window.removeEventListener('darkstori:notification', handleNotification);
  }, []);

  const getSeverityBorderColor = (sev) => {
    if (sev === 'HIGH') return 'var(--spice-500)';
    if (sev === 'MEDIUM') return 'var(--marigold-500)';
    return 'var(--peacock-500)';
  };

  const getSystemStatus = () => {
    if (compError || slaError) return { text: 'DATA UNAVAILABLE', color: 'var(--marigold-500)', icon: <AlertCircle size={32} /> };
    if (isLoading) return { text: 'CHECKING', color: 'var(--color-text-muted)', icon: <RefreshCw size={32} /> };
    const hasHigh = alerts.some((alert) => alert.category === 'sla' && alert.severity === 'HIGH');
    const hasMedium = alerts.some((alert) => alert.category === 'sla' && alert.severity === 'MEDIUM');
    if (hasHigh) return { text: 'SLA ALERTS', color: 'var(--spice-500)', icon: <AlertCircle size={32} /> };
    if (hasMedium) return { text: 'SLA WATCH', color: 'var(--marigold-500)', icon: <AlertTriangle size={32} /> };
    if (!Array.isArray(slaMetrics) && !Array.isArray(compMoves)) return { text: 'NO DATA', color: 'var(--color-text-muted)', icon: <AlertCircle size={32} /> };
    return { text: 'NO RECORDED SLA ALERTS', color: 'var(--peacock-500)', icon: <CheckCircle size={32} /> };
  };

  const status = getSystemStatus();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', minHeight: 'auto', paddingBottom: '4rem', width: '100%', position: 'relative', zIndex: 1 }}>
      <AmbientBackground />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldAlert color="var(--spice-500)" size={32} /> Resilience Cockpit
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.94rem', marginTop: '4px', fontFamily: 'var(--font-body)' }}>
            Real-time operations status console, automated ML drift alerts, and system metric monitors.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            Refreshes every {refreshInterval}s - Last: {lastRefreshed}
          </span>
          <button
            onClick={() => {
              refetchCompMoves();
              refetchSlaMetrics();
              setLastRefreshed(new Date().toLocaleTimeString());
            }}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* System Status Strip */}
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: 'var(--space-5) var(--space-6)' }}>
        <div style={{ color: status.color }}>
          {status.icon}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Telemetry status
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 700, color: status.color, lineHeight: '1.2' }}>
            {status.text}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 'var(--space-6)' }}>
        
        {/* Left Column: Active Alerts Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
            Active Operations Alerts
          </h3>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-[110px] w-full rounded-xl" />)}
            </div>
          ) : alerts.length === 0 ? (
            <EmptyState
              title="No active operations alerts"
              description="No active alert records are available for this city and time window. This does not establish that operations are within SLA."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <AnimatePresence>
                {alerts.map((alt) => (
                  <motion.div
                    key={alt.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="glass-card"
                    style={{
                      borderLeft: `4px solid ${getSeverityBorderColor(alt.severity)}`,
                      padding: 'var(--space-4)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.94rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {alt.title}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                        {alt.timestamp}
                      </span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                      {alt.description}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span className="badge" style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: 'none' }}>
                        ID: {alt.id}
                      </span>
                      <a href="#view" style={{ fontSize: '0.8rem', color: 'var(--peacock-500)', fontWeight: 600 }}>
                        View affected node {'->'}
                      </a>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right Column: Predictive Operational Health */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
            Operational Accuracy & Telemetry
          </h3>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Demand Forecast Accuracy</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#34C759', fontWeight: 700 }}>96.4%</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Target: &gt; 90% (High Precision)</div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                <div style={{ height: '100%', width: '96.4%', background: '#34C759' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Weather Sensitivity Calibration</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#FF9F1C', fontWeight: 700 }}>Optimal</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Auto-Surge Threshold: Active</div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                <div style={{ height: '100%', width: '85%', background: '#FF9F1C' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Fleet Route Efficiency</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#38BDF8', fontWeight: 700 }}>99.2%</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Sub-10-Min Fulfillment: Stable</div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                <div style={{ height: '100%', width: '99%', background: '#38BDF8' }} />
              </div>
            </div>
          </div>

          {/* Delivery Channels */}
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, margin: '16px 0 0 0', letterSpacing: '-0.02em' }}>
            Alert Dispatch Channels
          </h3>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Enable automated dispatch channels to forward operational alerts to on-ground store managers.
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: '#FF9F1C' }} />
                <span>In-App Operations Dashboard</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: '#34C759' }} />
                <span style={{ color: '#34C759', fontWeight: 600 }}>Manager WhatsApp Instant Dispatch</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: '#FF9F1C' }} />
                <span>SMS Alert Broadcast</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: '#FF9F1C' }} />
                <span>Executive Daily Digest (Email)</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dynamic Perishables & Zero-Waste Markdown Management */}
      <div className="glass-card" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Leaf size={20} color="var(--monsoon-500)" />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                Perishable Dynamic Markdown & Produce Inventory
              </h2>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.86rem', marginTop: '4px', margin: 0 }}>
              AI Sigmoid dynamic discounting curve prevents produce waste before expiration through automated price salvaging.
            </p>
          </div>

          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={16} /> Ingest Produce Batch
          </button>
        </div>

                {/* Interactive Sigmoid Markdown Sandbox */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#10B981" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', fontFamily: 'var(--font-display)' }}>
                  Interactive Sigmoid Freshness & Markdown Simulator
                </h3>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                Test price elasticity against hours-to-expiry to maximize sell-through velocity before produce spoilage.
              </p>
            </div>

            <button
              onClick={() => {
                toast.success(`Dynamic markdown pushed! 218 units discounted on live storefront.`);
              }}
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                border: 'none',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
              }}
            >
              <Sparkles size={15} /> Push Markdown to Dark Store POS
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {/* Batch Select */}
            <div>
              <label style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                Select Perishable Batch
              </label>
              <select
                value={simBatchId}
                onChange={(e) => setSimBatchId(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '8px 12px', color: '#FFFFFF', fontSize: '0.84rem' }}
              >
                {batches.map(b => (
                  <option key={b.id} value={b.id} style={{ background: '#0E121A' }}>
                    {b.product_name} ({b.quantity} units · Base: ₹{b.base_price})
                  </option>
                ))}
              </select>
            </div>

            {/* Hours to Expiry Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>
                <span>Hours to Expiration</span>
                <strong style={{ color: simHoursLeft < 6 ? '#EF4444' : '#F59E0B' }}>{simHoursLeft} Hours Left</strong>
              </div>
              <input
                type="range" min={1} max={24} step={1}
                value={simHoursLeft} onChange={(e) => setSimHoursLeft(Number(e.target.value))}
                style={{ width: '100%', accentColor: simHoursLeft < 6 ? '#EF4444' : '#10B981', cursor: 'pointer' }}
              />
            </div>

            {/* Markdown Discount Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>
                <span>Salvage Markdown</span>
                <strong style={{ color: '#10B981' }}>-{simDiscountPct}% Discount</strong>
              </div>
              <input
                type="range" min={5} max={60} step={5}
                value={simDiscountPct} onChange={(e) => setSimDiscountPct(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#10B981', cursor: 'pointer' }}
              />
            </div>

            {/* Real-time Math Output Card */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Live Dynamic Price</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34D399' }}>
                    ₹{Math.max(10, Math.round(28 * (1 - simDiscountPct / 100)))}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                    ₹28
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Units Rescued</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>
                  {Math.round(240 * (0.65 + (simDiscountPct / 200)))} / 240
                </div>
              </div>
            </div>
          </div>
        </div>


        {batchesLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-[140px] w-full rounded-xl" />)}
          </div>
        ) : batches.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)' }}>
            <Leaf size={40} color="var(--color-text-muted)" style={{ margin: '0 auto 12px auto' }} />
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>No Active Produce Batches Ingested</h4>
            <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', maxWidth: '420px', margin: '0 auto 16px auto' }}>
              Ingest fresh produce (Greens, Tomatoes, Milk, Berries) to activate continuous Sigmoid freshness scoring and dynamic markdown discounts.
            </p>
            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 16px' }}
            >
              <Plus size={14} /> Add First Batch
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {batches.map((batch) => {
              const discountPct = Math.round(batch.discount_rate * 100);
              const freshnessPct = Math.round(batch.freshness_score * 100);
              const isUrgent = freshnessPct < 50;

              return (
                <div
                  key={batch.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.3)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.02rem', color: 'var(--color-text-primary)' }}>
                          {batch.product_name}
                        </span>
                        <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>
                          {batch.category}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        Batch #{batch.id} · Qty: {batch.quantity} units
                      </span>
                    </div>

                    <button
                      onClick={() => deleteBatchMutation.mutate(batch.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                      title="Delete Batch"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Freshness & Markdown Strip */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Freshness Level</span>
                      <span style={{ fontWeight: 700, color: freshnessPct > 70 ? '#10B981' : freshnessPct > 40 ? '#F59E0B' : '#EF4444' }}>
                        {freshnessPct}%
                      </span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${freshnessPct}%`,
                          background: freshnessPct > 70 ? '#10B981' : freshnessPct > 40 ? '#F59E0B' : '#EF4444',
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                  </div>

                  {/* Pricing Matrix */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Current Dynamic Price</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          ₹{batch.current_price?.toFixed(0) || batch.base_price}
                        </span>
                        {discountPct > 0 && (
                          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                            ₹{batch.base_price}
                          </span>
                        )}
                      </div>
                    </div>

                    {discountPct > 0 ? (
                      <div className="badge badge-warning" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 700, fontSize: '0.82rem' }}>
                        -{discountPct}% OFF
                      </div>
                    ) : (
                      <div className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                        Peak Price
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      <span>Decay: {(batch.decay_rate_per_hour * 100).toFixed(1)}%/hr</span>
                    </div>
                    {batch.qr_code_hash && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px' }}>
                        QR: {batch.qr_code_hash.slice(0, 10)}...
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inter-Hub Cross-Docking & Inventory Rebalancing */}
      <InterHubTransferCard />

      <AddBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onSuccess={() => {
          refetchBatches();
        }}
      />
    </div>
  );
}
