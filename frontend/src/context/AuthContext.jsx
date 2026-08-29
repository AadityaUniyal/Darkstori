import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage token
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          setUser({
            id: payload.user_id,
            email: payload.sub,
            role: payload.role || 'user',
          });
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('auth_token');
        }
      } catch (e) {
        localStorage.removeItem('auth_token');
      }
    }
    setIsLoading(false);
  }, []);

  // Listen for global logout events
  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
      setIsAuthenticated(false);
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const login = useCallback(async (credentials) => {
    try {
      const data = await api.login(credentials);
      if (data.access_token) {
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        const loggedInUser = {
          id: payload.user_id || data.user_id,
          email: payload.sub || data.email,
          role: payload.role || data.role || 'user',
        };
        setUser(loggedInUser);
        setIsAuthenticated(true);
        return data;
      }
    } catch (e) {
      const message = e?.response?.data?.detail || e?.message || 'Login failed. Please check your credentials and try again.';
      throw new Error(message);
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      const data = await api.register(userData);
      if (data.access_token) {
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        const registeredUser = {
          id: payload.user_id || data.user_id,
          email: payload.sub || data.email,
          role: payload.role || data.role || 'user',
        };
        setUser(registeredUser);
        setIsAuthenticated(true);
        return data;
      }
    } catch (e) {
      const message = e?.response?.data?.detail || e?.message || 'Registration failed. Please try again.';
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const setRole = useCallback((newRole) => {
    setUser(prev => prev ? { ...prev, role: newRole } : null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, register, logout, setRole }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
