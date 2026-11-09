import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '../services/api';

const CityContext = createContext(null);

export function CityProvider({ children }) {
  const [selectedCity, setSelectedCityState] = useState(() => {
    return localStorage.getItem('darkstor_selected_city') || 'Bangalore';
  });
  const [cities, setCities] = useState([
    'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 
    'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Kochi'
  ]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [citiesError, setCitiesError] = useState(false);

  const setSelectedCity = useCallback((city) => {
    if (!city) return;
    setSelectedCityState(city);
    localStorage.setItem('darkstor_selected_city', city);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadCities = async () => {
      try {
        const data = await api.getFocusCities();
        const names = (data || [])
          .map((city) => city.city_name || city.city)
          .filter(Boolean);
        if (mounted && names.length > 0) {
          setCitiesError(false);
          setCities(names);
          if (!localStorage.getItem('darkstor_selected_city')) {
            const defaultCity = names.includes('Bangalore') ? 'Bangalore' : names[0];
            setSelectedCity(defaultCity);
          }
        }
      } catch {
        if (mounted) {
          setCitiesError(false); // Gracefully preserve default cities
        }
      }
    };

    loadCities();
    return () => {
      mounted = false;
    };
  }, [setSelectedCity]);

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
    () => ({ selectedCity, currentCity: selectedCity, activeCity: selectedCity, setSelectedCity, setCity: setSelectedCity, cities, citiesError, addCity, selectedLocation, setSelectedLocation, selectLocation }),
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
