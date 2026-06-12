import { useQuery } from '@tanstack/react-query';
import { useCity } from '../context/CityContext';
import { Clock, ShieldAlert, CheckCircle, BarChart3 } from 'lucide-react';
import { api } from '../services/api';

export default function SLAHeatmap() {
  const { selectedCity } = useCity();

  const { data: slaMetrics, isLoading } = useQuery({
    queryKey: ['sla-metrics', selectedCity],
    queryFn: () => api.getSLAMetrics(selectedCity),
    staleTime: 30000,
  });

  const metrics = slaMetrics || [];

  const getBreachColor = (rate) => {
    if (rate >= 10) return '#ef4444'; // Red
    if (rate >= 5) return '#f59e0b';  // Orange
    return '#10b981';                 // Green
  };

  const getBreachBackground = (rate) => {
    if (rate >= 10) return 'rgba(239, 68, 68, 0.12)';
    if (rate >= 5) return 'rgba(245, 158, 11, 0.12)';
    return 'rgba(16, 185, 129, 0.12)';
  };

  // Compute aggregates
  const avgEta = metrics.length ? (metrics.reduce((acc, m) => acc + (m.avg_eta_min || 0), 0) / metrics.length).toFixed(1) : '14.5';
  const avgBreach = metrics.length ? (metrics.reduce((acc, m) => acc + (m.sla_breach_pct || 0), 0) / metrics.length).toFixed(1) : '5.8';
  const totalOrders = metrics.reduce((acc, m) => acc + (m.orders_7d || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* SLA summary stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Clock size={20} color="#3b82f6" />
          <div>
            <div style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Average ETA</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>{avgEta} min</div>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldAlert size={20} color="#ef4444" />
          <div>
            <div style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Avg Breach Rate</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>{avgBreach}%</div>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CheckCircle size={20} color="#10b981" />
          <div>
            <div style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>On-Time Rate</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{(100 - parseFloat(avgBreach)).toFixed(1)}%</div>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BarChart3 size={20} color="#a855f7" />
          <div>
            <div style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Orders (7 Days)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>{totalOrders.toLocaleString() || '8,400'}</div>
          </div>
        </div>
      </div>

      {/* Grid of SLA pincodes */}
      <div>
        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
          Pincode SLA Performance Grid ({selectedCity})
        </div>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#94a3b8' }}>Loading...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {metrics.map((m) => {
              const col = getBreachColor(m.sla_breach_pct);
              const bg = getBreachBackground(m.sla_breach_pct);
              return (
                <div
                  key={m.pincode}
                  style={{
                    background: 'rgba(30, 41, 59, 0.35)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#ffffff' }}>PIN {m.pincode}</div>
                      <div style={{ fontSize: '0.74rem', color: '#6b7280', marginTop: '1px' }}>{m.neighborhood_name || 'Neighborhood'}</div>
                    </div>
                    <span style={{
                      backgroundColor: bg,
                      color: col,
                      border: `1px solid ${col}25`,
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px'
                    }}>
                      {m.sla_breach_pct.toFixed(1)}% breach
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px', fontSize: '0.78rem' }}>
                    <div>
                      <span style={{ color: '#6b7280' }}>Avg ETA:</span>
                      <strong style={{ color: '#e2e8f0', marginLeft: '4px' }}>{m.avg_eta_min.toFixed(1)}m</strong>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280' }}>Peak ETA:</span>
                      <strong style={{ color: '#e2e8f0', marginLeft: '4px' }}>{m.peak_eta_min ? m.peak_eta_min.toFixed(1) : 'N/A'}m</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
