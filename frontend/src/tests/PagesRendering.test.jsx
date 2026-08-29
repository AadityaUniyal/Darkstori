import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from '../pages/NotFound';

describe('Page Rendering Tests', () => {
  it('renders NotFound (404) page with navigation link', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    const heading404 = screen.getByRole('heading', { level: 1, name: '404' });
    expect(heading404).toBeInTheDocument();
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    expect(screen.getByText('Return to Dashboard')).toBeInTheDocument();
  });
});
