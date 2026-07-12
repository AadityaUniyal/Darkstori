import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCity } from '../context/CityContext';
import { api } from '../services/api';
import Map from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';

const METRO_BOUNDS = {
  Bangalore: { lat: 12.9716, lng: 77.5946, zoom: 11 },
  Delhi: { lat: 28.6139, lng: 77.2090, zoom: 11 },
  Mumbai: { lat: 19.0760, lng: 72.8777, zoom: 11 },
  Hyderabad: { lat: 17.3850, lng: 78.4867, zoom: 11 },
  Pune: { lat: 18.5204, lng: 73.8567, zoom: 11 },
};

export default function MapView({
  neighborhoods = [],
  center,
  zoom,
  height = '400px',
  liveOrders = [],
  showHeatmap = false,
  onSelect,
}) {
  const { selectedCity } = useCity();

  const cityCenter = METRO_BOUNDS[selectedCity] || METRO_BOUNDS.Bangalore;

  const initialViewState = {
    longitude: center?.lng || cityCenter.lng,
    latitude: center?.lat || cityCenter.lat,
    zoom: zoom || cityCenter.zoom,
    pitch: 45,
    bearing: 0
  };

  const { data: dynamicStores } = useQuery({
    queryKey: ['stores', selectedCity],
    queryFn: () => api.getStores({ city: selectedCity, limit: 1000 }),
    enabled: !!selectedCity,
  });

  const { data: opportunityZones } = useQuery({
    queryKey: ['opportunity-zones', selectedCity],
    queryFn: () => api.getOpportunityZones(selectedCity),
    enabled: showHeatmap && !!selectedCity,
  });

  const stores = dynamicStores?.stores || [];
  const zones = opportunityZones || [];

  const layers = useMemo(() => {
    return [
      // Opportunity Zones (Coverage Gaps)
      showHeatmap && new ScatterplotLayer({
        id: 'opportunity-zones',
        data: zones,
        getPosition: d => [d.lng, d.lat],
        getFillColor: d => {
          const score = d.opportunity_score || 0;
          return score > 8 ? [194, 59, 59, 150] : [232, 163, 61, 150]; // spice/marigold
        },
        getRadius: 1000,
        pickable: true,
      }),
      // Competitor Stores
      new ScatterplotLayer({
        id: 'competitors',
        data: stores.filter(s => s.status === 'competitor'),
        getPosition: d => [d.lng, d.lat],
        getFillColor: [194, 59, 59, 200], // spice
        getRadius: 150,
        pickable: true,
      }),
      // Active Stores
      new ScatterplotLayer({
        id: 'active-stores',
        data: stores.filter(s => s.status === 'active'),
        getPosition: d => [d.lng, d.lat],
        getFillColor: [14, 124, 134, 255], // peacock
        getRadius: 200,
        pickable: true,
      }),
      // Live Orders
      new ScatterplotLayer({
        id: 'live-orders',
        data: liveOrders,
        getPosition: d => [d.lng, d.lat],
        getFillColor: [255, 122, 26, 255], // saffron
        getRadius: 50,
        radiusMinPixels: 3,
        radiusMaxPixels: 10,
      })
    ].filter(Boolean);
  }, [stores, zones, liveOrders, showHeatmap]);

  return (
    <div style={{ height, width: '100%', position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
      <DeckGL
        initialViewState={initialViewState}
        controller={true}
        layers={layers}
        getTooltip={({object}) => object && (object.store_name || object.label || `Live Order: ${object.platform}`)}
      >
        <Map
          mapLib={maplibregl}
          mapStyle="https://tiles.openfreemap.org/styles/dark"
          preventStyleDiffing={true}
        />
      </DeckGL>
    </div>
  );
}
