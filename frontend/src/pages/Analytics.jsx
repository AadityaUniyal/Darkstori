import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MapPin, Search, Calendar, BarChart2, Download } from 'lucide-react';
import { api } from '../services/api';
import MapView from '../components/MapView';
import { useCity } from '../context/CityContext';
import './Analytics.css';

// Mock trend data for below-the-fold chart
const COVERAGE_TREND = [68, 70, 72, 71, 74, 78, 80, 82, 81, 84, 85, 88];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Analytics() {
  const { selectedCity, setSelectedCity, cities } = useCity();
  const [pinSearch, setPinSearch] = useState('');
  const [dateRange, setDateRange] = useState('30d');
  const [selectedPin, setSelectedPin] = useState(null);

  // Query coverage gaps data from API
  const { data: coverageData, isLoading } = useQuery({
    queryKey: ['coverage-gaps', selectedCity],
    queryFn: () => api.getCoverageGaps({ city: selectedCity }),
    staleTime: 60000,
  });

  const fallbackGaps = [
    { pincode: '560001', neighborhood_name: 'Koramangala Gaps', coverage_score: 35, orders_7d: 1240 },
    { pincode: '560034', neighborhood_name: 'HSR Layout South', coverage_score: 48, orders_7d: 850 },
    { pincode: '560008', neighborhood_name: 'Indiranagar Central', coverage_score: 55, orders_7d: 2100 },
    { pincode: '560095', neighborhood_name: 'Koramangala Extension', coverage_score: 72, orders_7d: 930 },
    { pincode: '560076', neighborhood_name: 'JP Nagar West', coverage_score: 84, orders_7d: 1540 },
  ];

  const gaps = coverageData && coverageData.length > 0 ? coverageData : fallbackGaps;

  // Filter based on PIN search
  const filteredGaps = gaps.filter(g => g.pincode.includes(pinSearch));

  // Sort by coverage score ascending (worst covered first)
  const rankedGaps = [...filteredGaps].sort((a, b) => a.coverage_score - b.coverage_score);

  // Map to format required by MapView
  const mapOpportunityZones = rankedGaps.map((g, idx) => ({
    centroid_lat: 12.9716 + (idx % 2 === 0 ? 0.025 : -0.025) * Math.sin(idx + 1),
    centroid_lng: 77.5946 + (idx % 2 === 0 ? -0.025 : 0.025) * Math.cos(idx + 1),
    opportunity_score: (100 - g.coverage_score), // Inverted: low coverage = high opportunity / gap
    zone_type: g.coverage_score < 40 ? 'saturated' : g.coverage_score < 75 ? 'growth' : 'greenfield',
    label: `PIN ${g.pincode}`
  }));

  const handleSelectPin = (pinData) => {
    setSelectedPin(pinData);
  };

  return (
    <div className="ana-page">
      {/* Sticky Filter Bar */}
      <div className="ana-filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <MapPin size={18} className="selector-icon" color="var(--peacock-500)" />
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="city-select-dropdown"
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '0.94rem', outline: 'none', cursor: 'pointer' }}
          >
            {cities.map((city) => (
              <option key={city} value={city} style={{ background: 'var(--color-bg)' }}>{city}</option>
            ))}
          </select>
        </div>

        <div className="ana-search-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search PIN Code..."
            value={pinSearch}
            onChange={(e) => setPinSearch(e.target.value)}
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </div>

        <div className="ana-date-wrap">
          <Calendar size={16} className="date-icon" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>

        <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Main Split Layout: Map + Ranked List */}
      <div className="ana-split-layout">
        {/* Left 60%: Map */}
        <div className="ana-map-section">
          <div style={{ marginBottom: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
              Hyperlocal Coverage Map
            </h2>
            <span className="badge badge-warning" style={{ background: 'var(--peacock-100)', color: 'var(--peacock-500)', border: 'none' }}>
              Coverage Gaps Highlighted (Red = Low Coverage)
            </span>
          </div>
          <MapView
            neighborhoods={mapOpportunityZones}
            showHeatmap={true}
            height="420px"
            onSelect={(zone) => {
              const matched = rankedGaps.find(g => `PIN ${g.pincode}` === zone.label);
              if (matched) handleSelectPin(matched);
            }}
          />
        </div>

        {/* Right 40%: Ranked List of worst-covered PINs */}
        <div className="ana-list-section">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
            Worst-Covered PIN Codes
          </h3>
          {isLoading ? (
            <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-8)' }}>Loading gaps...</div>
          ) : (
            <div className="ana-ranked-list">
              {rankedGaps.map((gap) => (
                <div
                  key={gap.pincode}
                  onClick={() => handleSelectPin(gap)}
                  className={`ana-ranked-row ${selectedPin?.pincode === gap.pincode ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.94rem' }}>
                      PIN {gap.pincode}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                      {gap.neighborhood_name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: gap.coverage_score < 40 ? 'var(--spice-500)' : gap.coverage_score < 75 ? 'var(--marigold-500)' : 'var(--monsoon-500)'
                    }}>
                      {gap.coverage_score}% Covered
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                      {gap.orders_7d} orders/7d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Below the Fold: Trend Chart */}
      <div className="glass-card" style={{ marginTop: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--space-4)' }}>
          <BarChart2 size={18} color="var(--peacock-500)" />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
            Overall Coverage Trend (12 Months)
          </h3>
        </div>

        {/* Recharts / Custom Canvas Line Chart fallback */}
        <div style={{ height: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative' }}>
          <div style={{ display: 'flex', height: '150px', alignItems: 'flex-end', gap: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
            {COVERAGE_TREND.map((val, idx) => (
              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                {/* Visual line point mockup */}
                <div style={{
                  height: `${val}%`,
                  width: '4px',
                  background: 'var(--monsoon-500)',
                  borderRadius: 'var(--radius-full)',
                  position: 'relative'
                }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: 'var(--monsoon-500)',
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 6px var(--monsoon-500)'
                  }} />
                </div>
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', marginTop: '8px', color: 'var(--color-text-muted)' }}>
                  {MONTHS[idx]}
                </span>
              </div>
            ))}
          </div>
          {/* Subtle area fill background grid lines */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: '20px', borderBottom: '1px dashed var(--color-border)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: '70px', borderBottom: '1px dashed var(--color-border)', pointerEvents: 'none' }} />
        </div>
      </div>
    </div>
  );
}
