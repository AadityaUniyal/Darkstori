import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '../services/api';

const CityContext = createContext(null);

export function CityProvider({ children }) {
  const [selectedCity, setSelectedCityState] = useState(() => {
    return localStorage.getItem('darkstori_selected_city') || localStorage.getItem('darkstor_selected_city') || 'Bangalore';
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
    localStorage.setItem('darkstori_selected_city', city);
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
          if (!localStorage.getItem('darkstori_selected_city') && !localStorage.getItem('darkstor_selected_city')) {
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

  const value = useMemo(
    () => ({
      selectedCity,
      setSelectedCity,
      activeCity: selectedCity,
      setActiveCity: setSelectedCity,
      currentCity: selectedCity,
      setCity: setSelectedCity,
      cities,
      selectedLocation,
      setSelectedLocation,
      citiesError,
    }),
    [selectedCity, setSelectedCity, cities, selectedLocation, citiesError]
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
