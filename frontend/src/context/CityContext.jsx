import { createContext, useContext, useState } from 'react';

const CityContext = createContext(null);

export function CityProvider({ children }) {
  const [selectedCity, setSelectedCity] = useState('Bangalore');
  const cities = ['Bangalore', 'Delhi', 'Mumbai', 'Hyderabad', 'Pune'];

  return (
    <CityContext.Provider value={{ selectedCity, setSelectedCity, cities }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error('useCity must be used within a CityProvider');
  }
  return context;
}
