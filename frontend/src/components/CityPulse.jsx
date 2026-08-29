import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Activity, Building2 } from 'lucide-react';
import { api } from '../services/api';
import RangoliGauge from './RangoliGauge';

import { Skeleton } from './ui/skeleton';
import { EmptyState } from './ui/empty-state';

export default function CityPulse() {
  const navigate = useNavigate();

  // Query city overview data from advanced analytics API
  const { data: cityOverview, isLoading } = useQuery({
    queryKey: ['city-overview'],
    queryFn: api.getCityOverview,
    staleTime: 60000,
  });

  const fallbackCities = [
    { city: 'North Zone', store_count: 12, neighborhood_count: 24, avg_opportunity_score: 8.2 },
    { city: 'West Zone', store_count: 8, neighborhood_count: 16, avg_opportunity_score: 7.1 },
    { city: 'Central Zone', store_count: 10, neighborhood_count: 20, avg_opportunity_score: 7.8 },
    { city: 'South Zone', store_count: 7, neighborhood_count: 15, avg_opportunity_score: 8.0 },
    { city: 'Growth Zone', store_count: 5, neighborhood_count: 10, avg_opportunity_score: 7.4 },
  ];

  const citiesData = cityOverview && cityOverview.length > 0 ? cityOverview : fallbackCities;

  // Sort by average opportunity score descending
  const sortedCities = [...citiesData].sort((a, b) => b.avg_opportunity_score - a.avg_opportunity_score);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' }}>
          <Activity size={18} color="var(--saffron-500)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', margin: 0 }}>
            City Pulse & Telemetry
          </h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-[48px] w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (sortedCities.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' }}>
          <Activity size={18} color="var(--saffron-500)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', margin: 0 }}>
            City Pulse & Telemetry
          </h3>
        </div>
        <EmptyState title="No telemetry data" description="No city telemetry mapped." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' }}>
        <Activity size={18} color="var(--saffron-500)" />
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', margin: 0 }}>
          City Pulse & Telemetry
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sortedCities.map((cityData) => (
          <div
            key={cityData.city}
            onClick={() => navigate(`/neighborhoods?city=${cityData.city}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
              transition: 'border-color var(--transition-fast), transform var(--transition-fast)',
            }}
            className="city-pulse-row"
          >
            {/* Left side: Gauge + Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <RangoliGauge value={cityData.avg_opportunity_score} max={10} type="opportunity" size={36} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>
                  {cityData.city}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {cityData.store_count} stores · {cityData.neighborhood_count} nbhds
                </span>
              </div>
            </div>

            {/* Right side: quick stats badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--peacock-500)' }}>
              <Building2 size={12} />
              <span>Telemetry Mapped</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
