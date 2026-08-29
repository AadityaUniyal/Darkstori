import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import React from 'react';
import { CityProvider, useCity } from '../context/CityContext';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    getFocusCities: vi.fn().mockResolvedValue([
      { id: 1, city_name: 'Bangalore', is_active: true },
      { id: 2, city_name: 'Delhi', is_active: true },
      { id: 3, city_name: 'Mumbai', is_active: true },
    ]),
  },
}));

function TestCityConsumer() {
  const { selectedCity, setSelectedCity, cities } = useCity();
  return (
    <div>
      <span data-testid="selected-city">{selectedCity}</span>
      <span data-testid="cities-count">{cities.length}</span>
      <button onClick={() => setSelectedCity('Mumbai')}>Select Mumbai</button>
    </div>
  );
}

describe('CityContext Tests', () => {
  it('loads focus cities list from API and sets default city', async () => {
    render(
      <CityProvider>
        <TestCityConsumer />
      </CityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('selected-city').textContent).toBe('Bangalore');
      expect(screen.getByTestId('cities-count').textContent).toBe('3');
    });
  });

  it('allows switching selected city to another active hub', async () => {
    render(
      <CityProvider>
        <TestCityConsumer />
      </CityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('selected-city').textContent).toBe('Bangalore');
    });

    act(() => {
      screen.getByText('Select Mumbai').click();
    });

    expect(screen.getByTestId('selected-city').textContent).toBe('Mumbai');
  });

  it('throws error when useCity is used outside CityProvider', () => {
    // Suppress console.error for expected error boundary test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestCityConsumer />)).toThrow(
      'useCity must be used within a CityProvider'
    );
    spy.mockRestore();
  });
});
