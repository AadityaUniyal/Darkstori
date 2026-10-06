import { useMemo, useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCity } from '../context/CityContext';
import { api } from '../services/api';
import Map from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import { Maximize2, Minimize2, Layers, Loader2, Navigation } from 'lucide-react';

/* ── City coordinate defaults (worldwide) ──────────────────────────── */
const CITY_DEFAULTS = {
  // Indian hubs
  'Bangalore':  { lat: 12.9716, lng: 77.5946, zoom: 12 },
  'Bengaluru':  { lat: 12.9716, lng: 77.5946, zoom: 12 },
  'Delhi':      { lat: 28.6139, lng: 77.2090, zoom: 11 },
  'Mumbai':     { lat: 19.0760, lng: 72.8777, zoom: 11 },
  'Hyderabad':  { lat: 17.3850, lng: 78.4867, zoom: 11 },
  'Pune':       { lat: 18.5204, lng: 73.8567, zoom: 12 },
  'Chennai':    { lat: 13.0827, lng: 80.2707, zoom: 11 },
  'Kolkata':    { lat: 22.5726, lng: 88.3639, zoom: 11 },
  'Ahmedabad':  { lat: 23.0225, lng: 72.5714, zoom: 11 },
  'Gurgaon':    { lat: 28.4595, lng: 77.0266, zoom: 12 },
  'Noida':      { lat: 28.5355, lng: 77.3910, zoom: 12 },
  // World hubs
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
  // Fallback: Default center
  Default: { lat: 12.9716, lng: 77.5946, zoom: 11 },
};

/* ── Apple-grade Color Semantics ─────────────────────────────────── */
const COLORS = {
  highScore:    [0, 113, 227, 220],    // Darkstori Hyper-Cobalt
  medScore:     [56, 189, 248, 200],   // Radiant Cyan
  lowScore:     [142, 142, 147, 160],  // Cupertino System Gray
  competitor:   [255, 59, 48, 210],    // Apple Red
  activeStore:  [52, 199, 89, 240],    // Apple Green
  heatHigh:     [0, 113, 227, 170],    // Cobalt Glow
  heatMed:      [56, 189, 248, 140],   // Cyan Glow
  serviceCircle:[255, 255, 255, 35],
  label:        [245, 245, 247, 210],
};

function boundsFromPoints(points) {
  if (!points || !points.length) return null;
  const lngs = points.map((p) => p[0]).filter(Number.isFinite);
  const lats = points.map((p) => p[1]).filter(Number.isFinite);
  if (!lngs.length || !lats.length) return null;
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

  // Resolve city center
  const fallbackCenter = useMemo(() => {
    if (selectedCity && CITY_DEFAULTS[selectedCity]) return CITY_DEFAULTS[selectedCity];
    const key = Object.keys(CITY_DEFAULTS).find(
      (k) => k.toLowerCase() === (selectedCity || '').toLowerCase()
    );
    return key ? CITY_DEFAULTS[key] : CITY_DEFAULTS.Default;
  }, [selectedCity]);

  const allPoints = useMemo(() => {
    const merged = [
      ...neighborhoods.map((n) => [Number(n.lng || n.longitude || n.centroid_lng || fallbackCenter.lng), Number(n.lat || n.latitude || n.centroid_lat || fallbackCenter.lat)]),
      ...stores.map((s) => [Number(s.lng || s.longitude || fallbackCenter.lng), Number(s.lat || s.latitude || fallbackCenter.lat)]),
      ...zones.map((z) => [Number(z.lng || z.longitude || fallbackCenter.lng), Number(z.lat || z.latitude || fallbackCenter.lat)]),
      ...liveOrders.map((o) => [Number(o.lng || o.longitude || fallbackCenter.lng), Number(o.lat || o.latitude || fallbackCenter.lat)]),
    ];
    return merged.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]) && (p[0] !== 0 || p[1] !== 0));
  }, [neighborhoods, stores, zones, liveOrders, fallbackCenter.lng, fallbackCenter.lat]);

  const autoBounds = useMemo(() => boundsFromPoints(allPoints), [allPoints]);

  // Controlled Viewport State
  const [viewState, setViewState] = useState({
    longitude: fallbackCenter.lng,
    latitude: fallbackCenter.lat,
    zoom: zoom || fallbackCenter.zoom || 11,
    pitch: 35,
    bearing: 0,
  });

  // Smoothly pan camera whenever center, selectedCity or search coordinates change
  useEffect(() => {
    let targetLng = fallbackCenter.lng;
    let targetLat = fallbackCenter.lat;
    let targetZoom = zoom || fallbackCenter.zoom || 11;

    if (Array.isArray(center) && center.length >= 2 && center[0] !== 0 && center[1] !== 0) {
      targetLng = center[1];
      targetLat = center[0];
    } else if (center?.lng && center?.lat && center.lng !== 0 && center.lat !== 0) {
      targetLng = center.lng;
      targetLat = center.lat;
    } else if (autoBounds && (!center || (center.lat === 0 && center.lng === 0))) {
      targetLng = (autoBounds.minLng + autoBounds.maxLng) / 2;
      targetLat = (autoBounds.minLat + autoBounds.maxLat) / 2;
    }

    setViewState((prev) => ({
      ...prev,
      longitude: targetLng,
      latitude: targetLat,
      zoom: targetZoom,
    }));
  }, [center, selectedCity, fallbackCenter, autoBounds, zoom]);

  const handleDeckClick = useCallback(
    (info) => {
      if (!onSelect) return;
      if (info.object) {
        onSelect(info.object);
      } else if (info.coordinate && Array.isArray(info.coordinate) && info.coordinate.length >= 2) {
        onSelect({
          lng: info.coordinate[0],
          lat: info.coordinate[1],
          centroid_lng: info.coordinate[0],
          centroid_lat: info.coordinate[1],
          neighborhood_name: `Point (${info.coordinate[1].toFixed(3)}, ${info.coordinate[0].toFixed(3)})`,
          opportunity_score: 8.0,
        });
      }
    },
    [onSelect]
  );

  const layers = useMemo(() => {
    if (!showLayers) return [];

    const neighborhoodLayer = new ScatterplotLayer({
      id: 'neighborhoods',
      data: neighborhoods,
      getPosition: (d) => [Number(d.lng || d.longitude || d.centroid_lng || viewState.longitude), Number(d.lat || d.latitude || d.centroid_lat || viewState.latitude)],
      getFillColor: (d) => {
        const score = Number(d.opportunity_score || d.market_potential_score || 0);
        if (score >= 8.5) return COLORS.highScore;
        if (score >= 7) return COLORS.medScore;
        return COLORS.lowScore;
      },
      getRadius: (d) => 130 + Math.max(0, Number(d.opportunity_score || d.market_potential_score || 0)) * 10,
      radiusMinPixels: 5,
      radiusMaxPixels: 16,
      pickable: true,
      onClick: ({ object }) => onSelect && object && onSelect(object),
    });

    const competitorLayer = new ScatterplotLayer({
      id: 'competitors',
      data: stores.filter((s) => s.status === 'competitor'),
      getPosition: (d) => [Number(d.lng), Number(d.lat)],
      getFillColor: COLORS.competitor,
      getRadius: 140,
      radiusMinPixels: 4,
      radiusMaxPixels: 10,
      pickable: true,
      onClick: ({ object }) => onSelect && object && onSelect(object),
    });

    const activeStoreLayer = new ScatterplotLayer({
      id: 'active-stores',
      data: stores.filter((s) => s.status === 'active' || s.is_active),
      getPosition: (d) => [Number(d.lng), Number(d.lat)],
      getFillColor: COLORS.activeStore,
      getRadius: 180,
      radiusMinPixels: 6,
      radiusMaxPixels: 14,
      pickable: true,
      onClick: ({ object }) => onSelect && object && onSelect(object),
    });

    const heatLayer = showHeatmap && new ScatterplotLayer({
      id: 'opportunity-zones',
      data: zones,
      getPosition: (d) => [Number(d.lng), Number(d.lat)],
      getFillColor: (d) => {
        const score = Number(d.opportunity_score || 0);
        return score > 8 ? COLORS.heatHigh : COLORS.heatMed;
      },
      getRadius: (d) => 220 + Number(d.opportunity_score || 0) * 25,
      radiusMinPixels: 8,
      radiusMaxPixels: 24,
      pickable: true,
      onClick: ({ object }) => onSelect && object && onSelect(object),
    });

    const serviceCircleLayer = showHeatmap && new GeoJsonLayer({
      id: 'service-circles',
      data: stores.slice(0, 25).map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(s.lng), Number(s.lat)] },
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
  }, [neighborhoods, stores, zones, showHeatmap, showLayers, viewState.longitude, viewState.latitude, onSelect]);

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
          onClick={() => {
            setViewState((prev) => ({
              ...prev,
              longitude: fallbackCenter.lng,
              latitude: fallbackCenter.lat,
              zoom: fallbackCenter.zoom || 11,
            }));
          }}
          className="p-2 bg-[#0E121A]/85 backdrop-blur-xl border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors shadow-lg"
          title="Reset to City Center"
        >
          <Navigation size={14} />
        </button>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 bg-[#0E121A]/85 backdrop-blur-xl border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors shadow-lg"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <button
          onClick={() => setShowLayers(!showLayers)}
          className={`p-2 bg-[#0E121A]/85 backdrop-blur-xl border rounded-xl transition-colors shadow-lg ${showLayers ? 'border-[#0071E3]/50 text-[#38BDF8]' : 'border-white/10 text-[#86868B]'}`}
          title={showLayers ? 'Hide layers' : 'Show layers'}
        >
          <Layers size={14} />
        </button>
      </div>

      {/* Cupertino Frosted Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 bg-[#0E121A]/90 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/10 text-[11px] font-medium text-white shadow-lg">
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
        viewState={viewState}
        onViewStateChange={({ viewState: newViewState }) => setViewState(newViewState)}
        controller={true}
        layers={layers}
        onClick={handleDeckClick}
        getTooltip={({ object }) => {
          if (!object) return null;
          const name = object.store_name || object.label || object.neighborhood_name || object.name;
          const score = object.opportunity_score || object.market_potential_score;
          if (score) return `${name} • Opportunity Score: ${Number(score).toFixed(1)}/10`;
          return name || `Active Node`;
        }}
      >
        <Map
          mapLib={maplibregl}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          reuseMaps
          preventStyleDiffing={true}
        />
      </DeckGL>
    </div>
  );
}
