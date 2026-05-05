import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Store, Filter, Search, Layers } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../services/api';
import './LiveMap.css';

// Fix Leaflet default marker icon issue
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const LiveMap = () => {
  const [filters, setFilters] = useState({
    platform: 'all',
    cityTier: 'all',
    showCoverage: true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // India center
  const [mapZoom, setMapZoom] = useState(5);

  // Fetch stores data
  const { data: storesData, isLoading } = useQuery({
    queryKey: ['stores', filters],
    queryFn: () => api.getStores({
      platform: filters.platform !== 'all' ? filters.platform : undefined,
      city_tier: filters.cityTier !== 'all' ? filters.cityTier : undefined,
      limit: 1000,
    }),
  });

  // Fetch coverage gaps
  const { data: coverageData } = useQuery({
    queryKey: ['coverage-gaps'],
    queryFn: () => api.getCoverageGaps({ limit: 100 }),
  });

  // Platform colors
  const platformColors = {
    Blinkit: '#ff6b6b',
    Zepto: '#4ecdc4',
    Instamart: '#ffd93d',
    'Flipkart Minutes': '#95e1d3',
  };

  // Filter stores based on search
  const filteredStores = storesData?.filter(store => 
    searchQuery === '' || 
    store.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.pincode?.includes(searchQuery)
  ) || [];

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleStoreClick = (store) => {
    setMapCenter([store.latitude, store.longitude]);
    setMapZoom(13);
  };

  return (
    <div className="live-map-page">
      {/* Header */}
      <div className="map-header">
        <div className="header-content">
          <h1>Live Store Map</h1>
          <p>Real-time visualization of {filteredStores.length} dark stores across India</p>
        </div>
        
        {/* Search Bar */}
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by city or PIN code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="map-container-wrapper">
        {/* Sidebar Filters */}
        <div className="map-sidebar">
          <div className="filter-section">
            <h3><Filter size={18} /> Filters</h3>
            
            {/* Platform Filter */}
            <div className="filter-group">
              <label>Platform</label>
              <select 
                value={filters.platform}
                onChange={(e) => handleFilterChange('platform', e.target.value)}
              >
                <option value="all">All Platforms</option>
                <option value="Blinkit">Blinkit</option>
                <option value="Zepto">Zepto</option>
                <option value="Instamart">Instamart</option>
                <option value="Flipkart Minutes">Flipkart Minutes</option>
              </select>
            </div>

            {/* City Tier Filter */}
            <div className="filter-group">
              <label>City Tier</label>
              <select 
                value={filters.cityTier}
                onChange={(e) => handleFilterChange('cityTier', e.target.value)}
              >
                <option value="all">All Tiers</option>
                <option value="Metro">Metro</option>
                <option value="Tier1">Tier 1</option>
                <option value="Tier2">Tier 2</option>
                <option value="Tier3">Tier 3</option>
              </select>
            </div>

            {/* Coverage Toggle */}
            <div className="filter-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.showCoverage}
                  onChange={(e) => handleFilterChange('showCoverage', e.target.checked)}
                />
                <span>Show Coverage Gaps</span>
              </label>
            </div>
          </div>

          {/* Legend */}
          <div className="map-legend">
            <h3><Layers size={18} /> Legend</h3>
            <div className="legend-items">
              {Object.entries(platformColors).map(([platform, color]) => (
                <div key={platform} className="legend-item">
                  <div 
                    className="legend-color" 
                    style={{ backgroundColor: color }}
                  />
                  <span>{platform}</span>
                </div>
              ))}
              {filters.showCoverage && (
                <div className="legend-item">
                  <div className="legend-color coverage-gap" />
                  <span>Coverage Gap</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="map-stats">
            <div className="stat-item">
              <Store size={20} />
              <div>
                <span className="stat-value">{filteredStores.length}</span>
                <span className="stat-label">Stores</span>
              </div>
            </div>
            <div className="stat-item">
              <MapPin size={20} />
              <div>
                <span className="stat-value">
                  {coverageData?.total_opportunities || 0}
                </span>
                <span className="stat-label">Opportunities</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="map-content">
          {isLoading ? (
            <div className="map-loading">
              <div className="spinner"></div>
              <p>Loading map data...</p>
            </div>
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Store Markers */}
              {filteredStores.map((store) => (
                <Marker
                  key={store.id}
                  position={[store.latitude, store.longitude]}
                  eventHandlers={{
                    click: () => handleStoreClick(store),
                  }}
                >
                  <Popup>
                    <div className="store-popup">
                      <h4>{store.store_name || store.platform}</h4>
                      <p><strong>Platform:</strong> {store.platform}</p>
                      <p><strong>City:</strong> {store.city}</p>
                      <p><strong>PIN:</strong> {store.pincode || 'N/A'}</p>
                      <p><strong>Tier:</strong> {store.city_tier || 'N/A'}</p>
                      <span 
                        className="platform-badge"
                        style={{ backgroundColor: platformColors[store.platform] }}
                      >
                        {store.platform}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Coverage Gap Circles */}
              {filters.showCoverage && coverageData?.opportunities?.slice(0, 50).map((gap, idx) => (
                <Circle
                  key={`gap-${idx}`}
                  center={[gap.latitude, gap.longitude]}
                  radius={5000}
                  pathOptions={{
                    color: '#ff4757',
                    fillColor: '#ff4757',
                    fillOpacity: 0.2,
                  }}
                >
                  <Popup>
                    <div className="gap-popup">
                      <h4>Coverage Gap</h4>
                      <p><strong>City:</strong> {gap.city}</p>
                      <p><strong>PIN:</strong> {gap.pincode}</p>
                      <p><strong>Population:</strong> {gap.population?.toLocaleString()}</p>
                      <p><strong>Coverage:</strong> {gap.coverage_score}/4</p>
                      <span className="opportunity-badge">High Opportunity</span>
                    </div>
                  </Popup>
                </Circle>
              ))}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
