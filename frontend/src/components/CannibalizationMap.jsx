import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MapPin, TrendingUp, AlertTriangle, ArrowRight, Activity, DollarSign, History } from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';
import { useCity } from '../context/CityContext';

export default function CannibalizationMap() {
  const { selectedCity } = useCity();
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState(3.0);
  const [proposedSqft, setProposedSqft] = useState(1500);
  const [city, setCity] = useState(selectedCity || '');
  const [avgOrderValue, setAvgOrderValue] = useState(350);
  const [rentPerSqft, setRentPerSqft] = useState(45);
  const [staffSalary, setStaffSalary] = useState(25000);
  const [deliveryCost, setDeliveryCost] = useState(18);
  const [utilities, setUtilities] = useState(15000);
  const [latentDemandPct, setLatentDemandPct] = useState(15);

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
    if (!city || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      toast.error('Enter a city and the proposed location coordinates.');
      return;
    }
    runAnalysis({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      city,
      radius_km: parseFloat(radius),
      proposed_sqft: parseInt(proposedSqft),
      avg_order_value: Number(avgOrderValue),
      rent_per_sqft_monthly: Number(rentPerSqft),
      staff_salary_monthly: Number(staffSalary),
      delivery_cost_per_order: Number(deliveryCost),
      utilities_monthly: Number(utilities),
      latent_demand_assumption_pct: Number(latentDemandPct),
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
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City with recorded market data" className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-[#FF9F1C]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Latitude</label>
              <input type="number" step="0.0001" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-2 text-sm text-white focus:outline-none focus:border-[#FF9F1C]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Longitude</label>
              <input type="number" step="0.0001" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-2 text-sm text-white focus:outline-none focus:border-[#FF9F1C]" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Analysis Radius (KM)</label>
              <input type="number" step="0.1" value={radius} onChange={(e) => setRadius(e.target.value)} className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-[#FF9F1C]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Proposed Area (SqFt)</label>
              <input type="number" value={proposedSqft} onChange={(e) => setProposedSqft(e.target.value)} className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-[#FF9F1C]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Average order value (₹)', avgOrderValue, setAvgOrderValue],
                ['Rent / sq ft / month (₹)', rentPerSqft, setRentPerSqft],
                ['Staff salary / month (₹)', staffSalary, setStaffSalary],
                ['Delivery cost / order (₹)', deliveryCost, setDeliveryCost],
                ['Utilities / month (₹)', utilities, setUtilities],
                ['Latent demand assumption (%)', latentDemandPct, setLatentDemandPct],
              ].map(([label, value, setter]) => (
                <label key={label} className="block text-[10px] font-semibold text-white/50 uppercase tracking-wider">
                  {label}
                  <input type="number" min="0" value={value} onChange={(e) => setter(e.target.value)} className="mt-1 w-full bg-white/[0.04] border border-white/10 rounded-xl p-2 text-sm text-white focus:outline-none focus:border-[#FF9F1C]" />
                </label>
              ))}
            </div>
            <button type="submit" disabled={isPending} className="w-full btn-primary py-2.5 rounded-xl flex items-center justify-center gap-2 font-semibold">
              {isPending ? 'Simulating...' : 'Run Huff Cannibalization'}
            </button>
          </form>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 backdrop-blur-md space-y-6">
              <div className="border-b border-[var(--color-border)] pb-4">
                <h2 className="text-xl font-bold mb-1">Cannibalization Scenario</h2>
                <span className="inline-block mb-2 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-400/20">HEURISTIC SIMULATION · NOT A SITE APPROVAL</span>
                <p className="text-sm text-[var(--color-text-secondary)]">{result.recommendation}</p>
                <p className="mt-2 text-xs text-[var(--color-text-secondary)]">Market growth and cost values below are operator-supplied assumptions. Results depend on the recorded store capacity data shown by the API.</p>
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
                  <span className="text-lg font-bold">₹{(result.portfolio_impact.net_monthly_pnl / 100000).toFixed(1)}L</span>
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
