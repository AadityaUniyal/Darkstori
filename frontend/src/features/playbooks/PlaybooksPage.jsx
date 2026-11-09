import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  CloudRain,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Sparkles,
  Zap,
  Clock,
  ThermometerSnowflake,
  Users,
  Play,
  Info,
  Power,
  RotateCcw,
  FileText,
  Activity
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { toast } from 'sonner';
import { floorAudio } from '../../utils/floorAudio';

export default function PlaybooksPage() {
  const { roleConfig, isFirstTimeUser } = useRole();

  const [activeSimulation, setActiveSimulation] = useState(null); // 'monsoon', 'chiller', 'strike'
  const [containmentRadiusKm, setContainmentRadiusKm] = useState(4.0);
  const [slaBufferMinutes, setSlaBufferMinutes] = useState(10);
  const [riderSurgeInr, setRiderSurgeInr] = useState(0);

  const [playbooks, setPlaybooks] = useState([
    {
      id: 'pb-1',
      key: 'monsoon',
      name: 'Monsoon Surge & Flash Waterlogging Protocol',
      trigger: 'Rainfall > 25mm/hr detected by telemetry',
      action: 'Contracts radius from 4.0km to 2.2km, extends SLA to 25m, applies +₹35 rider surge.',
      status: 'ARMED_AUTO',
      icon: CloudRain,
      color: 'sky'
    },
    {
      id: 'pb-2',
      key: 'chiller',
      name: 'Cold-Chain Chiller Failure & Dry-Ice Failover',
      trigger: 'Walk-in temperature > 4.5°C for > 8 mins',
      action: 'Pauses dairy/meat intake, reroutes cold orders to secondary pod, activates backup dry-ice.',
      status: 'ARMED_AUTO',
      icon: ThermometerSnowflake,
      color: 'purple'
    },
    {
      id: 'pb-3',
      key: 'strike',
      name: 'Rider Shortage Cluster Defense',
      trigger: 'Fleet availability < 20% during peak orders',
      action: 'Enforces 3-order corridor batching and elevates drop incentive by +₹25.',
      status: 'STANDBY',
      icon: Users,
      color: 'amber'
    }
  ]);

  const [incidentLogs, setIncidentLogs] = useState([
    { id: 1, time: '10:14 AM', event: 'Monsoon protocol triggered automatically in Koramangala Hub (Rain 32mm/hr)', status: 'CONTAINED' },
    { id: 2, time: 'Yesterday', event: 'Cold room sensor spike 4.8°C at HSR Sector 2 - Backup cooling engaged', status: 'RESOLVED' }
  ]);

  const handleSimulateIncident = (key) => {
    floorAudio.alert();
    setActiveSimulation(key);

    if (key === 'monsoon') {
      setContainmentRadiusKm(2.2);
      setSlaBufferMinutes(25);
      setRiderSurgeInr(35);
      toast.warning('EMERGENCY ACTIVE: Monsoon Protocol Engaged! Radius contracted to 2.2km.');
    } else if (key === 'chiller') {
      setContainmentRadiusKm(3.0);
      setSlaBufferMinutes(15);
      setRiderSurgeInr(0);
      toast.error('COLD-CHAIN FAILURE: Backup Dry-Ice Active! Fresh produce ingress paused.');
    } else if (key === 'strike') {
      setContainmentRadiusKm(2.5);
      setSlaBufferMinutes(18);
      setRiderSurgeInr(25);
      toast.warning('SWARM DEFENSE: 3-Order Corridor Clustering Forced.');
    }

    setIncidentLogs(prev => [
      {
        id: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        event: `Manual test: ${key.toUpperCase()} crisis playbook activated across active catchments`,
        status: 'ACTIVE_CONTAINMENT'
      },
      ...prev
    ]);
  };

  const handleResetIncident = () => {
    floorAudio.success();
    setActiveSimulation(null);
    setContainmentRadiusKm(4.0);
    setSlaBufferMinutes(10);
    setRiderSurgeInr(0);
    toast.success('Incident resolved! Operations restored to normal parameters.');
  };

  const handleToggleArm = (id) => {
    floorAudio.click();
    setPlaybooks(prev =>
      prev.map(pb => pb.id === id ? { ...pb, status: pb.status === 'ARMED_AUTO' ? 'STANDBY' : 'ARMED_AUTO' } : pb)
    );
  };

  return (
    <div className="darkstor-feature-page p-4 sm:p-6 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* 1. SCROLLABLE FEATURE HEADER */}
      <div className="feature-header-banner p-6 rounded-2xl bg-white/[0.02] border border-white/10 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 shadow-sm">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-red-400">
                Feature 06 · Operational Resilience
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                Primary: Fleet & GM Lens
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Automated Incident Playbooks & Disruption Response
            </h1>
            <p className="text-sm text-white/60 max-w-3xl mt-1 leading-relaxed">
              Protects dark store operational continuity during real-world crises. Automatically triggers delivery radius
              contractions during monsoon waterlogging, activates dry-ice cold storage failovers, and rebalances rider payouts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeSimulation ? (
              <button
                onClick={handleResetIncident}
                className="px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black transition-all shadow-lg cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restore Normal Operations</span>
              </button>
            ) : (
              <button
                onClick={() => handleSimulateIncident('monsoon')}
                className="px-5 py-2.5 rounded-xl font-bold text-sm bg-red-500 hover:bg-red-400 text-white transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Simulate Emergency Drill</span>
              </button>
            )}
          </div>
        </div>

        {isFirstTimeUser && (
          <div className="mt-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-xs text-red-200">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <div>
              <strong>Crisis Management Onboarding:</strong> Click any of the drill simulation buttons below (Monsoon, Chiller Failover, or Rider Strike) to observe instant automated policy response: radius contraction, SLA extension, and surge incentive protection.
            </div>
          </div>
        )}
      </div>

      {/* 2. REAL-TIME CRISIS TELEMETRY */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div whileHover={{ y: -2 }} className="kpi-card p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Containment Catchment Radius</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className={`text-2xl font-black ${activeSimulation ? 'text-amber-400' : 'text-white'}`}>
            {containmentRadiusKm} <span className="text-xs font-normal text-white/40">km</span>
          </div>
          <div className="text-[11px] text-white/40 mt-1">
            {activeSimulation ? 'Contracted for rider safety' : 'Standard 4.0km coverage'}
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="kpi-card p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Customer SLA Buffer</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">{slaBufferMinutes} <span className="text-xs font-normal text-white/40">mins</span></div>
          <div className="text-[11px] text-emerald-400 mt-1">Zero breach penalties</div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="kpi-card p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Rider Emergency Surge</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">+₹{riderSurgeInr} <span className="text-xs font-normal text-white/40">/ drop</span></div>
          <div className="text-[11px] text-white/40 mt-1">Hazard compensation active</div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="kpi-card p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Automated Defense Status</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {activeSimulation ? 'ACTIVE CONTAINMENT' : 'ARMED & MONITORING'}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">3 Telemetry Sensors Online</div>
        </motion.div>
      </div>

      {/* 3. SIMULATION CONTROLS & ACTIVE PLAYBOOKS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Playbook Cards */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-red-400" />
            <span>Configured Crisis Playbooks (Neon DB)</span>
          </h2>

          <div className="space-y-3">
            {playbooks.map(pb => {
              const Icon = pb.icon;
              const isTriggered = activeSimulation === pb.key;

              return (
                <div
                  key={pb.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isTriggered
                      ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                      : 'bg-white/[0.02] border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl bg-white/5 border border-white/10 ${
                        isTriggered ? 'text-red-400' : 'text-white/70'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">{pb.name}</h3>
                        <p className="text-xs text-white/50 mt-1"><strong>Trigger:</strong> {pb.trigger}</p>
                        <p className="text-xs text-white/70 mt-1"><strong>Automated Response:</strong> {pb.action}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleArm(pb.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border transition-all ${
                          pb.status === 'ARMED_AUTO'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-white/10 text-white/50 border-white/10'
                        }`}
                      >
                        {pb.status}
                      </button>

                      <button
                        onClick={() => handleSimulateIncident(pb.key)}
                        className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/80 border border-white/10 cursor-pointer active:scale-95"
                      >
                        Test Drill
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Immutable Crisis Audit Log */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-400" />
              <span>Incident Audit Ledger</span>
            </h2>
            <span className="text-xs text-white/40 font-mono">Neon Live Log</span>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {incidentLogs.map(log => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-white/40">{log.time}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                      log.status === 'ACTIVE_CONTAINMENT'
                        ? 'bg-red-500/20 text-red-300 border-red-500/30 animate-pulse'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <p className="text-xs text-white/80">{log.event}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
