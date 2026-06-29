import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, RefreshCw, Clock, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import AmbientBackground from '../components/AmbientBackground';
import AnimatedCard from '../components/AnimatedCard';

export default function ResilienceCockpit() {
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [alerts, setAlerts] = useState([
    { id: 'ALT-101', title: 'Feature Drift Detected: temp_celsius', description: 'Kolmogorov-Smirnov statistics (KS=0.178) exceeded threshold of 0.150 in Bangalore.', severity: 'MEDIUM', timestamp: '10:42:15', category: 'drift' },
    { id: 'ALT-102', title: 'SLA Breach Threshold Violated', description: 'Fulfillment times in PIN 560001 (Koramangala) spiked to 18.2 min (threshold 15 min).', severity: 'HIGH', timestamp: '10:38:00', category: 'sla' },
    { id: 'ALT-103', title: 'Model Drift Warning: demand_forecasting_model', description: 'Validation MAPE drifted to 18.2% (threshold 15.0%) on staging run.', severity: 'HIGH', timestamp: '10:35:12', category: 'drift' },
    { id: 'ALT-104', title: 'Minor Latency Spike: prediction_api', description: 'P95 response latency crossed 120ms (currently 132ms) in Hyderabad.', severity: 'LOW', timestamp: '10:15:44', category: 'system' }
  ]);

  // Simulate refresh updates
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setLastRefreshed(new Date().toLocaleTimeString());
      // Randomly inject/remove minor alerts to show activity
      if (Math.random() > 0.6) {
        const id = `ALT-${Math.floor(100 + Math.random() * 900)}`;
        const newAlert = {
          id,
          title: 'System telemetry log sync complete',
          description: `Telemetry batch successfully resolved in ${Math.round(40 + Math.random() * 100)}ms.`,
          severity: 'LOW',
          timestamp: new Date().toLocaleTimeString(),
          category: 'system'
        };
        setAlerts(prev => [newAlert, ...prev.slice(0, 5)]);
      }
    }, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [refreshInterval]);

  const getSeverityBorderColor = (sev) => {
    if (sev === 'HIGH') return 'var(--spice-500)';
    if (sev === 'MEDIUM') return 'var(--marigold-500)';
    return 'var(--peacock-500)';
  };

  const getSystemStatus = () => {
    const hasHigh = alerts.some(a => a.severity === 'HIGH');
    const hasMedium = alerts.some(a => a.severity === 'MEDIUM');
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
            Refreshes every {refreshInterval}s · Last: {lastRefreshed}
          </span>
          <button
            onClick={() => setLastRefreshed(new Date().toLocaleTimeString())}
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
                      View affected node →
                    </a>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
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
                <span>●</span> WHATSAPP SIMULATOR STREAM
              </div>
              <div style={{ color: 'var(--color-text-secondary)' }}>
                [System] Outbound to +91 98765 43210: &quot;ALERT [HIGH] SLA Breach PIN 560001 (Koramangala) Spiked to 18.2 min.&quot;
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
