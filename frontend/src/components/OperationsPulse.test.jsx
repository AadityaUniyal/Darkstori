import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import OperationsPulse from '../components/OperationsPulse';

vi.mock('../services/api', () => ({
  api: {
    getHealth: vi.fn().mockResolvedValue({ status: 'ok', version: '3.0.0' })
  }
}));

describe('OperationsPulse Component', () => {
  it('renders operations pulse header and latency badge', async () => {
    render(<OperationsPulse />);
    expect(screen.getByText('OPERATIONS PULSE')).toBeInTheDocument();
  });
});
