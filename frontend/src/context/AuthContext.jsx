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

  // Initialize from existing real session in localStorage
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          const savedStoreRaw = localStorage.getItem('darkstori_active_store');
          const savedStore = savedStoreRaw ? JSON.parse(savedStoreRaw) : null;
          setUser({
            id: payload.user_id,
            email: payload.sub,
            role: payload.role || 'user',
            organization_id: payload.organization_id || null,
            store: savedStore,
            isDemo: Boolean(payload.sub?.includes('demo')),
          });
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        } else {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
        }
      } catch (e) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
      }
    }

    // Default to clean unauthenticated state — user must register or sign in
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
  }, []);

  // Listen for global logout events
  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('darkstori_active_store');
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const login = useCallback(async (credentials) => {
    try {
      const data = await api.login(credentials);
      if (data.access_token) {
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        const storeData = data.store_name ? {
          id: data.store_id,
          name: data.store_name,
          city: data.city
        } : null;

        if (storeData) {
          localStorage.setItem('darkstori_active_store', JSON.stringify(storeData));
          if (data.city) localStorage.setItem('darkstori_selected_city', data.city);
        }

        const loggedInUser = {
          id: payload.user_id || data.user_id,
          email: payload.sub || data.email,
          role: payload.role || data.role || 'user',
          organization_id: data.organization_id || payload.organization_id || null,
          store: storeData,
          isDemo: false
        };
        setUser(loggedInUser);
        setIsAuthenticated(true);
        return data;
      }
    } catch (e) {
      const message = formatAuthError(e, 'Login failed. Please verify your email and password.');
      throw new Error(message);
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      const data = await api.register(userData);
      if (data.access_token) {
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        const storeData = {
          id: data.store_id || 1,
          name: userData.store_name || `DarkStori - ${userData.organization || 'My Hub'} Pod 01`,
          city: userData.city || 'Bangalore',
          pincode: userData.pincode || '560034',
          sla: userData.sla || '10m',
          fleet: userData.fleet || 12
        };

        localStorage.setItem('darkstori_active_store', JSON.stringify(storeData));
        if (userData.city) localStorage.setItem('darkstori_selected_city', userData.city);

        const registeredUser = {
          id: payload.user_id || data.user_id,
          email: payload.sub || data.email,
          role: userData.role || payload.role || 'executive',
          organization_id: data.organization_id || payload.organization_id || null,
          full_name: userData.full_name,
          store: storeData,
          isDemo: false,
          isNewUser: true
        };
        setUser(registeredUser);
        setIsAuthenticated(true);
        return data;
      }
    } catch (e) {
      const message = formatAuthError(e, 'Registration failed. Please check password criteria (min 8 chars, 1 uppercase, 1 digit).');
      throw new Error(message);
    }
  }, []);

  const demoLogin = useCallback(async (personaData) => {
    try {
      const data = await api.demoLogin(personaData);
      if (data.access_token) {
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        const demoStore = {
          id: 1,
          name: `DarkStori - ${personaData.city || 'Bangalore'} Flagship Pod`,
          city: personaData.city || 'Bangalore',
          sla: '10m',
          fleet: 18
        };
        localStorage.setItem('darkstori_active_store', JSON.stringify(demoStore));
        if (personaData.city) localStorage.setItem('darkstori_selected_city', personaData.city);

        const loggedInUser = {
          id: payload.user_id || data.user_id || personaData.id,
          email: payload.sub || data.email || `${personaData.id}@darkstori.demo`,
          role: payload.role || data.role || personaData.role || 'executive',
          store: demoStore,
          isDemo: true
        };
        setUser(loggedInUser);
        setIsAuthenticated(true);
        return data;
      }
    } catch (e) {
      const message = formatAuthError(e, 'Demo session initialization failed.');
      throw new Error(message);
    }
  }, []);

  const updateUserStore = useCallback((newStoreData) => {
    localStorage.setItem('darkstori_active_store', JSON.stringify(newStoreData));
    if (newStoreData.city) localStorage.setItem('darkstori_selected_city', newStoreData.city);
    setUser(prev => prev ? { ...prev, store: newStoreData } : null);
  }, []);

  const logout = useCallback(() => {
    api.logout();
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('darkstori_active_store');
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  }, []);

  const setRole = useCallback((newRole) => {
    setUser(prev => prev ? { ...prev, role: newRole } : null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      login,
      register,
      demoLogin,
      logout,
      setRole,
      updateUserStore
    }}>
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
