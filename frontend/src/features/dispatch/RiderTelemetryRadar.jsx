import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Navigation, AlertTriangle, ShieldCheck, RefreshCw, Zap,
  BatteryCharging, Gauge, Compass, MapPin, Send, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { getRiderTelemetryStream, sendRiderTelemetryPing } from '../../services/api';

export default function RiderTelemetryRadar({ activeCity }) {
  const [telemetryData, setTelemetryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulatingPing, setIsSimulatingPing] = useState(false);
  const [selectedRider, setSelectedRider] = useState(null);

  const fetchTelemetry = async () => {
    try {
      const data = await getRiderTelemetryStream(activeCity || 'Bangalore');
      setTelemetryData(data);
      if (!selectedRider && data?.fleet_telemetry?.length > 0) {
        setSelectedRider(data.fleet_telemetry[0]);
      }
    } catch (err) {
      console.warn('Telemetry stream fallback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, [activeCity]);

  // Simulate pushing an out-of-bounds GPS ping to test geofence alert engine
  const handleSimulateBreachPing = async () => {
    setIsSimulatingPing(true);
    try {
      const hub = telemetryData?.hub_location || { lat: 12.9716, lng: 77.6412 };
      // Ping 4.5km away (breaching 3.2km geofence)
      const res = await sendRiderTelemetryPing({
        rider_id: selectedRider?.rider_id || 'RD-BLR-04',
        latitude: hub.lat + 0.041,
        longitude: hub.lng + 0.038,
        speed_kmh: 36.5,
        battery_pct: 58.0,
        darkstore_lat: hub.lat,
        darkstore_lng: hub.lng,
        geofence_radius_km: 3.2,
        active_order_id: 'ORD-TEST-BREACH-01'
      });
      if (res.is_geofence_breach) {
        toast.error(`GEOFENCE BREACH DETECTED: Rider ${res.rider_id} is ${res.distance_from_hub_km} km away (+${res.excess_km} km beyond boundary)!`);
      } else {
        toast.success(`Ping recorded: ${res.rider_id} within ${res.distance_from_hub_km} km.`);
      }
      await fetchTelemetry();
    } catch (err) {
      toast.error('Failed to dispatch test telemetry ping.');
    } finally {
      setIsSimulatingPing(false);
    }
  };

  const riders = telemetryData?.fleet_telemetry || [];
  const breachesCount = telemetryData?.breaches_detected || 0;
  const radiusKm = telemetryData?.geofence_radius_km || 3.2;

  return (
    <div className="space-y-6">
      {/* KPI Header Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs text-white/50 uppercase font-mono">Active Swarm GPS</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {riders.length} Riders
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Compass size={20} />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs text-white/50 uppercase font-mono">Geofence Radius</div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {radiusKm} km
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400">
            <Navigation size={20} />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs text-white/50 uppercase font-mono">Boundary Breaches</div>
            <div className={`text-xl font-bold font-mono mt-1 ${breachesCount > 0 ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
              {breachesCount} Detected
            </div>
          </div>
          <div className={`p-2.5 rounded-lg ${breachesCount > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            {breachesCount > 0 ? <AlertTriangle size={20} /> : <ShieldCheck size={20} />}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs text-white/50 uppercase font-mono">Telemetry Status</div>
            <div className="text-sm font-bold font-mono text-emerald-400 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE 3s SYNC
            </div>
          </div>
          <button
            onClick={fetchTelemetry}
            className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Refresh GPS telemetry"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Radar Display & Live Fleet Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar Map Graphic */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[#090D16] border border-white/10 relative overflow-hidden flex flex-col items-center justify-center min-h-[380px]">
          {/* Radar Circles */}
          <div className="relative w-72 h-72 rounded-full border border-sky-500/20 flex items-center justify-center">
            {/* Outer Geofence Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-sky-400/30 animate-[spin_60s_linear_infinite]" />
            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-mono text-sky-400/60 uppercase">
              Geofence Limit ({radiusKm}km)
            </div>

            {/* Intermediate Distance Ring */}
            <div className="w-48 h-48 rounded-full border border-sky-500/20 flex items-center justify-center">
              {/* Inner Depot Core */}
              <div className="w-24 h-24 rounded-full border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-center relative">
                <MapPin className="w-5 h-5 text-emerald-400 animate-bounce" />
                <span className="absolute -bottom-5 text-[9px] font-mono text-emerald-400 uppercase font-bold">
                  Apex Hub
                </span>
              </div>
            </div>

            {/* Live Plotting of Rider Nodes on Radar */}
            {riders.map((r, i) => {
              // Normalize distance onto the 144px radius circle
              const distRatio = Math.min(1.2, r.distance_from_hub_km / radiusKm);
              const angleDeg = (i * (360 / riders.length) + (Date.now() / 200) % 360) * (Math.PI / 180);
              const radarX = Math.cos(angleDeg) * (distRatio * 130);
              const radarY = Math.sin(angleDeg) * (distRatio * 130);

              const isBreach = r.is_geofence_breach;

              return (
                <motion.div
                  key={r.rider_id}
                  animate={{ x: radarX, y: radarY }}
                  transition={{ type: 'spring', damping: 20 }}
                  onClick={() => setSelectedRider(r)}
                  className={`absolute w-7 h-7 rounded-full -ml-3.5 -mt-3.5 flex items-center justify-center cursor-pointer text-[10px] font-mono font-bold transition-transform hover:scale-125 z-10 ${
                    isBreach
                      ? 'bg-amber-500 text-black ring-4 ring-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse'
                      : 'bg-emerald-500 text-black ring-2 ring-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  }`}
                  title={`${r.rider_name} (${r.rider_id}) - ${r.distance_from_hub_km} km`}
                >
                  {r.rider_id.split('-').pop()}
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-between w-full text-xs text-slate-400 px-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Within Operating Catchment</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Geofence Breach ({'>'}{radiusKm} km)</span>
            </div>
          </div>
        </div>

        {/* Live Rider Swarm Cards & Stress Probe */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold font-mono text-white uppercase">Telemetry Stress Probe</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Test geofence breach alert & audit trail recording.</p>
            </div>
            <button
              onClick={handleSimulateBreachPing}
              disabled={isSimulatingPing}
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Zap size={14} className={isSimulatingPing ? 'animate-spin' : ''} />
              <span>{isSimulatingPing ? 'Pinging...' : 'Inject Breach Ping'}</span>
            </button>
          </div>

          {/* Rider Stream List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {riders.map(r => (
              <div
                key={r.rider_id}
                onClick={() => setSelectedRider(r)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  selectedRider?.rider_id === r.rider_id
                    ? 'border-sky-500 bg-sky-500/10'
                    : r.is_geofence_breach
                    ? 'border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10'
                    : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono font-bold text-white">
                    <span>{r.rider_name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({r.rider_id})</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      r.is_geofence_breach
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {r.is_geofence_breach ? 'BREACH ALERT' : 'IN BOUNDS'}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] font-mono text-slate-300">
                  <div>
                    <span className="text-[10px] text-slate-500 block">DIST</span>
                    <span>{r.distance_from_hub_km} km</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">SPEED</span>
                    <span>{r.speed_kmh} km/h</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">BATTERY</span>
                    <span className="flex items-center gap-0.5">
                      <BatteryCharging size={11} className="text-emerald-400" />
                      {r.battery_pct}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">ETA</span>
                    <span className="text-sky-300">{r.dynamic_eta_mins}m</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
