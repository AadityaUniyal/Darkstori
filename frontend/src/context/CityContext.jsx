import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '../services/api';

const CityContext = createContext(null);

const DEFAULT_CITY = 'Demo City';

export function CityProvider({ children }) {
  const [selectedCity, setSelectedCity] = useState(DEFAULT_CITY);
  const [cities, setCities] = useState([DEFAULT_CITY]);

  useEffect(() => {
    let mounted = true;

    const loadCities = async () => {
      try {
        const data = await api.getFocusCities();
        const names = (data || [])
          .map((city) => city.city_name || city.city)
          .filter(Boolean);
        if (mounted && names.length > 0) {
          setCities(names);
          if (!names.includes(selectedCity)) {
            setSelectedCity(names[0]);
          }
        }
      } catch {
        if (mounted) {
          setCities([DEFAULT_CITY]);
        }
      }
    };

    loadCities();
    return () => {
      mounted = false;
    };
  }, []);

  // Allow dynamic city addition (e.g., from worldwide search)
  const addCity = useCallback((cityName) => {
    if (!cityName) return;
    setCities((prev) => {
      if (prev.includes(cityName)) return prev;
      return [...prev, cityName];
    });
  }, []);

  const value = useMemo(
    () => ({ selectedCity, setSelectedCity, cities, addCity }),
    [selectedCity, cities, addCity]
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity() {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error('useCity must be used within a CityProvider');
  }
  return context;
}
