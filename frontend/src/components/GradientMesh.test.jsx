import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import GradientMesh from '../components/GradientMesh';

describe('GradientMesh Component', () => {
  it('renders mesh background layers', () => {
    const { container } = render(<GradientMesh />);
    expect(container.querySelector('.mesh-bg')).toBeInTheDocument();
    expect(container.querySelector('.mesh-blob-1')).toBeInTheDocument();
    expect(container.querySelector('.mesh-blob-2')).toBeInTheDocument();
    expect(container.querySelector('.mesh-blob-3')).toBeInTheDocument();
  });
});
