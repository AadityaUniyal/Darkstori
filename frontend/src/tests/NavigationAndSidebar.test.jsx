import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { CityProvider } from '../context/CityContext';
import { AuthProvider } from '../context/AuthContext';

describe('Navigation and Sidebar Component Tests', () => {
  it('renders all key navigation links in Sidebar', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Network Cockpit')).toBeInTheDocument();
    expect(screen.getByText('Performance Overview')).toBeInTheDocument();
    expect(screen.getByText('Freshness & Pricing')).toBeInTheDocument();
    expect(screen.getByText('Demand Forecast')).toBeInTheDocument();
    expect(screen.getByText('City Exploration')).toBeInTheDocument();
    expect(screen.getByText('Store Simulator')).toBeInTheDocument();
    expect(screen.getByText('System Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Automation Rules')).toBeInTheDocument();
  });

  it('renders Navbar brand and operational controls', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <CityProvider>
            <Navbar />
          </CityProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/darkstori/i)).toBeInTheDocument();
  });
});
