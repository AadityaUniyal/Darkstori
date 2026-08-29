import { useState, useRef, useEffect } from 'react';
import { useCity } from '../context/CityContext';
import { api } from '../services/api';
import { MapPin, Search, Loader2, Globe } from 'lucide-react';

export default function CitySelector() {
  const { selectedCity, setSelectedCity, cities, addCity } = useCity();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
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
    try {
      const result = await api.resolveLocation(searchQuery.trim());
      if (result && result.lat && result.lng) {
        setSearchResult(result);
      }
    } catch {
      setSearchResult(null);
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
          title="Search any city worldwide"
        >
          <Globe size={15} />
        </button>
      </div>

      {/* Search dropdown */}
      {isSearchOpen && (
        <div className="absolute top-full mt-2 right-0 w-72 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2 bg-background/50 border border-border rounded-lg px-3 py-2">
              <Search size={14} className="text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search any city..."
                className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground"
              />
              {isSearching ? (
                <Loader2 size={14} className="animate-spin text-emerald-500 shrink-0" />
              ) : (
                <button onClick={handleSearch} className="text-xs text-emerald-500 font-medium shrink-0 hover:text-emerald-400">
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
            <div className="px-4 py-3 text-xs text-muted-foreground text-center">
              Press Enter or click Go to search
            </div>
          )}
        </div>
      )}
    </div>
  );
}
