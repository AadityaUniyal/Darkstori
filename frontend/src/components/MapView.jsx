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
  highScore:    [16, 185, 129, 200],   // emerald
  medScore:     [245, 158, 11, 190],   // amber
  lowScore:     [244, 63, 94, 170],    // rose
  competitor:   [244, 63, 94, 215],    // rose
  activeStore:  [16, 185, 129, 255],   // emerald
  heatHigh:     [255, 122, 26, 190],   // orange
  heatMed:      [245, 158, 11, 170],   // amber
  serviceCircle:[255, 255, 255, 45],
  label:        [225, 230, 240, 180],
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
      return { longitude: center[1], latitude: center[0], zoom: zoom || 11, pitch: 45, bearing: 0 };
    }
    if (center?.lng && center?.lat) {
      return { longitude: center.lng, latitude: center.lat, zoom: zoom || 11, pitch: 45, bearing: 0 };
    }
    if (autoBounds) {
      return {
        longitude: (autoBounds.minLng + autoBounds.maxLng) / 2,
        latitude: (autoBounds.minLat + autoBounds.maxLat) / 2,
        zoom: zoom || 10.2,
        pitch: 45,
        bearing: 0,
      };
    }
    return {
      longitude: fallbackCenter.lng,
      latitude: fallbackCenter.lat,
      zoom: zoom || fallbackCenter.zoom,
      pitch: 45,
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
      getRadius: (d) => 140 + Math.max(0, Number(d.opportunity_score || d.market_potential_score || 0)) * 12,
      radiusMinPixels: 5,
      radiusMaxPixels: 18,
      pickable: true,
      onClick: ({ object }) => onSelect && object && onSelect(object),
    });

    const competitorLayer = new ScatterplotLayer({
      id: 'competitors',
      data: stores.filter((s) => s.status === 'competitor'),
      getPosition: (d) => [d.lng, d.lat],
      getFillColor: COLORS.competitor,
      getRadius: 170,
      radiusMinPixels: 4,
      radiusMaxPixels: 12,
      pickable: true,
    });

    const activeStoreLayer = new ScatterplotLayer({
      id: 'active-stores',
      data: stores.filter((s) => s.status === 'active' || s.is_active),
      getPosition: (d) => [d.lng, d.lat],
      getFillColor: COLORS.activeStore,
      getRadius: 210,
      radiusMinPixels: 5,
      radiusMaxPixels: 14,
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
      getRadius: (d) => 250 + Number(d.opportunity_score || 0) * 35,
      radiusMinPixels: 10,
      radiusMaxPixels: 28,
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

    const labels = new TextLayer({
      id: 'store-labels',
      data: stores.slice(0, 40),
      getPosition: (d) => [d.lng, d.lat],
      getText: (d) => d.store_name || d.platform || 'Store',
      getSize: 11,
      getColor: COLORS.label,
      getTextAnchor: 'start',
      getAlignmentBaseline: 'center',
      getPixelOffset: [10, 0],
      fontFamily: 'Inter, system-ui, sans-serif',
    });

    return [neighborhoodLayer, competitorLayer, activeStoreLayer, heatLayer, serviceCircleLayer, labels].filter(Boolean);
  }, [neighborhoods, stores, zones, showHeatmap, showLayers, initialViewState.longitude, initialViewState.latitude, onSelect]);

  const mapHeight = isFullscreen ? '80vh' : height;

  return (
    <div style={{ height: mapHeight, width: '100%', position: 'relative', borderRadius: '12px', overflow: 'hidden', transition: 'height 0.3s ease' }}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl">
          <div className="flex items-center gap-3 bg-card/90 px-4 py-3 rounded-lg border border-border">
            <Loader2 size={18} className="animate-spin text-emerald-500" />
            <span className="text-sm text-muted-foreground">Loading map data...</span>
          </div>
        </div>
      )}

      {/* Map controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 bg-card/80 backdrop-blur-sm border border-border rounded-lg hover:bg-accent/60 transition-colors"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <button
          onClick={() => setShowLayers(!showLayers)}
          className={`p-2 bg-card/80 backdrop-blur-sm border rounded-lg transition-colors ${showLayers ? 'border-emerald-500/50 text-emerald-400' : 'border-border text-muted-foreground'}`}
          title={showLayers ? 'Hide layers' : 'Show layers'}
        >
          <Layers size={14} />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex gap-3 bg-card/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-border text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgb(16,185,129)' }} />
          Active
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgb(244,63,94)' }} />
          Competitor
        </span>
        {showHeatmap && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgb(255,122,26)' }} />
            Opportunity
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
          if (score) return `${name} — Score: ${Number(score).toFixed(1)}/10`;
          return name || `Live Order: ${object.platform || ''}`;
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
