import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Activity, Landmark, Percent, Calendar, TrendingUp, Info } from 'lucide-react';
import { api } from '../services/api';

export default function Simulator() {
  const [nbhdId, setNbhdId] = useState(1);
  const [investment, setInvestment] = useState(1500000);
  const [storeSize, setStoreSize] = useState(1500);
  const [hours, setHours] = useState('08:00-22:00');

  // Query neighborhoods list
  const { data: nbhds } = useQuery({
    queryKey: ['neighborhoods-list'],
    queryFn: () => api.getNeighborhoods(),
    staleTime: 60000,
  });

  const neighborhoodList = nbhds || [
    { neighborhood_id: 1, neighborhood_name: 'Koramangala', pincode: '560034', city_id: 1, population: 150000, avg_household_income: 950000 },
    { neighborhood_id: 2, neighborhood_name: 'Indiranagar', pincode: '560038', city_id: 1, population: 120000, avg_household_income: 1100000 },
    { neighborhood_id: 3, neighborhood_name: 'HSR Layout', pincode: '560102', city_id: 1, population: 180000, avg_household_income: 850000 },
    { neighborhood_id: 4, neighborhood_name: 'Saket', pincode: '110017', city_id: 2, population: 140000, avg_household_income: 1200000 },
    { neighborhood_id: 5, neighborhood_name: 'Hitech City', pincode: '500081', city_id: 4, population: 200000, avg_household_income: 900000 },
  ];

  // Simulation run mutation
  const { mutate: runSim, data: results, isPending } = useMutation({
    mutationFn: (payload) => api.predictROI(payload),
  });

  const handleSimulate = (e) => {
    e.preventDefault();
    runSim({
      neighborhood_id: nbhdId,
      investment_amount: investment,
      store_size_sqft: storeSize,
      operating_hours: hours,
    });
  };

  return (
    <div style={{ padding: '24px', color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity color="#3b82f6" /> Dark Store Simulator
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '4px' }}>
          Run what-if simulations to assess investment feasibility, ROI, and break-even timelines across neighborhoods
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flexWrap: 'wrap' }}>
        {/* Simulation configuration form */}
        <div style={{ background: 'rgba(30, 41, 59, 0.45)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '24px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '20px' }}>
            Store Configuration Parameters
          </h2>
          <form onSubmit={handleSimulate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                TARGET NEIGHBORHOOD
              </label>
              <select
                value={nbhdId}
                onChange={(e) => setNbhdId(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#1e293b',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  outline: 'none',
                }}
              >
                {neighborhoodList.map((n) => (
                  <option key={n.neighborhood_id} value={n.neighborhood_id}>
                    {n.neighborhood_name} ({n.pincode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                CAPITAL INVESTMENT (INR)
              </label>
              <input
                type="number"
                value={investment}
                onChange={(e) => setInvestment(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#1e293b',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  STORE SIZE (SQFT)
                </label>
                <input
                  type="number"
                  value={storeSize}
                  onChange={(e) => setStoreSize(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  OPERATING HOURS
                </label>
                <select
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    outline: 'none',
                  }}
                >
                  <option value="08:00-22:00">08:00 - 22:00</option>
                  <option value="06:00-00:00">06:00 - 00:00</option>
                  <option value="24x7">24x7 Coverage</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              style={{
                padding: '12px',
                background: '#3b82f6',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: '10px',
                transition: 'background-color 0.2s',
              }}
            >
              {isPending ? 'Calculating...' : 'Run Feasibility Simulation'}
            </button>
          </form>
        </div>

        {/* Simulation results view */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {results ? (
            <div style={{ background: 'rgba(30, 41, 59, 0.45)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '16px', padding: '24px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '20px' }}>
                Simulated Feasibility Output ({results.neighborhood_name})
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Daily Orders</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>{results.predicted_daily_orders}</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #10b981' }}>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Break-Even Month</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                    {results.break_even_month === 999 ? 'Unprofitable' : `${results.break_even_month} mo`}
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #fbbf24' }}>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>12M Projected ROI</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>{results.roi_12_months_pct}%</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #a855f7' }}>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Confidence Index</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>{(results.confidence_level * 100).toFixed(0)}%</div>
                </div>
              </div>

              <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.15)', display: 'flex', gap: '10px' }}>
                <Info size={16} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
                  This estimate is derived from a geospatial model using demographic variables (avg income ₹{results.factors?.income?.toLocaleString()}/yr, population density {results.factors?.density?.toLocaleString()}/sqkm) and {results.factors?.competition_stores} local competing stores.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ height: '100%', minHeight: '260px', background: 'rgba(30, 41, 59, 0.3)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <Landmark size={36} />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, marginTop: '12px' }}>
                Configure parameters and run to see ROI predictions
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
