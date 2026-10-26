import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { TrendingUp, Clock, Settings2, Database, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import AmbientBackground from '../components/AmbientBackground';
import AnimatedCard from '../components/AnimatedCard';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/empty-state';

export default function Forecast() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const localDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  const [selectedPincode, setSelectedPincode] = useState('');
  const [orderDate, setOrderDate] = useState(localDate);
  const zonesQuery = useQuery({ queryKey: ['forecast-neighborhoods'], queryFn: api.getForecastNeighborhoods, staleTime: 60000 });
  const zones = Array.isArray(zonesQuery.data) ? zonesQuery.data : [];
  const activeZone = zones.find((zone) => String(zone.pincode) === String(selectedPincode)) || zones[0];
  const forecastMutation = useMutation({ mutationFn: api.getDemandForecast });

  const runForecast = (event) => {
    event.preventDefault();
    if (!activeZone) return;
    forecastMutation.mutate({ pincode: String(activeZone.pincode), order_date: orderDate });
  };
  const result = forecastMutation.data;
  const isHeuristic = /heuristic|fallback/i.test(result?.model_name || '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: '4rem', width: '100%', position: 'relative', zIndex: 1 }}>
      <AmbientBackground />
      <header>
        <h1 style={{ fontSize: '2.1rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <TrendingUp color="#FF9F1C" size={30} /> Daily demand estimate
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '.94rem', marginTop: 6 }}>
          One-date estimate for a connected neighborhood. Results depend on the model and data available to this workspace.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>
        <AnimatedCard className="glass-card" delay={0.1}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.15rem', color: 'var(--color-text-primary)', margin: '0 0 20px' }}>
            <Settings2 size={18} color="var(--peacock-500)" /> Estimate inputs
          </h2>
          {zonesQuery.isLoading ? <Skeleton className="w-full h-[140px]" /> : zones.length === 0 ? (
            <EmptyState title="No connected neighborhoods" description="Add neighborhood records with a PIN code before requesting an operational estimate." />
          ) : (
            <form onSubmit={runForecast} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label style={{ color: 'var(--color-text-secondary)', fontSize: '.82rem', fontWeight: 600 }}>
                Neighborhood / PIN code
                <select value={activeZone?.pincode || ''} onChange={(event) => { setSelectedPincode(event.target.value); forecastMutation.reset(); }} className="input-field" style={{ display: 'block', width: '100%', marginTop: 6 }}>
                  {zones.map((zone) => <option key={`${zone.neighborhood_id}-${zone.pincode}`} value={zone.pincode}>{zone.neighborhood_name} ({zone.pincode})</option>)}
                </select>
              </label>
              <label style={{ color: 'var(--color-text-secondary)', fontSize: '.82rem', fontWeight: 600 }}>
                Order date
                <input type="date" value={orderDate} onChange={(event) => { setOrderDate(event.target.value); forecastMutation.reset(); }} className="input-field" style={{ display: 'block', width: '100%', marginTop: 6 }} />
              </label>
              {activeZone && <div style={{ padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)', fontSize: '.84rem' }}>
                <Database size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Neighborhood record
                <div style={{ marginTop: 8, color: 'var(--color-text-primary)' }}>{Number(activeZone.population_density || 0).toLocaleString()} people/km² · ₹{Number(activeZone.avg_household_income || 0).toLocaleString()} average household income</div>
              </div>}
              <button type="submit" className="btn-primary" disabled={forecastMutation.isPending || !activeZone}>
                {forecastMutation.isPending ? 'Estimating…' : 'Estimate demand for this date'}
              </button>
            </form>
          )}
        </AnimatedCard>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {forecastMutation.isPending ? <Skeleton className="w-full h-[260px]" /> : forecastMutation.isError ? (
            <EmptyState title="Estimate unavailable" description="The forecast service could not produce a result. Check the connection and try again." />
          ) : !result ? (
            <EmptyState title="Ready when you are" description="Choose a connected neighborhood and date to request a single-date estimate." />
          ) : (
            <div className="glass-card" style={{ border: '1px solid rgba(255, 122, 26, .25)' }}>
              <div style={{ color: 'var(--saffron-500)', fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Estimated orders · {activeZone?.neighborhood_name}</div>
              <div style={{ fontSize: '3rem', fontWeight: 750, color: 'var(--color-text-primary)', margin: '8px 0' }}>{Math.round(result.prediction)} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>orders</span></div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '.9rem' }}>Approximate model range: {Math.round(result.lower_bound)}–{Math.round(result.upper_bound)} orders</div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '.82rem', margin: '12px 0 0' }}>This range has not been presented as a statistically calibrated confidence interval.</p>
              {isHeuristic && <div style={{ marginTop: 14, padding: 12, borderRadius: 'var(--radius-md)', background: 'rgba(255,159,28,.1)', color: 'var(--color-text-primary)', fontSize: '.84rem' }}><AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Heuristic fallback model: treat this as directional and verify against local operating data.</div>}
              <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 18, paddingTop: 14, display: 'flex', flexWrap: 'wrap', gap: 16, color: 'var(--color-text-secondary)', fontSize: '.82rem' }}>
                <span>Model: {result.model_name || 'Unspecified'}</span>
                {result.model_version && <span>Version: {result.model_version}</span>}
                {Number.isFinite(Number(result.latency_ms)) && <span><Clock size={12} style={{ verticalAlign: 'middle' }} /> {Number(result.latency_ms).toFixed(1)} ms</span>}
                {result.prediction_id && <code>ID {String(result.prediction_id).slice(-8)}</code>}
              </div>
            </div>
          )}
          <div className="glass-card" style={{ color: 'var(--color-text-secondary)', fontSize: '.86rem' }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>Scope</strong>
            <p style={{ marginBottom: 0 }}>This endpoint returns one estimate for one date. It does not currently provide a validated multi-day forecast or measured accuracy score.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
