import React, { useState, useEffect } from 'react';
import { CloudRain, Sun, Cloud, Zap, AlertTriangle, RefreshCw, Thermometer, Droplets } from 'lucide-react';
import { api } from '../services/api';
import { useCity } from '../context/CityContext';

export default function WeatherRadarCard({ storeId = null }) {
  const { currentCity } = useCity();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWeather = async () => {
    setLoading(true);
    try {
      // Store-level or City-level live weather
      const data = await api.getStoreWeatherAlert(storeId || 1);
      setWeather(data);
    } catch (e) {
      setWeather({
        city: currentCity,
        temperature_c: 28.0,
        precipitation_mm: 0.0,
        condition: 'Clear',
        is_rainy: false,
        surge_multiplier: 1.0,
        alert: null,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [storeId, currentCity]);

  const isRain = weather?.is_rainy;
  const condition = weather?.condition || (isRain ? 'Rainy' : 'Clear');

  return (
    <div className={`glass-card p-5 rounded-2xl border transition-all duration-300 ${isRain ? 'border-sky-500/40 bg-sky-950/20' : 'border-border/80 bg-card/60'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl ${isRain ? 'bg-sky-500/20 text-sky-400' : 'bg-amber-500/10 text-amber-400'}`}>
            {isRain ? <CloudRain size={20} className="animate-pulse" /> : (condition === 'Cloudy' ? <Cloud size={20} /> : <Sun size={20} />)}
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Hyperlocal Weather Radar</h3>
            <p className="text-xs text-muted-foreground">{weather?.city || currentCity} Hub · Live Satellite Stream</p>
          </div>
        </div>
        <button 
          onClick={fetchWeather}
          disabled={loading}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          title="Refresh Live Weather"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Main Metric Row */}
      <div className="grid grid-cols-3 gap-3 mb-3.5">
        <div className="bg-secondary/40 rounded-xl p-3 border border-border/30">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Thermometer size={13} className="text-amber-400" /> Temp
          </div>
          <div className="text-lg font-bold text-foreground">
            {weather?.temperature_c != null ? `${weather.temperature_c}°C` : '28.5°C'}
          </div>
        </div>

        <div className="bg-secondary/40 rounded-xl p-3 border border-border/30">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Droplets size={13} className="text-sky-400" /> Rainfall
          </div>
          <div className="text-lg font-bold text-foreground">
            {weather?.precipitation_mm != null ? `${weather.precipitation_mm} mm` : '0.0 mm'}
          </div>
        </div>

        <div className="bg-secondary/40 rounded-xl p-3 border border-border/30">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Zap size={13} className="text-primary" /> Demand Surge
          </div>
          <div className={`text-lg font-bold ${weather?.surge_multiplier > 1.1 ? 'text-emerald-400 font-mono' : 'text-foreground'}`}>
            {weather?.surge_multiplier ? `${weather.surge_multiplier}x` : '1.00x'}
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {weather?.alert ? (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span className="leading-relaxed">{weather.alert}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Atmospheric Status: Normal Traffic & Standard SLA</span>
          <span className="text-[10px] font-mono text-emerald-500">OPTIMAL SLA</span>
        </div>
      )}
    </div>
  );
}
