import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import WeatherRadarCard from '../components/WeatherRadarCard';
import VrpDispatchCard from '../components/VrpDispatchCard';
import { CityProvider } from '../context/CityContext';

vi.mock('../services/api', () => ({
  api: {
    getStoreWeatherAlert: vi.fn().mockResolvedValue({
      city: 'Bangalore',
      temperature_c: 29.2,
      precipitation_mm: 0.0,
      condition: 'Clear',
      is_rainy: false,
      surge_multiplier: 1.0,
      alert: null
    }),
    getBatchDispatch: vi.fn().mockResolvedValue({
      store_id: 1,
      store_name: 'Indiranagar Hub #01',
      vrp_metrics: {
        total_orders: 8,
        riders_required: 3,
        distance_saved_km: 4.8,
        cost_savings_pct: 32.5,
        co2_saved_kg: 0.41,
        batches: [
          {
            batch_id: 'DISPATCH-B01',
            rider_id: 'RIDER-101',
            orders_count: 3,
            total_route_distance_km: 3.2,
            total_route_duration_mins: 12.5,
            batch_sla_status: 'GREEN',
            orders: [
              { sequence_stop: 1, order_id: 'ORD-401', customer_id: 'CUST-101', est_delivery_mins: 5.2 },
              { sequence_stop: 2, order_id: 'ORD-402', customer_id: 'CUST-102', est_delivery_mins: 8.8 },
              { sequence_stop: 3, order_id: 'ORD-403', customer_id: 'CUST-103', est_delivery_mins: 12.5 }
            ]
          }
        ]
      }
    })
  }
}));

describe('Operations Cards Tests', () => {
  it('renders WeatherRadarCard with temperature and surge telemetry', async () => {
    render(
      <CityProvider>
        <WeatherRadarCard storeId={1} />
      </CityProvider>
    );
    expect(screen.getByText('Hyperlocal Weather Radar')).toBeInTheDocument();
  });

  it('renders VrpDispatchCard with Clarke-Wright Savings metrics', async () => {
    render(
      <CityProvider>
        <VrpDispatchCard storeId={1} />
      </CityProvider>
    );
    expect(screen.getByText('VRP Dispatch & Multi-Drop Batching')).toBeInTheDocument();
  });
});
