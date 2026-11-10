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

    expect(screen.getByText('Pan-India Geo-Directory')).toBeInTheDocument();
    expect(screen.getByText('Metro NOC & Pod Mesh')).toBeInTheDocument();
    expect(screen.getByText('Catchment & Expansion')).toBeInTheDocument();
    expect(screen.getByText(/Demand & (Inbound Dock|Replenishment)/i)).toBeInTheDocument();
    expect(screen.getByText('Floor Twin & Heatmap')).toBeInTheDocument();
    expect(screen.getByText(/Dispatch & (COD Vault|Rider Swarm)/i)).toBeInTheDocument();
    expect(screen.getByText('Handheld Picker PWA')).toBeInTheDocument();
    expect(screen.getByText('Competitor Radar & Intel')).toBeInTheDocument();
    expect(screen.getByText('Disruption Playbooks')).toBeInTheDocument();
    expect(screen.getByText(/(EBITDA & Board Dossier|Unit Economics & EBITDA)/i)).toBeInTheDocument();
    expect(screen.getByText(/Vision (QA & Scale|Packing & QA)/i)).toBeInTheDocument();
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

    expect(screen.getByText(/DarkStori/i)).toBeInTheDocument();
  });
});
