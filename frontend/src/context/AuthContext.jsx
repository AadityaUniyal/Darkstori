import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

function formatAuthError(err, fallback) {
  const detail = err?.response?.data?.detail ?? err?.response?.data?.error;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item?.msg) return item.msg.replace(/^Value error,\s*/i, '');
        return JSON.stringify(item);
      })
      .filter(Boolean)
      .join(', ');
  }
  if (typeof detail === 'string') {
    return detail;
  }
  return err?.message || fallback;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage token or auto-provision operator session
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
          setIsLoading(false);
          return;
        } else {
          localStorage.removeItem('auth_token');
        }
      } catch (e) {
        localStorage.removeItem('auth_token');
      }
    }

    // Auto-provision seamless operator session so user is never blocked
    api.demoLogin({
      id: 'executive',
      role: 'executive',
      title: 'Executive / Expansion Director',
      city: 'Bangalore'
    }).then((data) => {
      if (data?.access_token) {
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        setUser({
          id: payload.user_id || '6',
          email: payload.sub || 'executive@darkstori.demo',
          role: payload.role || 'director',
        });
        setIsAuthenticated(true);
      }
    }).catch(() => {
      setUser({
        id: '6',
        email: 'executive@darkstori.demo',
        role: 'director',
      });
      setIsAuthenticated(true);
    }).finally(() => {
      setIsLoading(false);
    });
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
      const message = formatAuthError(e, 'Login failed. Please check your credentials and try again.');
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
      const message = formatAuthError(e, 'Registration failed. Please try again.');
      throw new Error(message);
    }
  }, []);

  const demoLogin = useCallback(async (personaData) => {
    try {
      const data = await api.demoLogin(personaData);
      if (data.access_token) {
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        const loggedInUser = {
          id: payload.user_id || data.user_id || personaData.id,
          email: payload.sub || data.email || (personaData.id ? (personaData.id + '@darkstori.demo') : 'demo@darkstori.com'),
          role: payload.role || data.role || personaData.role || 'user',
        };
        setUser(loggedInUser);
        setIsAuthenticated(true);
        return data;
      }
    } catch (e) {
      const message = formatAuthError(e, 'Demo login failed.');
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
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, register, logout, setRole, demoLogin }}>
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
