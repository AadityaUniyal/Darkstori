import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Users,
  DollarSign,
  TrendingUp,
  Award,
  Search,
  FileDown,
  Activity,
  ArrowRight,
  Compass,
  PieChart,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { api } from '../services/api';
import AmbientBackground from '../components/AmbientBackground';
import AnimatedCard from '../components/AnimatedCard';
import StaggerChildren from '../components/StaggerChildren';

export default function Neighborhoods() {
  const [selectedCityId, setSelectedCityId] = useState(1);
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch Focus Cities
  const { data: cities, isLoading: isCitiesLoading } = useQuery({
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

  const activeCity = cityList.find((c) => c.city_id === selectedCityId) || cityList[0];

  // Fetch Neighborhoods for Selected City
  const { data: neighborhoods, isLoading: isNeighborhoodsLoading } = useQuery({
    queryKey: ['neighborhoods', selectedCityId],
    queryFn: () => api.getNeighborhoods(selectedCityId),
    staleTime: 30000,
  });

  const neighborhoodList = neighborhoods || [
    { neighborhood_id: 1, city_id: 1, neighborhood_name: 'Koramangala', pincode: '560034', population: 150000, avg_age: 28.5, avg_household_income: 950000.0, working_professionals_pct: 72.0, price_sensitivity: 'High', total_stores: 3, competition_intensity: 'High', market_potential_score: 9.2, opportunity_rank: 1, area_sqkm: 5.5, population_density: 27272 },
    { neighborhood_id: 2, city_id: 1, neighborhood_name: 'Indiranagar', pincode: '560038', population: 120000, avg_age: 29.2, avg_household_income: 1100000.0, working_professionals_pct: 68.0, price_sensitivity: 'High', total_stores: 4, competition_intensity: 'High', market_potential_score: 8.9, opportunity_rank: 2, area_sqkm: 4.8, population_density: 25000 },
    { neighborhood_id: 3, city_id: 1, neighborhood_name: 'HSR Layout', pincode: '560102', population: 180000, avg_age: 27.8, avg_household_income: 850000.0, working_professionals_pct: 75.0, price_sensitivity: 'Medium', total_stores: 3, competition_intensity: 'Medium', market_potential_score: 8.2, opportunity_rank: 3, area_sqkm: 6.2, population_density: 29032 },
  ];

  // Fetch DNA for Selected Neighborhood
  const { data: neighborhoodDNA, isLoading: isDNALoading } = useQuery({
    queryKey: ['neighborhood-dna', selectedNeighborhoodId],
    queryFn: () => api.getNeighborhoodDNA(selectedNeighborhoodId),
    enabled: !!selectedNeighborhoodId,
    staleTime: 30000,
  });

  const activeDNA = neighborhoodDNA || {
    dna_id: selectedNeighborhoodId,
    neighborhood_id: selectedNeighborhoodId,
    dominant_demographic: 'Young Professionals & Techies',
    lifestyle_profile: 'Premium lifestyle, high convenience dependency, late-night snacking orders',
    order_triggers: { Rain: 1.45, Heatwave: 1.3, Festival: 1.6, FridayNight: 1.5 },
    peak_times: { Morning: '08:00 - 11:00', Evening: '18:00 - 21:00', LateNight: '23:00 - 02:00' },
    preferred_categories: { 'Fresh Fruits & Veg': 0.35, 'Dairy & Breakfast': 0.28, 'Snacks & Beverages': 0.22, 'Gourmet Produce': 0.15 },
    loyalty_pattern: 'Platform switcher (highly coupon sensitive)',
    growth_trajectory: 'Robust upward trend (+22% YoY orders)',
    opportunity_score: 9.2,
  };

  const activeNeighborhood = neighborhoodList.find(
    (n) => n.neighborhood_id === selectedNeighborhoodId
  ) || neighborhoodList[0];

  const filteredNeighborhoods = neighborhoodList.filter((n) =>
    n.neighborhood_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.pincode.includes(searchQuery)
  );

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await api.exportNeighborhoodsCSV(activeCity.city_name);
    } catch (err) {
      console.error('Failed to export neighborhoods CSV', err);
    } finally {
      setIsExporting(false);
    }
  };

  const selectCity = (cityId) => {
    setSelectedCityId(cityId);
    // Auto-select first neighborhood of the chosen city
    const firstOfCity = neighborhoodList.find((n) => n.city_id === cityId);
    if (firstOfCity) {
      setSelectedNeighborhoodId(firstOfCity.neighborhood_id);
    } else {
      // Find the first default neighborhood for that city
      const defaults = [
        { id: 1, city: 1 }, { id: 2, city: 1 }, { id: 3, city: 1 },
        { id: 4, city: 2 }, { id: 5, city: 4 }, { id: 6, city: 3 }
      ];
      const match = defaults.find((d) => d.city === cityId);
      setSelectedNeighborhoodId(match ? match.id : 1);
    }
  };

  return (
    <div style={{ padding: '24px', color: '#e2e8f0', fontFamily: 'Inter, sans-serif', minHeight: '100vh' }}>
      <AmbientBackground />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Compass color="#a855f7" size={32} /> Neighborhood Intelligence
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
            Demographic heat profiling, consumer persona mapping, and geographic expansion opportunities
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
            border: 'none',
            borderRadius: '10px',
            color: '#ffffff',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
            transition: 'transform 0.2s, opacity 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FileDown size={18} />
          {isExporting ? 'Exporting...' : 'Export Intelligence Report'}
        </button>
      </div>

      {/* City Selector Pill Bar */}
      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '24px' }}>
        {cityList.map((c) => (
          <button
            key={c.city_id}
            onClick={() => selectCity(c.city_id)}
            style={{
              padding: '10px 20px',
              borderRadius: '9999px',
              background: selectedCityId === c.city_id ? 'rgba(168, 85, 247, 0.15)' : 'rgba(30, 41, 59, 0.45)',
              border: selectedCityId === c.city_id ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.08)',
              color: selectedCityId === c.city_id ? '#d8b4fe' : '#94a3b8',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.25s ease',
            }}
          >
            {c.city_name}
            <span style={{
              marginLeft: '8px',
              fontSize: '0.74rem',
              opacity: 0.7,
              background: selectedCityId === c.city_id ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              {c.total_dark_stores} stores
            </span>
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Sidebar - Neighborhood List */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.45)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto'
        }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text"
              placeholder="Search pincode or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 10px 10px 36px',
                background: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', paddingLeft: '4px' }}>
              Neighborhoods ({filteredNeighborhoods.length})
            </div>

            {filteredNeighborhoods.length > 0 ? (
              filteredNeighborhoods.map((n) => (
                <button
                  key={n.neighborhood_id}
                  onClick={() => setSelectedNeighborhoodId(n.neighborhood_id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: selectedNeighborhoodId === n.neighborhood_id ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    border: selectedNeighborhoodId === n.neighborhood_id ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid transparent',
                    color: '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedNeighborhoodId !== n.neighborhood_id) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedNeighborhoodId !== n.neighborhood_id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.94rem' }}>{n.neighborhood_name}</span>
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      color: n.market_potential_score >= 9.0 ? '#10b981' : n.market_potential_score >= 8.0 ? '#a855f7' : '#f59e0b',
                      background: 'rgba(255,255,255,0.02)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {n.market_potential_score} ★
                    </span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>PIN Code: {n.pincode}</span>
                </button>
              ))
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
                No neighborhoods match search
              </div>
            )}
          </div>
        </div>

        {/* Right Area - Selected Neighborhood Demographics & DNA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Demographic Card Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <AnimatedCard delay={0.05}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '10px' }}>
                  <Users color="#a855f7" size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Population</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                    {activeNeighborhood?.population?.toLocaleString()}
                  </div>
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={0.1}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px' }}>
                  <DollarSign color="#10b981" size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Avg Income (INR)</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                    ₹{activeNeighborhood?.avg_household_income?.toLocaleString()}
                  </div>
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={0.15}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px' }}>
                  <Activity color="#3b82f6" size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Working Pros</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                    {activeNeighborhood?.working_professionals_pct}%
                  </div>
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={0.2}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '10px' }}>
                  <Award color="#fbbf24" size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Opportunity Index</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                    {activeNeighborhood?.market_potential_score} / 10
                  </div>
                </div>
              </div>
            </AnimatedCard>
          </div>

          {/* DNA Details Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
            
            {/* Behavior & DNA Profile */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Flame color="#fbbf24" size={20} /> Local Consumer DNA Profile
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '4px' }}>
                  Hyper-local demographic preferences, order incentives and speed requirements
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Dominant Persona</span>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>
                    {activeDNA.dominant_demographic}
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Lifestyle Profile</span>
                  <div style={{ fontSize: '0.9rem', color: '#e2e8f0', marginTop: '4px', lineHeight: '1.5' }}>
                    {activeDNA.lifestyle_profile}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px' }}>
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Growth Trajectory</span>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
                      {activeDNA.growth_trajectory}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px' }}>
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Loyalty Pattern</span>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fbbf24', marginTop: '4px' }}>
                      {activeDNA.loyalty_pattern}
                    </div>
                  </div>
                </div>

                {/* Preferred Categories progress bars */}
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                    Preferred Product Categories
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(activeDNA.preferred_categories).map(([category, val]) => (
                      <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                          <span style={{ color: '#ffffff', fontWeight: 600 }}>{category}</span>
                          <span style={{ color: '#a855f7', fontWeight: 700 }}>{(val * 100).toFixed(0)}%</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${val * 100}%`, background: 'linear-gradient(90deg, #a855f7, #6366f1)', borderRadius: '3px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Demographics & Competition Analysis */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Competition Card */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.45)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '24px',
              }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert color="#f59e0b" size={16} /> Market Saturation
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Competitor Stores</span>
                    <strong style={{ color: '#ffffff' }}>{activeNeighborhood?.total_stores} stores</strong>
                  </div>
                  <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Competition Level</span>
                    <strong style={{ color: activeNeighborhood?.competition_intensity === 'High' ? '#ef4444' : '#10b981' }}>
                      {activeNeighborhood?.competition_intensity}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Price Sensitivity</span>
                    <strong style={{ color: '#60a5fa' }}>{activeNeighborhood?.price_sensitivity}</strong>
                  </div>
                  <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', paddingBottom: '4px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Density</span>
                    <strong style={{ color: '#ffffff' }}>
                      {activeNeighborhood?.population_density ? Math.round(activeNeighborhood.population_density).toLocaleString() : 'N/A'} / km²
                    </strong>
                  </div>
                </div>
              </div>

              {/* Order Triggers Weather/Monsoon */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.45)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '24px',
              }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp color="#10b981" size={16} /> Demand Multipliers
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.76rem', marginTop: '-10px', marginBottom: '16px' }}>
                  Order surge multipliers under specific seasonal or atmospheric triggers
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(activeDNA.order_triggers).map(([trigger, multiplier]) => (
                    <div key={trigger} style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>{trigger} Surge</span>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.1)',
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}>
                        {multiplier}x
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
