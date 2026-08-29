import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MapPin, Search, Calendar, BarChart2, Download } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../services/api';
import LazyMapView from '../components/LazyMapView';
import { useCity } from '../context/CityContext';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/empty-state';
import { FALLBACK_COVERAGE_GAPS, FALLBACK_ORDER_TRENDS } from '../constants/fallbacks';
import './Analytics.css';

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

  // Query order trends for coverage trend chart
  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['order-trends', selectedCity, dateRange],
    queryFn: () => api.getOrderTrends({ city: selectedCity, days: dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30 }),
    staleTime: 60000,
  });

  const gaps = coverageData && coverageData.length > 0 ? coverageData : FALLBACK_COVERAGE_GAPS;

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
          <LazyMapView
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-[52px] w-full rounded-lg" />
              ))}
            </div>
          ) : rankedGaps.length === 0 ? (
            <EmptyState
              title="No PIN codes found"
              description="No coverage gaps match your PIN search filter."
            />
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
            Overall Coverage & Order Trend
          </h3>
        </div>

        {/* Recharts Area Chart */}
        {trendLoading ? (
          <Skeleton className="h-[220px] w-full rounded-lg" />
        ) : (
          <div style={{ width: '100%', height: '220px', marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData && trendData.length > 0 ? trendData : FALLBACK_ORDER_TRENDS}>
                <defs>
                  <linearGradient id="coverageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--peacock-500)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--peacock-500)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={12} tickFormatter={(val) => (val ? val.slice(5) : '')} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: '#12131C', border: '1px solid var(--color-border)', borderRadius: '8px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="orders" stroke="var(--peacock-500)" strokeWidth={2} fillOpacity={1} fill="url(#coverageGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
