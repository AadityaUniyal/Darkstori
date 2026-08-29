import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, RefreshCw, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import AmbientBackground from '../components/AmbientBackground';
import api from '../services/api';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/empty-state';
import { FALLBACK_RESILIENCE_ALERTS } from '../constants/fallbacks';

export default function ResilienceCockpit() {
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [alerts, setAlerts] = useState(FALLBACK_RESILIENCE_ALERTS);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());

  // Fetch competitive moves & SLA metrics via React Query
  const { data: compMoves, isLoading: compLoading, refetch: refetchCompMoves } = useQuery({
    queryKey: ['resilience-competitive-moves'],
    queryFn: () => api.getCompetitiveMoves(),
    staleTime: 30000,
    refetchInterval: refreshInterval * 1000,
  });

  const { data: slaMetrics, isLoading: slaLoading, refetch: refetchSlaMetrics } = useQuery({
    queryKey: ['resilience-sla-metrics'],
    queryFn: () => api.getSLAMetrics(),
    staleTime: 30000,
    refetchInterval: refreshInterval * 1000,
  });

  const isLoading = compLoading || slaLoading;

  // Populate alerts when real API data arrives
  useEffect(() => {
    const fetchedAlerts = [];
    if (compMoves?.moves && Array.isArray(compMoves.moves)) {
      compMoves.moves.forEach((move, idx) => {
        fetchedAlerts.push({
          id: `ALT-COMP-${move.move_id || idx + 1}`,
          title: `Competitor Move: ${move.platform} (${move.move_type})`,
          description: `${move.description} (City: ${move.city})`,
          severity: move.impact_level || 'MEDIUM',
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
    if (fetchedAlerts.length > 0) {
      setAlerts(fetchedAlerts);
    }
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
    const hasHigh = alerts.some((a) => a.severity === 'HIGH');
    const hasMedium = alerts.some((a) => a.severity === 'MEDIUM');
    if (hasHigh) return { text: 'DEGRADED', color: 'var(--spice-500)', icon: <AlertCircle size={32} /> };
    if (hasMedium) return { text: 'WARNING', color: 'var(--marigold-500)', icon: <AlertTriangle size={32} /> };
    return { text: 'OPERATIONAL', color: 'var(--monsoon-500)', icon: <CheckCircle size={32} /> };
  };

  const status = getSystemStatus();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
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
            Overall System Health
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
              description="All dark store operations and SLA metrics are operating within normal parameters."
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

        {/* Right Column: Model Drift Detection Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
            Model Drift Detectors
          </h3>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>MAPE Drift (Forecast)</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--spice-500)', fontWeight: 700 }}>18.2%</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Threshold: 15.0% (BREACHED)</div>
              <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                <div style={{ height: '100%', width: '90%', background: 'var(--spice-500)' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>KS Drift (Temp Feature)</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--marigold-500)', fontWeight: 700 }}>0.178</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Threshold: 0.150 (WARNING)</div>
              <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                <div style={{ height: '100%', width: '75%', background: 'var(--marigold-500)' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>KS Drift (Income Feature)</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--monsoon-500)', fontWeight: 700 }}>0.008</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Threshold: 0.150 (SAFE)</div>
              <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                <div style={{ height: '100%', width: '15%', background: 'var(--monsoon-500)' }} />
              </div>
            </div>
          </div>

          {/* Delivery Channels */}
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, margin: '16px 0 0 0' }}>
            Alert Delivery Channels
          </h3>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Enable external dispatch endpoints to forward telemetry warnings to on-ground staff.
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: 'var(--peacock-500)' }} />
                <span>In-App Dashboard Logs</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: 'var(--saffron-500)' }} />
                <span style={{ color: 'var(--saffron-500)', fontWeight: 600 }}>WhatsApp Business Dispatch (Simulated)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: 'var(--peacock-500)' }} />
                <span>SMS Gateway (Twilio API)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: 'var(--peacock-500)' }} />
                <span>Email Notifications (SMTP Relay)</span>
              </label>
            </div>
            
            <div style={{ background: '#090a0f', border: '1px solid rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px', fontSize: '0.74rem', fontFamily: 'var(--font-mono)' }}>
              <div style={{ color: 'var(--saffron-500)', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>-</span> WHATSAPP SIMULATOR STREAM
              </div>
              <div style={{ color: 'var(--color-text-secondary)' }}>
                {alerts[0] 
                  ? `[System] Outbound to +91 98765 43210: "ALERT [${alerts[0].severity}] ${alerts[0].title} - ${alerts[0].description.slice(0, 50)}..."`
                  : '[System] Outbound channel active: No active alerts.'}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
