import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    login: vi.fn().mockImplementation(async (creds) => ({
      access_token: 'header.' + btoa(JSON.stringify({ sub: creds.email, role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600, user_id: 1 })) + '.signature',
      user_id: 1,
      email: creds.email,
      role: 'admin',
    })),
    logout: vi.fn(),
    register: vi.fn(),
  },
}));

function TestAuthConsumer() {
  const { user, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'AUTHENTICATED' : 'ANONYMOUS'}</span>
      <span data-testid="user-email">{user ? user.email : 'NONE'}</span>
      <span data-testid="user-role">{user ? user.role : 'NONE'}</span>
      <button onClick={() => login({ email: 'test@darkstori.in', password: 'secretpassword' })}>
        Login Action
      </button>
      <button onClick={() => logout()}>Logout Action</button>
    </div>
  );
}

describe('AuthContext Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('initializes in anonymous unauthenticated state when localStorage is empty', async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('ANONYMOUS');
      expect(screen.getByTestId('user-email').textContent).toBe('NONE');
    });
  });

  it('updates state to authenticated upon successful login and persists user profile', async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('ANONYMOUS');
    });

    await act(async () => {
      screen.getByText('Login Action').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('AUTHENTICATED');
      expect(screen.getByTestId('user-email').textContent).toBe('test@darkstori.in');
      expect(screen.getByTestId('user-role').textContent).toBe('admin');
    });
  });

  it('clears state on logout', async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Login Action').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('AUTHENTICATED');
    });

    act(() => {
      screen.getByText('Logout Action').click();
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('ANONYMOUS');
    expect(screen.getByTestId('user-email').textContent).toBe('NONE');
  });
});
