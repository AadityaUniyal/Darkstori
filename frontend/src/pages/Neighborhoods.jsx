import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass, Users, DollarSign, Activity, ChevronDown, ChevronUp,
  Search, SlidersHorizontal, Scale, Zap, ArrowRight, X, Building2, Flame
} from 'lucide-react';
import { api } from '../services/api';
import { useCity } from '../context/CityContext';
import AmbientBackground from '../components/AmbientBackground';
import RangoliGauge from '../components/RangoliGauge';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/empty-state';
import { FALLBACK_FOCUS_CITIES, FALLBACK_NEIGHBORHOODS } from '../constants/fallbacks';

export default function Neighborhoods() {
  const navigate = useNavigate();
  const { selectedCity } = useCity();
  const [activeCityName, setActiveCityName] = useState(selectedCity || 'All');
  const [searchQuery, setSearchQuery] = useState('');
  const [minScore, setMinScore] = useState(7.0);
  const [competitionFilter, setCompetitionFilter] = useState('All'); // 'All' | 'High' | 'Medium' | 'Low'
  const [sortBy, setSortBy] = useState('score'); // 'score' | 'population' | 'income'
  const [expandedCards, setExpandedCards] = useState({});
  const [selectedForCompare, setSelectedForCompare] = useState([]); // array of up to 2 items

  useEffect(() => {
    if (selectedCity && selectedCity !== 'Demo City') {
      setActiveCityName(selectedCity);
    }
  }, [selectedCity]);

  // Fetch Focus Cities
  const { data: cities } = useQuery({
    queryKey: ['focus-cities'],
    queryFn: () => api.getFocusCities(),
    staleTime: 60000,
  });

  const cityList = cities || FALLBACK_FOCUS_CITIES;

  // Fetch All Neighborhoods
  const { data: neighborhoods, isLoading } = useQuery({
    queryKey: ['neighborhoods-all'],
    queryFn: () => api.getNeighborhoods(),
    staleTime: 60000,
  });

  const neighborhoodList = neighborhoods && neighborhoods.length > 0 ? neighborhoods : FALLBACK_NEIGHBORHOODS;

  // Filter pipeline: City + Search + Score + Competition
  const filtered = neighborhoodList.filter(n => {
    // City filter
    if (activeCityName !== 'All') {
      const matchCity = (n.city || '').toLowerCase() === activeCityName.toLowerCase();
      const cityObj = cityList.find(c => c.city_id === n.city_id);
      const matchObj = cityObj ? (cityObj.city_name || '').toLowerCase() === activeCityName.toLowerCase() : false;
      if (!matchCity && !matchObj) return false;
    }

    // Search query filter (name or pincode)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (n.neighborhood_name || '').toLowerCase().includes(q);
      const pinMatch = (n.pincode || '').includes(q);
      const cityMatch = (n.city || '').toLowerCase().includes(q);
      if (!nameMatch && !pinMatch && !cityMatch) return false;
    }

    // Minimum Opportunity Score filter
    const score = n.market_potential_score || n.opportunity_score || 8.0;
    if (score < minScore) return false;

    // Competition filter
    if (competitionFilter !== 'All') {
      if ((n.competition_intensity || '').toLowerCase() !== competitionFilter.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'score') {
      return (b.market_potential_score || b.opportunity_score || 0) - (a.market_potential_score || a.opportunity_score || 0);
    } else if (sortBy === 'population') {
      return (b.population || 0) - (a.population || 0);
    } else {
      return (b.avg_household_income || 0) - (a.avg_household_income || 0);
    }
  });

  const toggleExpand = (id) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleCompare = (item) => {
    setSelectedForCompare(prev => {
      const exists = prev.some(p => p.neighborhood_id === item.neighborhood_id);
      if (exists) {
        return prev.filter(p => p.neighborhood_id !== item.neighborhood_id);
      }
      if (prev.length >= 2) {
        return [prev[1], item];
      }
      return [...prev, item];
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <AmbientBackground />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Compass color="#0071E3" size={32} /> Hyperlocal Micro-Market Intelligence
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.94rem', marginTop: '4px', fontFamily: 'var(--font-body)' }}>
            Filter, search, and evaluate micro-market demographics, consumer price sensitivity, and expansion opportunity scores across India.
          </p>
        </div>

        {selectedForCompare.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0, 113, 227, 0.15)', border: '1px solid #0071E3', padding: '8px 16px', borderRadius: '12px' }}>
            <Scale size={16} color="#38BDF8" />
            <span style={{ fontSize: '0.84rem', color: '#FFFFFF', fontWeight: 600 }}>
              Comparing ({selectedForCompare.length}/2): {selectedForCompare.map(c => c.neighborhood_name).join(' vs ')}
            </span>
            <button
              onClick={() => setSelectedForCompare([])}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '2px' }}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Interactive Filter Bar */}
      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 280px', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '10px 14px' }}>
            <Search size={16} color="var(--color-text-muted)" />
            <input
              type="text"
              placeholder="Search by locality, PIN (e.g. 560034), or metro hub..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#FFFFFF', fontSize: '0.88rem', width: '100%', outline: 'none' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* City Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {['All', 'Bangalore', 'Delhi', 'Mumbai', 'Hyderabad', 'Pune'].map((cityName) => (
              <button
                key={cityName}
                onClick={() => setActiveCityName(cityName)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  background: activeCityName === cityName ? '#0071E3' : 'rgba(255, 255, 255, 0.04)',
                  border: activeCityName === cityName ? '1px solid #0071E3' : '1px solid var(--color-border)',
                  color: activeCityName === cityName ? '#FFFFFF' : 'var(--color-text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}
              >
                {cityName === 'All' ? '🇮🇳 All Metros' : cityName}
              </button>
            ))}
          </div>
        </div>

        {/* Second Row: Sliders & Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '12px' }}>
          {/* Min Opportunity Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Min Potential Score: <strong style={{ color: '#38BDF8' }}>{minScore.toFixed(1)}/10</strong>
            </span>
            <input
              type="range" min={7.0} max={9.6} step={0.1}
              value={minScore} onChange={(e) => setMinScore(Number(e.target.value))}
              style={{ accentColor: '#0071E3', cursor: 'pointer' }}
            />
          </div>

          {/* Competition Intensity Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Competition:
            </span>
            {['All', 'High', 'Medium', 'Low'].map(lvl => (
              <button
                key={lvl}
                onClick={() => setCompetitionFilter(lvl)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  border: competitionFilter === lvl ? '1px solid #38BDF8' : '1px solid rgba(255,255,255,0.08)',
                  background: competitionFilter === lvl ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: competitionFilter === lvl ? '#38BDF8' : 'var(--color-text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Sort By Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Sort:
            </span>
            {[
              { id: 'score', label: '★ Opportunity' },
              { id: 'population', label: '👥 Population' },
              { id: 'income', label: '💰 Income' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setSortBy(opt.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  border: sortBy === opt.id ? '1px solid #10B981' : '1px solid rgba(255,255,255,0.08)',
                  background: sortBy === opt.id ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: sortBy === opt.id ? '#34D399' : 'var(--color-text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Modal / Floating Panel */}
      {selectedForCompare.length === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{
            background: 'rgba(14, 18, 26, 0.95)',
            border: '1px solid #0071E3',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 8px 32px rgba(0, 113, 227, 0.25)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Scale size={20} color="#0071E3" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>
                Head-to-Head Micro-Market Comparison
              </h3>
            </div>
            <button
              onClick={() => setSelectedForCompare([])}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {selectedForCompare.map((c, idx) => (
              <div key={c.neighborhood_id} style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: idx === 0 ? '1px solid rgba(0, 113, 227, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>{c.neighborhood_name}</h4>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: '#38BDF8' }}>PIN {c.pincode} · {c.city}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Market Potential Score:</span>
                    <strong style={{ color: '#38BDF8' }}>{c.market_potential_score || 9.0}/10</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Population Catchment:</span>
                    <strong>{c.population?.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Avg Annual Income:</span>
                    <strong>₹{c.avg_household_income?.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Working Professionals %:</span>
                    <strong>{c.working_professionals_pct}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Price Sensitivity:</span>
                    <strong style={{ color: c.price_sensitivity === 'Low' ? '#34C759' : '#F59E0B' }}>{c.price_sensitivity || 'Medium'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Active Dark Stores:</span>
                    <strong>{c.total_stores || 3} Stores</strong>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/simulator`)}
                  style={{
                    marginTop: '14px',
                    width: '100%',
                    padding: '8px 0',
                    borderRadius: '8px',
                    background: '#0071E3',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Zap size={14} /> Simulate Greenfield Hub in {c.neighborhood_name}
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Grid of Neighborhood Cards */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[220px] w-full rounded-xl" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No micro-markets found"
          description="No micro-market intelligence data matches your filter criteria. Try adjusting the city or lowering the potential threshold."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {sorted.map((n) => {
            const isExpanded = !!expandedCards[n.neighborhood_id];
            const isComparing = selectedForCompare.some(c => c.neighborhood_id === n.neighborhood_id);
            const score = n.market_potential_score || n.opportunity_score || 8.5;

            return (
              <div
                key={n.neighborhood_id}
                className="glass-card interactive"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  alignSelf: 'start',
                  border: isComparing ? '1px solid #0071E3' : '1px solid var(--color-border)',
                  background: isComparing ? 'rgba(0, 113, 227, 0.08)' : 'var(--color-surface)',
                  padding: '20px',
                  borderRadius: '16px',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', margin: 0 }}>
                      {n.neighborhood_name}
                    </h3>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span className="badge" style={{ background: 'rgba(0, 113, 227, 0.12)', color: '#38BDF8', fontSize: '0.74rem' }}>
                        PIN {n.pincode}
                      </span>
                      <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--color-text-secondary)', fontSize: '0.74rem' }}>
                        {n.city}
                      </span>
                    </div>
                  </div>
                  <RangoliGauge value={score} max={10} type="opportunity" size={54} />
                </div>

                {/* Micro Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Catchment Pop:</span>
                    <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{n.population?.toLocaleString()}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Household Income:</span>
                    <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>₹{(n.avg_household_income / 100000).toFixed(1)}L/yr</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Working Pros:</span>
                    <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#38BDF8' }}>{n.working_professionals_pct}%</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Competition:</span>
                    <div style={{ fontWeight: 600, color: n.competition_intensity === 'High' ? '#EF4444' : n.competition_intensity === 'Medium' ? '#F59E0B' : '#10B981' }}>
                      {n.competition_intensity} ({n.total_stores || 2} Hubs)
                    </div>
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleToggleCompare(n)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: '8px',
                      border: isComparing ? '1px solid #0071E3' : '1px solid var(--color-border)',
                      background: isComparing ? '#0071E3' : 'rgba(255,255,255,0.04)',
                      color: isComparing ? '#FFFFFF' : 'var(--color-text-secondary)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Scale size={13} /> {isComparing ? 'Comparing' : 'Compare'}
                  </button>

                  <button
                    onClick={() => navigate(`/simulator`)}
                    style={{
                      flex: 1.2,
                      padding: '8px 0',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #0071E3, #0284C7)',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Zap size={13} /> Simulate Hub
                  </button>
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
                    padding: '6px 0',
                    background: 'transparent',
                    border: '1px dashed var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isExpanded ? (
                    <>Hide DNA Insights <ChevronUp size={13} /></>
                  ) : (
                    <>Deep DNA & Basket Analysis <ChevronDown size={13} /></>
                  )}
                </button>

                {/* Expandable Details Section */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Price Sensitivity:</span>
                          <span style={{ fontWeight: 600, color: n.price_sensitivity === 'Low' ? '#34C759' : '#F59E0B' }}>{n.price_sensitivity || 'Medium'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Top Basket Drivers:</span>
                          <span style={{ fontWeight: 600, color: '#38BDF8' }}>Produce, Gourmet Dairy, Instant Cafe</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Peak Order Window:</span>
                          <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>08:00-10:30 & 19:00-22:30</span>
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
