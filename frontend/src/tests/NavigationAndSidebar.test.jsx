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

    expect(screen.getByText('Expansion Cockpit')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Forecast')).toBeInTheDocument();
    expect(screen.getByText('Neighborhoods')).toBeInTheDocument();
    expect(screen.getByText('Simulator')).toBeInTheDocument();
    expect(screen.getByText('Algorithm Lab')).toBeInTheDocument();
    expect(screen.getByText('Resilience Cockpit')).toBeInTheDocument();
    expect(screen.getByText('Playbooks')).toBeInTheDocument();
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
