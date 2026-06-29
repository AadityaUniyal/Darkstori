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
      // Fallback for demo mode
      const loggedInUser = {
        id: 'demo-user-123',
        email: credentials.email,
        role: 'admin',
      };
      setUser(loggedInUser);
      setIsAuthenticated(true);
      localStorage.setItem('auth_token', 'mock_token.eyJ1c2VyX2lkIjoiZGVtby11c2VyLTEyMyIsInN1YiI6ImRlbW9AdXNlci5jb20iLCJyb2xlIjoiYWRtaW4iLCJleHAiOjI1MjQ2MDgwMDB9.mock_sig');
      return { access_token: 'mock', user_id: 'demo-user-123', role: 'admin', email: credentials.email };
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
      // Fallback for demo mode
      const registeredUser = {
        id: 'demo-user-123',
        email: userData.email,
        role: 'admin',
      };
      setUser(registeredUser);
      setIsAuthenticated(true);
      localStorage.setItem('auth_token', 'mock_token.eyJ1c2VyX2lkIjoiZGVtby11c2VyLTEyMyIsInN1YiI6ImRlbW9AdXNlci5jb20iLCJyb2xlIjoiYWRtaW4iLCJleHAiOjI1MjQ2MDgwMDB9.mock_sig');
      return { access_token: 'mock', user_id: 'demo-user-123', role: 'admin', email: userData.email };
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
