import { useState, useRef, useEffect } from 'react';
import { useCity } from '../context/CityContext';
import { api } from '../services/api';
import { MapPin, Search, Loader2, Globe } from 'lucide-react';

export default function CitySelector() {
  const { selectedCity, setSelectedCity, cities, citiesError, addCity, selectLocation } = useCity();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Close search on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
        setSearchQuery('');
        setSearchResult(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Focus input when search opens
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError('');
    try {
      const result = await api.resolveLocation(searchQuery.trim());
      if (result && Number.isFinite(Number(result.lat)) && Number.isFinite(Number(result.lng))) {
        setSearchResult(result);
      } else {
        setSearchResult(null);
        setSearchError('No matching place was found. Try a more specific locality or PIN code.');
      }
    } catch (error) {
      setSearchResult(null);
      setSearchError(error?.response?.status === 503
        ? 'Place search is temporarily unavailable. Try again shortly.'
        : error?.response?.data?.detail || 'No matching place was found.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
    if (e.key === 'Escape') {
      setIsSearchOpen(false);
      setSearchQuery('');
      setSearchResult(null);
    }
  };

  const handleSelectSearchResult = () => {
    if (!searchResult) return;
    const cityName = searchResult.address?.city || searchResult.address?.town || searchResult.display_name?.split(',')[0] || searchQuery;
    if (addCity) addCity(cityName);
    setSelectedCity(cityName);
    selectLocation?.(searchResult);
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResult(null);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-1">
        {/* City dropdown */}
        <div className="flex items-center gap-1.5 bg-card/50 border border-border rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-accent/40 transition-colors">
          <MapPin size={14} className="text-emerald-500 shrink-0" />
          <select
              value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-transparent text-sm text-foreground outline-none cursor-pointer appearance-none pr-4 max-w-[120px]"
          >
            {!cities.length && <option value="">{citiesError ? 'Market list unavailable' : 'No configured markets'}</option>}
            {cities.map((city) => {
              const value = typeof city === 'string' ? city : city.city_name;
              return (
                <option key={value} value={value} className="bg-card text-foreground">
                  {value}
                </option>
              );
            })}
          </select>
        </div>

        {/* Search world button */}
        <button
          onClick={() => setIsSearchOpen(!isSearchOpen)}
          className="p-1.5 rounded-lg hover:bg-accent/40 transition-colors text-muted-foreground hover:text-foreground"
          title="Search a place or PIN code"
        >
          <Globe size={15} />
        </button>
      </div>

      {/* Search dropdown */}
      {isSearchOpen && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-[#0E121A]/95 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-2xl">
          <div className="p-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2 bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2">
              <Search size={14} className="text-white/40 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search any place or PIN code..."
                aria-label="Search map location"
                className="bg-transparent text-xs outline-none w-full text-white placeholder:text-white/35"
              />
              {isSearching ? (
                <Loader2 size={14} className="animate-spin text-[#FF9F1C] shrink-0" />
              ) : (
                <button onClick={handleSearch} className="text-xs text-[#FF9F1C] font-semibold shrink-0 hover:text-amber-400 cursor-pointer">
                  Go
                </button>
              )}
            </div>
          </div>

          {searchResult && (
            <button
              onClick={handleSelectSearchResult}
              className="w-full text-left px-4 py-3 hover:bg-accent/40 transition-colors flex items-start gap-3"
            >
              <MapPin size={16} className="text-emerald-500 mt-0.5 shrink-0" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">
                  {searchResult.display_name?.split(',').slice(0, 2).join(', ')}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {searchResult.display_name}
                </span>
                <span className="text-xs text-emerald-500/70 font-mono">
                  {searchResult.lat?.toFixed(4)}, {searchResult.lng?.toFixed(4)}
                </span>
              </div>
            </button>
          )}

          {!searchResult && !isSearching && searchQuery && (
            <div className="px-4 py-3 text-xs text-muted-foreground text-center" role="status">
              {searchError || 'Search a city, locality, PIN code, or address, then press Enter.'}
            </div>
          )}
          <p className="px-4 pb-3 text-[10px] text-white/35">Geocoded by OpenStreetMap contributors. Search is submitted only when you press Enter or Go.</p>
        </div>
      )}
    </div>
  );
}
