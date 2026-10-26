import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '../services/api';

const CityContext = createContext(null);

export function CityProvider({ children }) {
  const [selectedCity, setSelectedCity] = useState('');
  const [cities, setCities] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [citiesError, setCitiesError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadCities = async () => {
      try {
        const data = await api.getFocusCities();
        const names = (data || [])
          .map((city) => city.city_name || city.city)
          .filter(Boolean);
        if (mounted) {
          setCitiesError(false);
          setCities(names);
          if (!selectedCity && names.length > 0) {
            setSelectedCity(names[0]);
          }
        }
      } catch {
        if (mounted) {
          setCities([]);
          setCitiesError(true);
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

  const selectLocation = useCallback((location) => {
    if (!location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) return;
    setSelectedLocation({ ...location, lat: Number(location.lat), lng: Number(location.lng) });
    const cityName = location.address?.city || location.address?.town || location.address?.municipality;
    if (cityName) {
      setSelectedCity(cityName);
      setCities((prev) => prev.includes(cityName) ? prev : [...prev, cityName]);
    }
  }, []);

  const value = useMemo(
    () => ({ selectedCity, currentCity: selectedCity, setSelectedCity, setCity: setSelectedCity, cities, citiesError, addCity, selectedLocation, setSelectedLocation, selectLocation }),
    [selectedCity, cities, citiesError, addCity, selectedLocation, selectLocation]
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
