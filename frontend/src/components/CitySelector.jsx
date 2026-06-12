import { useCity } from '../context/CityContext';
import { MapPin } from 'lucide-react';
import './CitySelector.css';

export default function CitySelector() {
  const { selectedCity, setSelectedCity, cities } = useCity();

  return (
    <div className="city-selector">
      <MapPin className="selector-icon" size={16} />
      <select
        value={selectedCity}
        onChange={(e) => setSelectedCity(e.target.value)}
        className="city-select-dropdown"
      >
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
    </div>
  );
}
