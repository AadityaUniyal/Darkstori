import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Users, DollarSign, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../services/api';
import AmbientBackground from '../components/AmbientBackground';
import RangoliGauge from '../components/RangoliGauge';

export default function Neighborhoods() {
  const [activeCityName, setActiveCityName] = useState('Bangalore');
  const [sortBy, setSortBy] = useState('score'); // 'score' | 'population' | 'intensity'
  const [expandedCards, setExpandedCards] = useState({}); // mapping ID -> boolean

  // Fetch Focus Cities
  const { data: cities } = useQuery({
    queryKey: ['focus-cities'],
    queryFn: () => api.getFocusCities(),
    staleTime: 60000,
  });

  const cityList = cities || [
    { city_id: 1, city_name: 'Bangalore', state: 'Karnataka', num_pincodes: 150, total_dark_stores: 12, market_maturity: 'Mature' },
    { city_id: 2, city_name: 'Delhi', state: 'Delhi', num_pincodes: 220, total_dark_stores: 8, market_maturity: 'Mature' },
    { city_id: 3, city_name: 'Mumbai', state: 'Maharashtra', num_pincodes: 180, total_dark_stores: 10, market_maturity: 'Mature' },
    { city_id: 4, city_name: 'Hyderabad', state: 'Telangana', num_pincodes: 110, total_dark_stores: 7, market_maturity: 'Growth' },
    { city_id: 5, city_name: 'Pune', state: 'Maharashtra', num_pincodes: 85, total_dark_stores: 5, market_maturity: 'Growth' },
  ];

  // Fetch All Neighborhoods (or get for active city)
  const { data: neighborhoods, isLoading } = useQuery({
    queryKey: ['neighborhoods-all'],
    queryFn: () => api.getNeighborhoods(),
    staleTime: 60000,
  });

  const fallbackNeighborhoods = [
    { neighborhood_id: 1, city: 'Bangalore', neighborhood_name: 'Koramangala', pincode: '560034', population: 150000, avg_household_income: 950000.0, working_professionals_pct: 72.0, price_sensitivity: 'High', competition_intensity: 'High', market_potential_score: 9.2 },
    { neighborhood_id: 2, city: 'Bangalore', neighborhood_name: 'Indiranagar', pincode: '560038', population: 120000, avg_household_income: 1100000.0, working_professionals_pct: 68.0, price_sensitivity: 'High', competition_intensity: 'High', market_potential_score: 8.9 },
    { neighborhood_id: 3, city: 'Bangalore', neighborhood_name: 'HSR Layout', pincode: '560102', population: 180000, avg_household_income: 850000.0, working_professionals_pct: 75.0, price_sensitivity: 'Medium', competition_intensity: 'Medium', market_potential_score: 8.2 },
    { neighborhood_id: 4, city: 'Delhi', neighborhood_name: 'Saket', pincode: '110017', population: 95000, avg_household_income: 890000.0, working_professionals_pct: 65.0, price_sensitivity: 'Medium', competition_intensity: 'Medium', market_potential_score: 9.0 },
    { neighborhood_id: 5, city: 'Hyderabad', neighborhood_name: 'Gachibowli', pincode: '500032', population: 110000, avg_household_income: 1050000.0, working_professionals_pct: 78.0, price_sensitivity: 'Low', competition_intensity: 'Low', market_potential_score: 8.8 },
  ];

  const neighborhoodList = neighborhoods && neighborhoods.length > 0 ? neighborhoods : fallbackNeighborhoods;

  // Filter by active city
  const filtered = neighborhoodList.filter(n => n.city?.toLowerCase() === activeCityName.toLowerCase());

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'score') {
      return (b.market_potential_score || b.opportunity_score || 0) - (a.market_potential_score || a.opportunity_score || 0);
    } else if (sortBy === 'population') {
      return b.population - a.population;
    } else {
      // Competition intensity sorting: High -> Medium -> Low
      const intensityMap = { High: 3, Medium: 2, Low: 1 };
      return (intensityMap[b.competition_intensity] || 0) - (intensityMap[a.competition_intensity] || 0);
    }
  });

  const toggleExpand = (id) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <AmbientBackground />

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Compass color="var(--saffron-500)" size={32} /> Neighborhood Intelligence
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.94rem', marginTop: '4px', fontFamily: 'var(--font-body)' }}>
          Compare neighborhood profiles, demographics, and expansion opportunity scores.
        </p>
      </div>

      {/* City Tabs Selector */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
        {cityList.map((c) => (
          <button
            key={c.city_name}
            onClick={() => setActiveCityName(c.city_name)}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-full)',
              background: activeCityName === c.city_name ? 'var(--peacock-100)' : 'transparent',
              border: activeCityName === c.city_name ? '1px solid var(--peacock-500)' : '1px solid transparent',
              color: activeCityName === c.city_name ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all var(--transition-fast)',
            }}
          >
            {c.city_name}
          </button>
        ))}
      </div>

      {/* Sort controls button group */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>SORT BY:</span>
        <div style={{ display: 'flex', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '2px' }}>
          {[
            { id: 'score', label: '★ Opportunity Score' },
            { id: 'population', label: '👥 Population' },
            { id: 'intensity', label: '🔥 Competition' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              style={{
                padding: '6px 12px',
                border: 'none',
                background: sortBy === opt.id ? 'var(--saffron-500)' : 'transparent',
                color: sortBy === opt.id ? '#0B0D14' : 'var(--color-text-secondary)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.8rem',
                transition: 'background var(--transition-fast)'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Neighborhood Cards */}
      {isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>Loading neighborhood insights...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
          {sorted.map((n) => {
            const isExpanded = !!expandedCards[n.neighborhood_id];
            const score = n.market_potential_score || n.opportunity_score || 0;
            return (
              <div
                key={n.neighborhood_id}
                className="glass-card interactive"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                  alignSelf: 'start',
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', margin: 0 }}>
                      {n.neighborhood_name}
                    </h3>
                    <span className="badge badge-success" style={{ alignSelf: 'flex-start', background: 'var(--peacock-100)', color: 'var(--peacock-500)', border: 'none' }}>
                      PIN {n.pincode}
                    </span>
                  </div>
                  <RangoliGauge value={score} max={10} type="opportunity" size={54} />
                </div>

                {/* Expand trigger button */}
                <button
                  onClick={() => toggleExpand(n.neighborhood_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '8px 0',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'border-color var(--transition-fast)'
                  }}
                  className="nbhd-expand-btn"
                >
                  {isExpanded ? (
                    <>Hide Details <ChevronUp size={14} /></>
                  ) : (
                    <>Analyze DNA & Demographics <ChevronDown size={14} /></>
                  )}
                </button>

                {/* Expandable Details Section */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem', fontFamily: 'var(--font-body)' }}>
                        <div>
                          <span style={{ color: 'var(--color-text-muted)' }}>Population:</span>
                          <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{n.population?.toLocaleString()}</div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--color-text-muted)' }}>Avg Income:</span>
                          <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>₹{n.avg_household_income?.toLocaleString()}</div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--color-text-muted)' }}>Competition:</span>
                          <div style={{ fontWeight: 600, color: n.competition_intensity === 'High' ? 'var(--spice-500)' : 'var(--monsoon-500)' }}>{n.competition_intensity}</div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--color-text-muted)' }}>Professionals:</span>
                          <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{n.working_professionals_pct}%</div>
                        </div>
                      </div>

                      {/* Feature DNA breakdown */}
                      <div style={{ background: 'var(--color-surface)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Feature Breakdown</span>
                        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Price Sensitivity:</span>
                            <span style={{ fontWeight: 600 }}>{n.price_sensitivity || 'Medium'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Preferred Segments:</span>
                            <span style={{ fontWeight: 600, color: 'var(--peacock-500)' }}>Fresh Produce, Snacks</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
