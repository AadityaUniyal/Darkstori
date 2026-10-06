import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCity } from '../context/CityContext';
import { api } from '../services/api';
import Map from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, GeoJsonLayer, TextLayer } from '@deck.gl/layers';
import { Maximize2, Minimize2, Layers, Loader2 } from 'lucide-react';

/* ── City coordinate defaults (worldwide) ──────────────────────────── */
const CITY_DEFAULTS = {
  // Indian cities
  'Bangalore':  { lat: 12.9716, lng: 77.5946, zoom: 11 },
  'Delhi':      { lat: 28.6139, lng: 77.2090, zoom: 11 },
  'Mumbai':     { lat: 19.0760, lng: 72.8777, zoom: 11 },
  'Hyderabad':  { lat: 17.3850, lng: 78.4867, zoom: 11 },
  'Pune':       { lat: 18.5204, lng: 73.8567, zoom: 11 },
  // World cities
  'New York':   { lat: 40.7128, lng: -74.0060, zoom: 11 },
  'London':     { lat: 51.5074, lng: -0.1278, zoom: 11 },
  'Tokyo':      { lat: 35.6762, lng: 139.6503, zoom: 11 },
  'Singapore':  { lat: 1.3521, lng: 103.8198, zoom: 11 },
  'Dubai':      { lat: 25.2048, lng: 55.2708, zoom: 11 },
  'Paris':      { lat: 48.8566, lng: 2.3522, zoom: 11 },
  'Sydney':     { lat: -33.8688, lng: 151.2093, zoom: 11 },
  'São Paulo':  { lat: -23.5505, lng: -46.6333, zoom: 11 },
  'Toronto':    { lat: 43.6532, lng: -79.3832, zoom: 11 },
  'Berlin':     { lat: 52.5200, lng: 13.4050, zoom: 11 },
  'Shanghai':   { lat: 31.2304, lng: 121.4737, zoom: 11 },
  'Seoul':      { lat: 37.5665, lng: 126.9780, zoom: 11 },
  // Fallback: world center
  Default: { lat: 20.0, lng: 0.0, zoom: 2 },
};

/* ── Theme-aware colors ──────────────────────────────────────────── */
const COLORS = {
  highScore:    [0, 113, 227, 210],    // Darkstori Cobalt
  medScore:     [56, 189, 248, 190],   // Radiant Cyan
  lowScore:     [134, 134, 139, 140],  // Space Gray
  competitor:   [255, 59, 48, 200],    // Apple Red
  activeStore:  [52, 199, 89, 240],    // Apple Green
  heatHigh:     [0, 113, 227, 160],    // Cobalt Glow
  heatMed:      [56, 189, 248, 130],   // Cyan Glow
  serviceCircle:[255, 255, 255, 30],
  label:        [245, 245, 247, 200],
};

function boundsFromPoints(points) {
  if (!points.length) return null;
  const lngs = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  return {
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };
}

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayers, setShowLayers] = useState(true);

  const { data: dynamicStores, isLoading: storesLoading } = useQuery({
    queryKey: ['stores', selectedCity],
    queryFn: () => api.getStores({ city: selectedCity, limit: 1000 }),
    enabled: !!selectedCity,
  });

  const { data: opportunityZones, isLoading: zonesLoading } = useQuery({
    queryKey: ['opportunity-zones', selectedCity],
    queryFn: () => api.getOpportunityZones(selectedCity),
    enabled: showHeatmap && !!selectedCity,
  });

  const isLoading = storesLoading || (showHeatmap && zonesLoading);
  const stores = dynamicStores?.stores || [];
  const zones = opportunityZones || [];

  // Resolve city center — try exact match, then partial match, then default
  const fallbackCenter = useMemo(() => {
    if (CITY_DEFAULTS[selectedCity]) return CITY_DEFAULTS[selectedCity];
    // Try case-insensitive partial match
    const key = Object.keys(CITY_DEFAULTS).find(
      k => k.toLowerCase() === (selectedCity || '').toLowerCase()
    );
    return key ? CITY_DEFAULTS[key] : CITY_DEFAULTS.Default;
  }, [selectedCity]);

  const allPoints = useMemo(() => {
    const merged = [
      ...neighborhoods.map((n) => [Number(n.lng || n.longitude || fallbackCenter.lng), Number(n.lat || n.latitude || fallbackCenter.lat)]),
      ...stores.map((s) => [Number(s.lng || s.longitude || fallbackCenter.lng), Number(s.lat || s.latitude || fallbackCenter.lat)]),
      ...zones.map((z) => [Number(z.lng || z.longitude || fallbackCenter.lng), Number(z.lat || z.latitude || fallbackCenter.lat)]),
      ...liveOrders.map((o) => [Number(o.lng || o.longitude || fallbackCenter.lng), Number(o.lat || o.latitude || fallbackCenter.lat)]),
    ];
    return merged.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]) && (p[0] !== 0 || p[1] !== 0));
  }, [neighborhoods, stores, zones, liveOrders, fallbackCenter.lng, fallbackCenter.lat]);

  const autoBounds = useMemo(() => boundsFromPoints(allPoints), [allPoints]);

  const initialViewState = useMemo(() => {
    if (Array.isArray(center) && center.length >= 2) {
      return { longitude: center[1], latitude: center[0], zoom: zoom || 11, pitch: 40, bearing: 0 };
    }
    if (center?.lng && center?.lat) {
      return { longitude: center.lng, latitude: center.lat, zoom: zoom || 11, pitch: 40, bearing: 0 };
    }
    if (autoBounds) {
      return {
        longitude: (autoBounds.minLng + autoBounds.maxLng) / 2,
        latitude: (autoBounds.minLat + autoBounds.maxLat) / 2,
        zoom: zoom || 10.2,
        pitch: 40,
        bearing: 0,
      };
    }
    return {
      longitude: fallbackCenter.lng,
      latitude: fallbackCenter.lat,
      zoom: zoom || fallbackCenter.zoom,
      pitch: 40,
      bearing: 0,
    };
  }, [center, zoom, autoBounds, fallbackCenter]);

  const layers = useMemo(() => {
    if (!showLayers) return [];

    const neighborhoodLayer = new ScatterplotLayer({
      id: 'neighborhoods',
      data: neighborhoods,
      getPosition: (d) => [Number(d.lng || d.longitude || initialViewState.longitude), Number(d.lat || d.latitude || initialViewState.latitude)],
      getFillColor: (d) => {
        const score = Number(d.opportunity_score || d.market_potential_score || 0);
        if (score >= 8.5) return COLORS.highScore;
        if (score >= 7) return COLORS.medScore;
        return COLORS.lowScore;
      },
      getRadius: (d) => 120 + Math.max(0, Number(d.opportunity_score || d.market_potential_score || 0)) * 8,
      radiusMinPixels: 4,
      radiusMaxPixels: 14,
      pickable: true,
      onClick: ({ object }) => onSelect && object && onSelect(object),
    });

    const competitorLayer = new ScatterplotLayer({
      id: 'competitors',
      data: stores.filter((s) => s.status === 'competitor'),
      getPosition: (d) => [d.lng, d.lat],
      getFillColor: COLORS.competitor,
      getRadius: 140,
      radiusMinPixels: 4,
      radiusMaxPixels: 10,
      pickable: true,
    });

    const activeStoreLayer = new ScatterplotLayer({
      id: 'active-stores',
      data: stores.filter((s) => s.status === 'active' || s.is_active),
      getPosition: (d) => [d.lng, d.lat],
      getFillColor: COLORS.activeStore,
      getRadius: 180,
      radiusMinPixels: 5,
      radiusMaxPixels: 12,
      pickable: true,
    });

    const heatLayer = showHeatmap && new ScatterplotLayer({
      id: 'opportunity-zones',
      data: zones,
      getPosition: (d) => [d.lng, d.lat],
      getFillColor: (d) => {
        const score = Number(d.opportunity_score || 0);
        return score > 8 ? COLORS.heatHigh : COLORS.heatMed;
      },
      getRadius: (d) => 220 + Number(d.opportunity_score || 0) * 25,
      radiusMinPixels: 8,
      radiusMaxPixels: 22,
      pickable: true,
    });

    const serviceCircleLayer = showHeatmap && new GeoJsonLayer({
      id: 'service-circles',
      data: stores.slice(0, 20).map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        properties: s,
      })),
      pointRadiusMinPixels: 0,
      pointRadiusMaxPixels: 0,
      stroked: true,
      filled: false,
      lineWidthMinPixels: 1,
      getLineColor: COLORS.serviceCircle,
      getPointRadius: 0,
      getLineWidth: 1,
    });

    return [neighborhoodLayer, competitorLayer, activeStoreLayer, heatLayer, serviceCircleLayer].filter(Boolean);
  }, [neighborhoods, stores, zones, showHeatmap, showLayers, initialViewState.longitude, initialViewState.latitude, onSelect]);

  const mapHeight = isFullscreen ? '80vh' : height;

  return (
    <div style={{ height: mapHeight, width: '100%', position: 'relative', borderRadius: '16px', overflow: 'hidden', transition: 'height 0.35s cubic-bezier(0.16, 1, 0.3, 1)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-md rounded-2xl">
          <div className="flex items-center gap-2.5 bg-[#0E121A]/90 px-4 py-2.5 rounded-xl border border-white/10 shadow-xl">
            <Loader2 size={16} className="animate-spin text-[#0071E3]" />
            <span className="text-xs font-semibold text-[#86868B]">Updating map telemetry...</span>
          </div>
        </div>
      )}

      {/* Map controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 bg-[#0E121A]/80 backdrop-blur-xl border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors shadow-lg"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <button
          onClick={() => setShowLayers(!showLayers)}
          className={`p-2 bg-[#0E121A]/80 backdrop-blur-xl border rounded-xl transition-colors shadow-lg ${showLayers ? 'border-[#0071E3]/50 text-[#38BDF8]' : 'border-white/10 text-[#86868B]'}`}
          title={showLayers ? 'Hide layers' : 'Show layers'}
        >
          <Layers size={14} />
        </button>
      </div>

      {/* Cupertino Frosted Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 bg-[#0E121A]/85 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/10 text-[11px] font-medium text-white shadow-lg">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#34C759]" />
          Active Hub
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FF3B30]" />
          Competitor
        </span>
        {showHeatmap && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#0071E3]" />
            Expansion Target
          </span>
        )}
      </div>

      <DeckGL
        initialViewState={initialViewState}
        controller={true}
        layers={layers}
        getTooltip={({ object }) => {
          if (!object) return null;
          const name = object.store_name || object.label || object.neighborhood_name || object.name;
          const score = object.opportunity_score || object.market_potential_score;
          if (score) return `${name} • Opportunity Score: ${Number(score).toFixed(1)}/10`;
          return name || `Active Order: ${object.platform || ''}`;
        }}
      >
        <Map
          mapLib={maplibregl}
          mapStyle="https://tiles.openfreemap.org/styles/dark"
          reuseMaps
          preventStyleDiffing={true}
        />
      </DeckGL>
    </div>
  );
}
