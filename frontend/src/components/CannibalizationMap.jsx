import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MapPin, TrendingUp, AlertTriangle, ArrowRight, Activity, DollarSign, History } from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';

export default function CannibalizationMap() {
  const [lat, setLat] = useState(12.934);
  const [lng, setLng] = useState(77.626);
  const [radius, setRadius] = useState(3.0);
  const [proposedSqft, setProposedSqft] = useState(1500);
  const [city, setCity] = useState('Bangalore');

  const { data: result, mutate: runAnalysis, isPending } = useMutation({
    mutationFn: (payload) => api.analyzeCannibalization(payload),
    onError: (err) => toast.error(err.response?.data?.detail || 'Analysis failed'),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['cannibalization-history', city],
    queryFn: () => api.getCannibalizationHistory({ city }),
  });

  const handleAnalyze = (e) => {
    e.preventDefault();
    runAnalysis({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      city,
      radius_km: parseFloat(radius),
      proposed_sqft: parseInt(proposedSqft),
      avg_order_value: 350.0,
    });
  };

  return (
    <div className="space-y-6" style={{ color: 'var(--color-text-primary)' }}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Controls */}
        <div className="lg:col-span-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 backdrop-blur-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="text-[var(--saffron-500)]" size={18} />
            Simulation Coordinates
          </h3>
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">City</label>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-2 text-sm text-[var(--color-text-primary)]">
                <option value="Bangalore">Bangalore</option>
                <option value="Delhi">Delhi</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Pune">Pune</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Latitude</label>
                <input type="number" step="0.0001" value={lat} onChange={(e) => setLat(e.target.value)} className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-2 text-sm text-[var(--color-text-primary)]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Longitude</label>
                <input type="number" step="0.0001" value={lng} onChange={(e) => setLng(e.target.value)} className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-2 text-sm text-[var(--color-text-primary)]" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Analysis Radius (KM)</label>
              <input type="number" step="0.1" value={radius} onChange={(e) => setRadius(e.target.value)} className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-2 text-sm text-[var(--color-text-primary)]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Proposed Area (SqFt)</label>
              <input type="number" value={proposedSqft} onChange={(e) => setProposedSqft(e.target.value)} className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-2 text-sm text-[var(--color-text-primary)]" />
            </div>
            <button type="submit" disabled={isPending} className="w-full btn-primary py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold">
              {isPending ? 'Simulating...' : 'Run Huff Cannibalization'}
            </button>
          </form>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 backdrop-blur-md space-y-6">
              <div className="border-b border-[var(--color-border)] pb-4">
                <h2 className="text-xl font-bold mb-1">Cannibalization Report</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">{result.recommendation}</p>
              </div>

              {/* Top Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg">
                  <span className="block text-xs text-[var(--text-muted)]">Predicted Daily Orders</span>
                  <span className="text-lg font-bold text-[var(--saffron-500)]">{result.new_store_predicted_orders}</span>
                </div>
                <div className="p-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg">
                  <span className="block text-xs text-[var(--text-muted)]">Cannibalization Rate</span>
                  <span className="text-lg font-bold text-[var(--spice-500)]">{result.cannibalization_rate_pct}%</span>
                </div>
                <div className="p-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg">
                  <span className="block text-xs text-[var(--text-muted)]">Net Incremental Gain</span>
                  <span className="text-lg font-bold text-[var(--peacock-500)]">+{result.net_incremental_orders}</span>
                </div>
                <div className="p-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg">
                  <span className="block text-xs text-[var(--text-muted)]">Est. Monthly Profit</span>
                  <span className="text-lg font-bold">â‚¹{(result.portfolio_impact.net_monthly_pnl / 100000).toFixed(1)}L</span>
                </div>
              </div>

              {/* Affected Stores List */}
              <div>
                <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                  <Activity size={16} />
                  Affected Stores in Radius
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] text-[var(--text-muted)]">
                        <th className="pb-2">Store Name</th>
                        <th className="pb-2">Distance</th>
                        <th className="pb-2 text-right">Lost Orders</th>
                        <th className="pb-2 text-right">Loss %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {result.affected_stores.map((store, i) => (
                        <tr key={i} className="hover:bg-[rgba(255,255,255,0.02)]">
                          <td className="py-2.5 font-medium">{store.store_name}</td>
                          <td className="py-2.5">{store.distance_km} KM</td>
                          <td className="py-2.5 text-right text-[var(--spice-500)]">-{store.lost_orders}</td>
                          <td className="py-2.5 text-right font-semibold">{store.lost_pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl backdrop-blur-md">
              <TrendingUp size={48} className="text-[var(--text-muted)] mb-3" />
              <p className="text-sm text-[var(--color-text-secondary)]">Trigger a simulation to see Huff Cannibalization redistribution.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
