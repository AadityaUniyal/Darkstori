import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Volume2, Volume1, VolumeX, Database, Activity, MapPin, Zap, Compass, HelpCircle } from 'lucide-react';
import { floorAudio } from '../utils/floorAudio';
import { useCity } from '../context/CityContext';
import { useRole } from '../context/RoleContext';

export default function IndustrialStatusBar() {
  const location = useLocation();
  const { currentCity } = useCity();
  const { activeRole, isFirstTimeUser, toggleFirstTimeUserMode } = useRole();

  const [audioProfile, setAudioProfile] = useState(floorAudio.getProfile());
  const [latency, setLatency] = useState(24);

  useEffect(() => {
    const unsub = floorAudio.subscribe(setAudioProfile);
    const interval = setInterval(() => {
      // Simulate authentic serverless database keepalive ping between 18ms and 28ms
      setLatency(Math.floor(18 + Math.random() * 10));
    }, 4500);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  // Do not render on full-screen dispute verification page or landing page
  if (location.pathname.startsWith('/verify') || location.pathname === '/' || location.pathname === '/welcome') {
    return null;
  }

  const cycleAudioProfile = () => {
    const next = audioProfile === 'warehouse' ? 'office' : audioProfile === 'office' ? 'silent' : 'warehouse';
    floorAudio.setProfile(next);
    floorAudio.playSuccessPick();
  };

  const getAudioLabel = () => {
    if (audioProfile === 'warehouse') return 'Audio: Warehouse (880Hz)';
    if (audioProfile === 'office') return 'Audio: Office Soft';
    return 'Audio: Silent / Haptic';
  };

  const getAudioIcon = () => {
    if (audioProfile === 'warehouse') return <Volume2 size={12} className="text-[#FF9F1C]" />;
    if (audioProfile === 'office') return <Volume1 size={12} className="text-emerald-400" />;
    return <VolumeX size={12} className="text-slate-500" />;
  };

  return (
    <footer className="hidden sm:flex fixed bottom-0 inset-x-0 h-7 z-40 bg-[#060912]/95 backdrop-blur-md border-t border-white/10 text-[10px] font-mono text-slate-400 select-none items-center justify-between px-3 shadow-inner">
      {/* Left side: Hub & Database Telemetry */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="flex h-1.5 w-1.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="font-bold text-white uppercase">{currentCity} HUB #04</span>
          <span className="text-slate-600 font-sans">|</span>
        </div>

        <div className="flex items-center gap-1 text-slate-400" title="Neon Serverless PostgreSQL Connection Latency">
          <Database size={11} className="text-emerald-400" />
          <span>NEON DB: <strong className="text-emerald-400">{latency}ms</strong></span>
        </div>

        <span className="text-slate-700 hidden md:inline">•</span>

        <div className="hidden md:flex items-center gap-1 text-slate-400">
          <Activity size={11} className="text-cyan-400" />
          <span>TELEMETRY: <strong className="text-slate-300">ACTIVE 60Hz</strong></span>
        </div>

        <span className="text-slate-700 hidden lg:inline">•</span>

        <div className="hidden lg:flex items-center gap-1 text-slate-400">
          <Compass size={11} className="text-amber-400" />
          <span>LENS: <strong className="text-amber-300 uppercase">{activeRole}</strong></span>
        </div>
      </div>

      {/* Right side: Audio Profile, Onboarding Toggle, Spotlight */}
      <div className="flex items-center gap-2.5">
        {/* Onboarding Mode Toggle */}
        <button
          onClick={toggleFirstTimeUserMode}
          className={`px-2 py-0.5 rounded border text-[9px] font-bold transition-all flex items-center gap-1 ${
            isFirstTimeUser
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
          }`}
          title="Toggle First-Time User Guided Tour vs Returning User Telemetry"
        >
          <HelpCircle size={10} className={isFirstTimeUser ? 'text-amber-400' : 'text-slate-400'} />
          <span>{isFirstTimeUser ? 'Onboarding: ACTIVE' : 'Mode: RETURNING'}</span>
        </button>

        <span className="text-slate-700">•</span>

        {/* Tactical Audio Profile Switcher Button */}
        <button
          onClick={cycleAudioProfile}
          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white flex items-center gap-1 transition-all"
          title="Click to cycle audio profile: Warehouse -> Office -> Silent"
        >
          {getAudioIcon()}
          <span>{getAudioLabel()}</span>
        </button>

        <span className="text-slate-700">•</span>

        {/* Command Palette Trigger Hint */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('darkstor:open-command-palette'))}
          className="text-slate-400 hover:text-white flex items-center gap-1"
        >
          <kbd className="px-1 py-0.2 rounded bg-white/10 border border-white/15 text-slate-300 font-mono text-[9px]">⌘K</kbd>
          <span>Spotlight</span>
        </button>

        <span className="text-slate-700">•</span>

        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
          className="text-slate-400 hover:text-white flex items-center gap-0.5"
          title="Keyboard Shortcuts (?)"
        >
          <kbd className="px-1 py-0.2 rounded bg-white/10 border border-white/15 text-slate-300 font-mono text-[9px]">?</kbd>
        </button>
      </div>
    </footer>
  );
}
