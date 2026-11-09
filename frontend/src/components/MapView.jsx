import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCity } from '../context/CityContext';
import { api } from '../services/api';
import Map from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import { Maximize2, Minimize2, Layers, Loader2, Navigation } from 'lucide-react';

// City Coordinates Registry for smooth instant focusing
const CITY_COORDINATES = {
  bangalore: { lng: 77.5946, lat: 12.9716, zoom: 12 },
  mumbai: { lng: 72.8777, lat: 19.0760, zoom: 12 },
  delhi: { lng: 77.1025, lat: 28.7041, zoom: 11.5 },
  'delhi-ncr': { lng: 77.1025, lat: 28.7041, zoom: 11.5 },
  hyderabad: { lng: 78.4867, lat: 17.3850, zoom: 12 },
  pune: { lng: 73.8567, lat: 18.5204, zoom: 12 },
  chennai: { lng: 80.2565, lat: 13.0418, zoom: 12 },
  kolkata: { lng: 88.3639, lat: 22.5726, zoom: 12 },
  ahmedabad: { lng: 72.5080, lat: 23.0370, zoom: 12 },
  jaipur: { lng: 75.7873, lat: 26.9124, zoom: 12 },
  lucknow: { lng: 80.9462, lat: 26.8467, zoom: 12 },
  chandigarh: { lng: 76.7650, lat: 30.7250, zoom: 12 },
  kochi: { lng: 76.3650, lat: 10.0120, zoom: 12 },
};

const INDIA_OVERVIEW = { lat: 22.5, lng: 79, zoom: 4.2 };

const MAP_STYLES = {
  dark: {
    label: 'Tactical Dark',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  streets: {
    label: 'Google Streets',
    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  },
  satellite: {
    label: 'Satellite',
    style: {
      version: 8,
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: [
            'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
        },
      },
      layers: [
        {
          id: 'esri-satellite-layer',
          type: 'raster',
          source: 'esri-satellite',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
};

function coordinatesOf(item) {
  const lng = Number(item?.lng ?? item?.longitude ?? item?.centroid_lng);
  const lat = Number(item?.lat ?? item?.latitude ?? item?.centroid_lat);
  return Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90
    ? [lng, lat]
    : null;
}

/* ── DarkStori Brand & Operational Color Semantics ──────────────── */
const COLORS = {
  highScore:    [245, 158, 11, 230],   // DarkStori Hyper-Volt Amber
  medScore:     [251, 191, 36, 190],   // Amber Gold
  lowScore:     [100, 116, 139, 160],  // Slate Titanium
  competitor:   [239, 68, 68, 220],    // Alarm Crimson
  activeStore:  [16, 185, 129, 240],   // Fresh Emerald
  heatHigh:     [245, 158, 11, 175],   // Amber Thermal
  heatMed:      [251, 191, 36, 130],   // Warm Gold
  serviceCircle:[245, 158, 11, 30],
  label:        [248, 250, 252, 220],
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
  externalPoints = [],
  showHeatmap = false,
  onSelect,
}) {
  const { selectedCity, selectedLocation } = useCity();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayers, setShowLayers] = useState(true);
  const [mapTheme, setMapTheme] = useState('dark');
  const [selectedPoint, setSelectedPoint] = useState(null);

  const { data: dynamicStores, isLoading: storesLoading, isError: storesError } = useQuery({
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
  const stores = Array.isArray(dynamicStores) ? dynamicStores : (dynamicStores?.stores || []);
  const zones = Array.isArray(opportunityZones) ? opportunityZones : (opportunityZones?.zones || []);

  const allPoints = useMemo(() => {
    const merged = [
      ...neighborhoods.map(coordinatesOf),
      ...stores.map(coordinatesOf),
      ...zones.map(coordinatesOf),
      ...liveOrders.map(coordinatesOf),
      ...externalPoints.map(coordinatesOf),
    ];
    return merged.filter(Boolean);
  }, [neighborhoods, stores, zones, liveOrders]);

  const autoBounds = useMemo(() => boundsFromPoints(allPoints), [allPoints]);

  // Controlled Viewport State - Initialized directly to active city / center
  const [viewState, setViewState] = useState(() => {
    let initialLng = INDIA_OVERVIEW.lng;
    let initialLat = INDIA_OVERVIEW.lat;
    let initialZoom = zoom || INDIA_OVERVIEW.zoom;

    if (Array.isArray(center) && center.length >= 2 && Number.isFinite(Number(center[0])) && Number.isFinite(Number(center[1]))) {
      initialLng = Number(center[1]);
      initialLat = Number(center[0]);
      initialZoom = zoom || 12;
    } else if (center && Number.isFinite(Number(center.lng)) && Number.isFinite(Number(center.lat))) {
      initialLng = Number(center.lng);
      initialLat = Number(center.lat);
      initialZoom = zoom || 12;
    } else if (selectedLocation && Number.isFinite(Number(selectedLocation.lng))) {
      initialLng = Number(selectedLocation.lng);
      initialLat = Number(selectedLocation.lat);
      initialZoom = zoom || 14;
    } else if (selectedCity && CITY_COORDINATES[selectedCity.toLowerCase()]) {
      const coord = CITY_COORDINATES[selectedCity.toLowerCase()];
      initialLng = coord.lng;
      initialLat = coord.lat;
      initialZoom = zoom || coord.zoom;
    }

    return {
      longitude: initialLng,
      latitude: initialLat,
      zoom: initialZoom,
      pitch: 0,
      bearing: 0,
    };
  });

  const lastCityRef = useRef(selectedCity);
  const lastLocRef = useRef(selectedLocation);
  const lastCenterRef = useRef(center);
  const initializedRef = useRef(false);

  // Search selections carry exact geocoded coordinates; city selections target city centers; free navigation is preserved.
  useEffect(() => {
    const cityChanged = lastCityRef.current !== selectedCity;
    const locChanged = lastLocRef.current !== selectedLocation;
    const centerChanged = JSON.stringify(lastCenterRef.current) !== JSON.stringify(center);

    if (!initializedRef.current || cityChanged || locChanged || centerChanged) {
      lastCityRef.current = selectedCity;
      lastLocRef.current = selectedLocation;
      lastCenterRef.current = center;
      initializedRef.current = true;

      let targetLng = selectedLocation?.lng ?? INDIA_OVERVIEW.lng;
      let targetLat = selectedLocation?.lat ?? INDIA_OVERVIEW.lat;
      let targetZoom = zoom || (selectedLocation ? 14 : INDIA_OVERVIEW.zoom);

      if (Array.isArray(center) && center.length >= 2 && Number.isFinite(Number(center[0])) && Number.isFinite(Number(center[1]))) {
        targetLng = center[1];
        targetLat = center[0];
      } else if (center && Number.isFinite(Number(center.lng)) && Number.isFinite(Number(center.lat))) {
        targetLng = center.lng;
        targetLat = center.lat;
      } else if (selectedCity) {
        const c = CITY_COORDINATES[selectedCity.toLowerCase()];
        if (c) {
          targetLng = c.lng;
          targetLat = c.lat;
          targetZoom = c.zoom;
        } else if (autoBounds) {
          targetLng = (autoBounds.minLng + autoBounds.maxLng) / 2;
          targetLat = (autoBounds.minLat + autoBounds.maxLat) / 2;
          targetZoom = 11;
        }
      }

      setViewState((prev) => ({
        ...prev,
        longitude: targetLng,
        latitude: targetLat,
        zoom: targetZoom,
      }));
    }
  }, [center, selectedCity, selectedLocation]);

  const handleDeckClick = useCallback(
    (info) => {
      if (info.object) {
        const position = coordinatesOf(info.object);
        if (position) setSelectedPoint({ lng: position[0], lat: position[1], source: 'recorded_feature' });
        onSelect?.(info.object);
      } else if (info.coordinate && Array.isArray(info.coordinate) && info.coordinate.length >= 2) {
        const point = { lng: info.coordinate[0], lat: info.coordinate[1], source: 'map_click' };
        setSelectedPoint(point);
        onSelect?.({ ...point, opportunity_score: null, data_source: 'user_selected_coordinate' });
      }
    },
    [onSelect]
  );

  const layers = useMemo(() => {
    if (!showLayers) return [];

  const neighborhoodLayer = new ScatterplotLayer({
      id: 'neighborhoods',
      data: neighborhoods.filter((item) => coordinatesOf(item)),
      getPosition: coordinatesOf,
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
      data: stores.filter((s) => s.platform && s.platform.toLowerCase() !== 'darkstor' && coordinatesOf(s)),
      getPosition: coordinatesOf,
      getFillColor: COLORS.competitor,
      getRadius: 140,
      radiusMinPixels: 4,
      radiusMaxPixels: 10,
      pickable: true,
      onClick: ({ object }) => onSelect && object && onSelect(object),
    });

    const activeStoreLayer = new ScatterplotLayer({
      id: 'active-stores',
      data: stores.filter((s) => (!s.platform || s.platform.toLowerCase() === 'darkstor' || s.is_active) && coordinatesOf(s)),
      getPosition: coordinatesOf,
      getFillColor: COLORS.activeStore,
      getRadius: 180,
      radiusMinPixels: 6,
      radiusMaxPixels: 14,
      pickable: true,
      onClick: ({ object }) => onSelect && object && onSelect(object),
    });

    const heatLayer = showHeatmap && new ScatterplotLayer({
      id: 'opportunity-zones',
      data: zones.filter((item) => coordinatesOf(item)),
      getPosition: coordinatesOf,
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

    const serviceCircleLayer = showHeatmap && new ScatterplotLayer({
      id: 'service-circles',
      data: stores.filter((item) => coordinatesOf(item)).slice(0, 30),
      getPosition: coordinatesOf,
      getRadius: (d) => (d.delivery_radius_km || 1.8) * 1000,
      stroked: true,
      filled: true,
      getFillColor: [0, 113, 227, 20],
      getLineColor: COLORS.serviceCircle,
      lineWidthMinPixels: 1.5,
      pickable: false,
    });

    const liveOrderLayer = new ScatterplotLayer({
      id: 'recorded-live-orders',
      data: liveOrders.filter((item) => coordinatesOf(item)),
      getPosition: coordinatesOf,
      getFillColor: [56, 189, 248, 225],
      getLineColor: [255, 255, 255, 230],
      stroked: true,
      getRadius: 95,
      radiusMinPixels: 4,
      radiusMaxPixels: 9,
      pickable: true,
      onClick: ({ object }) => onSelect && object && onSelect(object),
    });

    const externalPointLayer = new ScatterplotLayer({
      id: 'external-map-points',
      data: externalPoints.filter((item) => coordinatesOf(item)),
      getPosition: coordinatesOf,
      getFillColor: [255, 59, 48, 210],
      getLineColor: [255, 255, 255, 230],
      stroked: true,
      getRadius: 120,
      radiusMinPixels: 4,
      radiusMaxPixels: 10,
      pickable: true,
      onClick: ({ object }) => onSelect && object && onSelect(object),
    });

    const selectedLocationHaloLayer = new ScatterplotLayer({
      id: 'selected-location-halo',
      data: [selectedPoint || selectedLocation].filter(Boolean),
      getPosition: coordinatesOf,
      getRadius: 2000,
      stroked: true,
      filled: true,
      getFillColor: [255, 159, 28, 25],
      getLineColor: [255, 159, 28, 200],
      getLineWidth: 2,
      lineWidthMinPixels: 2,
      pickable: false,
    });

    const selectedLocationLayer = new ScatterplotLayer({
      id: 'selected-map-location',
      data: [selectedPoint || selectedLocation].filter(Boolean),
      getPosition: coordinatesOf,
      getFillColor: [255, 159, 28, 245],
      getLineColor: [255, 255, 255, 245],
      getLineWidth: 2,
      lineWidthMinPixels: 2,
      stroked: true,
      getRadius: 240,
      radiusMinPixels: 9,
      radiusMaxPixels: 18,
      pickable: false,
    });

    return [neighborhoodLayer, competitorLayer, activeStoreLayer, heatLayer, serviceCircleLayer, liveOrderLayer, externalPointLayer, selectedLocationHaloLayer, selectedLocationLayer].filter(Boolean);
  }, [neighborhoods, stores, zones, liveOrders, externalPoints, showHeatmap, showLayers, onSelect, selectedPoint, selectedLocation]);

  const mapHeight = isFullscreen ? '80vh' : height;

  return (
    <div style={{ height: mapHeight, width: '100%', position: 'relative', borderRadius: '16px', overflow: 'hidden', transition: 'height 0.35s cubic-bezier(0.16, 1, 0.3, 1)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      {storesError && (
        <div role="status" className="absolute bottom-12 left-3 z-10 max-w-[min(90%,420px)] rounded-xl border border-amber-300/20 bg-[#0E121A]/90 px-3 py-2 text-xs text-amber-100/80 shadow-lg backdrop-blur-xl">
          Store data is unavailable. The basemap remains usable; no store markers are being inferred.
        </div>
      )}

      {/* Map Theme Switcher: Dark | Streets | Satellite */}
      <div className="absolute top-3 left-3 z-10 flex items-center bg-[#0E121A]/90 backdrop-blur-xl p-1 rounded-xl border border-white/10 shadow-lg text-xs gap-1">
        {Object.entries(MAP_STYLES).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setMapTheme(key)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              mapTheme === key
                ? 'bg-[#0071E3] text-white shadow-sm'
                : 'text-[#86868B] hover:text-white hover:bg-white/5'
            }`}
          >
            {config.label}
          </button>
        ))}
      </div>

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
              longitude: INDIA_OVERVIEW.lng,
              latitude: INDIA_OVERVIEW.lat,
              zoom: INDIA_OVERVIEW.zoom,
            }));
          }}
          className="p-2 bg-[#0E121A]/85 backdrop-blur-xl border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors shadow-lg"
          title="Show India overview"
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
        {stores.some((store) => (!store.platform || store.platform.toLowerCase() === 'darkstor' || store.is_active) && coordinatesOf(store)) && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#34C759]" />Active Hub</span>}
        {stores.some((store) => store.platform && store.platform.toLowerCase() !== 'darkstor' && coordinatesOf(store)) && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#FF3B30]" />Recorded POI</span>}
        {liveOrders.some((item) => coordinatesOf(item)) && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#38BDF8]" />Order event</span>}
        {externalPoints.some((item) => coordinatesOf(item)) && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#FF3B30]" />OpenStreetMap POI</span>}
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FF9F1C]" />
          Selected point
        </span>
        {showHeatmap && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#0071E3]" />
            Expansion Target
          </span>
        )}
        <span className="text-white/35">© OpenStreetMap contributors</span>
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
          {...viewState}
          style={{ width: '100%', height: '100%' }}
          mapLib={maplibregl}
          mapStyle={MAP_STYLES[mapTheme]?.style || MAP_STYLES.dark.style}
          reuseMaps
          preventStyleDiffing={true}
        />
      </DeckGL>
    </div>
  );
}
