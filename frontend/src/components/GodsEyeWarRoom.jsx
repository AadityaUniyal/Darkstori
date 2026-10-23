import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, Zap, Compass, RefreshCw, Radio, Truck, Layers, ArrowRight,
  ShieldCheck, AlertTriangle, Sparkles, Sliders, CheckCircle2, Volume2,
  VolumeX, Navigation, MapPin, Activity, DollarSign
} from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';

export default function GodsEyeWarRoom() {
  const [activeMode, setActiveMode] = useState('slotting'); // 'slotting' | 'swarm' | 'mesh'
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Mode A: Thermodynamic Slotting State
  const [slottingData, setSlottingData] = useState(null);
  const [isSlottingOptimized, setIsSlottingOptimized] = useState(false);
  const [slottingLoading, setSlottingLoading] = useState(false);

  // Mode B: Swarm Intercept State
  const [trafficMultiplier, setTrafficMultiplier] = useState(1.4);
  const [swarmData, setSwarmData] = useState(null);
  const [swarmLoading, setSwarmLoading] = useState(false);
  const [isInterceptActive, setIsInterceptActive] = useState(true);

  // Mode C: Multi-Hub Self-Healing Mesh
  const [meshData, setMeshData] = useState(null);
  const [meshLoading, setMeshLoading] = useState(false);

  // Web Audio Context for tactile feedback without audio files
  const audioCtxRef = useRef(null);

  const playTacticalChime = (type = 'success') => {
    if (!audioEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.12); // A5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'tactical') {
        osc.frequency.setValueAtTime(440.0, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Load initial slotting data
  useEffect(() => {
    fetchSlottingData(false);
    fetchSwarmData(1.4);
    fetchMeshData();
  }, []);

  const fetchSlottingData = async (optimize = false) => {
    setSlottingLoading(true);
    try {
      const res = await api.optimizeThermodynamicSlotting({ iterations: optimize ? 400 : 50 });
      setSlottingData(res);
      setIsSlottingOptimized(optimize);
      if (optimize) {
        playTacticalChime('success');
        toast.success(`Thermodynamic Wave Applied: -${res.transit_reduction_pct}% picker walking distance!`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSlottingLoading(false);
    }
  };

  const fetchSwarmData = async (traffic) => {
    setSwarmLoading(true);
    try {
      const res = await api.computeSwarmIntercept({ traffic_congestion: traffic });
      setSwarmData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSwarmLoading(false);
    }
  };

  const fetchMeshData = async () => {
    setMeshLoading(true);
    try {
      const res = await api.getMultiHubMesh();
      setMeshData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setMeshLoading(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '24px',
      padding: '28px',
      color: '#FFFFFF',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Ambient Glow */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-5%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #A855F7, #EC4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(168, 85, 247, 0.35)'
          }}>
            <Radio size={24} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                God's Eye Autonomous Grid Control
              </h2>
              <span style={{
                background: 'rgba(168, 85, 247, 0.18)',
                color: '#C084FC',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.68rem',
                fontWeight: 600,
                letterSpacing: '0.04em'
              }}>
                LEVEL 4 AUTONOMY
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              Micro-warehouse thermodynamic reslotting, dynamic mid-flight courier swaps, and self-healing urban transshipment
            </p>
          </div>
        </div>

        {/* Audio Mute & Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => {
              setAudioEnabled(!audioEnabled);
              playTacticalChime('tactical');
            }}
            title={audioEnabled ? "Mute Tactical Audio" : "Enable Tactical Audio"}
            style={{
              background: audioEnabled ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${audioEnabled ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '10px',
              padding: '8px 12px',
              color: audioEnabled ? '#C084FC' : 'rgba(255, 255, 255, 0.4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              fontWeight: 500
            }}
          >
            {audioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>{audioEnabled ? "Audio On" : "Muted"}</span>
          </button>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '4px',
            display: 'flex',
            gap: '4px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            {[
              { id: 'slotting', label: 'Thermodynamic Slotting', icon: Layers },
              { id: 'swarm', label: 'Swarm Intercept Fleet', icon: Compass },
              { id: 'mesh', label: 'Self-Healing Urban Mesh', icon: Truck },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveMode(tab.id);
                    playTacticalChime('tactical');
                  }}
                  style={{
                    background: isActive ? 'linear-gradient(135deg, #0071E3, #A855F7)' : 'transparent',
                    color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODE A: THERMODYNAMIC SLOTTING */}
      {activeMode === 'slotting' && slottingData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            {/* Left: 2D Dark Store Shelf Heatmap Matrix */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '18px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                    Dark Store Floorplan • 16-Zone Shelf Affinity Heatmap
                  </h4>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                    {isSlottingOptimized ? "Optimized: High-velocity & affinity SKUs clustered at front aisles" : "Standard static layout: Erratic pick path with high transit friction"}
                  </p>
                </div>
                <button
                  onClick={() => fetchSlottingData(!isSlottingOptimized)}
                  disabled={slottingLoading}
                  style={{
                    background: isSlottingOptimized ? 'rgba(34, 197, 94, 0.2)' : 'linear-gradient(135deg, #0071E3, #A855F7)',
                    border: `1px solid ${isSlottingOptimized ? '#22C55E' : 'transparent'}`,
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RefreshCw size={14} className={slottingLoading ? 'animate-spin' : ''} />
                  <span>{isSlottingOptimized ? "Reset to Baseline" : "Run Thermodynamic Re-Slotting"}</span>
                </button>
              </div>

              {/* 4 Aisles Grid Matrix */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '16px',
                borderRadius: '14px',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                position: 'relative'
              }}>
                {/* Visual Staging Bay Dock Indicator */}
                <div style={{
                  gridColumn: 'span 4',
                  background: 'rgba(0, 113, 227, 0.15)',
                  border: '1px solid rgba(0, 113, 227, 0.4)',
                  borderRadius: '8px',
                  padding: '8px',
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#60A5FA',
                  marginBottom: '6px'
                }}>
                  ▲ STAGING DOCK & PICKER PACKING CONVEYOR (Point (0, 0)) ▲
                </div>

                {['Aisle 1 (Golden Zone)', 'Aisle 2 (Fast Move)', 'Aisle 3 (Ambient)', 'Aisle 4 (Deep Stock)'].map((aisleName, aisleIdx) => {
                  const aisleNum = aisleIdx + 1;
                  const slots = ['Top', 'Mid', 'Low', 'End'];
                  return (
                    <div key={aisleName} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: aisleNum === 1 ? '#F59E0B' : 'rgba(255, 255, 255, 0.6)',
                        textAlign: 'center'
                      }}>
                        {aisleName}
                      </div>

                      {slots.map(slotPos => {
                        const slotKey = `A${aisleNum}-${slotPos}`;
                        // Look for SKU assigned to this slot
                        const slotsMap = isSlottingOptimized ? slottingData.optimized_slots : slottingData.current_slots;
                        const assignedSkuId = slotsMap ? Object.keys(slotsMap).find(k => slotsMap[k] === slotKey) : null;
                        const isGolden = aisleNum === 1;

                        return (
                          <div
                            key={slotKey}
                            style={{
                              background: isGolden
                                ? 'rgba(245, 158, 11, 0.12)'
                                : 'rgba(255, 255, 255, 0.04)',
                              border: `1px solid ${isGolden ? 'rgba(245, 158, 11, 0.35)' : 'rgba(255, 255, 255, 0.08)'}`,
                              borderRadius: '8px',
                              padding: '10px 8px',
                              fontSize: '0.7rem',
                              textAlign: 'center',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            <div style={{ fontWeight: 700, color: isGolden ? '#FBBF24' : '#94A3B8' }}>
                              {slotKey}
                            </div>
                            <div style={{
                              fontSize: '0.66rem',
                              color: 'rgba(255, 255, 255, 0.8)',
                              marginTop: '3px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {assignedSkuId || 'Empty'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Transit Walk Path Metric */}
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Picker Path Efficiency: <strong style={{ color: isSlottingOptimized ? '#22C55E' : '#EF4444' }}>
                    {isSlottingOptimized ? "108m (Golden Loop)" : "184m (Disjointed Zigzag)"}
                  </strong>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#A855F7', fontWeight: 600 }}>
                  Distance Saved: {isSlottingOptimized ? `${slottingData.transit_reduction_pct}%` : '0%'}
                </div>
              </div>
            </div>

            {/* Right: Key Performance Indicators & Surgical Migration Schedule */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Metric Highlights */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: '16px',
                  padding: '16px'
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
                    WALK DISTANCE PER 100 ORDERS
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#22C55E', marginTop: '4px' }}>
                    {isSlottingOptimized ? `${slottingData.picker_walk_optimized_meters}m` : `${slottingData.picker_walk_initial_meters}m`}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#4ADE80', marginTop: '4px' }}>
                    {isSlottingOptimized ? `-${slottingData.transit_reduction_pct}% transit reduction` : "Baseline unoptimized"}
                  </div>
                </div>

                <div style={{
                  background: 'rgba(0, 113, 227, 0.1)',
                  border: '1px solid rgba(0, 113, 227, 0.25)',
                  borderRadius: '16px',
                  padding: '16px'
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
                    AVG PICK-AND-PACK DURATION
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#60A5FA', marginTop: '4px' }}>
                    {isSlottingOptimized ? `${slottingData.avg_pick_time_optimized_sec}s` : `${slottingData.avg_pick_time_initial_sec}s`}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#93C5FD', marginTop: '4px' }}>
                    {isSlottingOptimized ? "Compressed by 36.3s" : "High walk latency"}
                  </div>
                </div>
              </div>

              {/* Migration Waves Schedule during slack windows */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.35)',
                borderRadius: '18px',
                padding: '18px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                flex: 1
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h5 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>
                    Autonomous Slack-Window Bin Swaps
                  </h5>
                  <span style={{ fontSize: '0.7rem', color: '#C084FC', fontWeight: 600 }}>
                    {slottingData.migration_waves?.length || 0} Recommended Moves
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {slottingData.migration_waves?.map((move, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#FFFFFF' }}>
                          {move.sku_name}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
                          {move.category} • Urgency: <span style={{ color: move.urgency === 'High' ? '#F59E0B' : '#60A5FA' }}>{move.urgency}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
                        <span style={{ color: '#EF4444', textDecoration: 'line-through' }}>{move.from_slot}</span>
                        <ArrowRight size={13} color="#94A3B8" />
                        <span style={{ color: '#22C55E', fontWeight: 700 }}>{move.to_slot}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* MODE B: SWARM INTERCEPT FLEET */}
      {activeMode === 'swarm' && swarmData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            {/* Left: Dynamic Radar Simulation Graphic */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '18px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                    Hyperlocal Swarm Intercept Radar
                  </h4>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Dynamic geometric rendezvous at traffic junctions without depot returns
                  </p>
                </div>
                <span style={{
                  background: 'rgba(34, 197, 94, 0.2)',
                  color: '#4ADE80',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 600
                }}>
                  ACTIVE RENDEZVOUS
                </span>
              </div>

              {/* Vector Radar Canvas Simulation */}
              <div style={{
                height: '240px',
                borderRadius: '14px',
                background: 'radial-gradient(circle at center, rgba(168, 85, 247, 0.08) 0%, rgba(15, 23, 42, 0.6) 80%)',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* Radar Grid Rings */}
                <div style={{ position: 'absolute', width: '180px', height: '180px', borderRadius: '50%', border: '1px dashed rgba(255, 255, 255, 0.08)' }} />
                <div style={{ position: 'absolute', width: '100px', height: '100px', borderRadius: '50%', border: '1px dashed rgba(255, 255, 255, 0.12)' }} />

                {/* Hub Depot (Left) */}
                <div style={{ position: 'absolute', left: '15%', top: '35%', textAlign: 'center' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#3B82F6', margin: '0 auto', boxShadow: '0 0 10px #3B82F6' }} />
                  <span style={{ fontSize: '0.65rem', color: '#93C5FD', marginTop: '4px', display: 'block' }}>Koramangala Hub</span>
                </div>

                {/* Courier 1 Vector Vector */}
                <motion.div
                  animate={{ x: [0, 60, 110], y: [0, 15, 30] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  style={{ position: 'absolute', left: '20%', top: '38%', width: '12px', height: '12px', borderRadius: '50%', background: '#F59E0B', boxShadow: '0 0 8px #F59E0B' }}
                />

                {/* Rendezvous Junction (Center-Right) */}
                <div style={{ position: 'absolute', left: '55%', top: '50%', textAlign: 'center' }}>
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(168, 85, 247, 0.3)',
                      border: '2px solid #C084FC',
                      margin: '0 auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FFFFFF' }} />
                  </motion.div>
                  <span style={{ fontSize: '0.68rem', color: '#E9D5FF', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                    {swarmData.swarm_intercept_pipeline.rendezvous_waypoint.name}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: '#A855F7' }}>30s Hand-Off</span>
                </div>

                {/* Customer Destination (Far Right) */}
                <div style={{ position: 'absolute', right: '12%', bottom: '25%', textAlign: 'center' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#22C55E', margin: '0 auto', boxShadow: '0 0 10px #22C55E' }} />
                  <span style={{ fontSize: '0.65rem', color: '#86EFAC', marginTop: '4px', display: 'block' }}>VIP Customer Drop</span>
                </div>
              </div>

              {/* Traffic Friction Slider */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Simulate Urban Traffic Congestion:</span>
                  <span style={{ color: '#F59E0B', fontWeight: 700 }}>{trafficMultiplier}x Gridlock</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="2.5"
                  step="0.1"
                  value={trafficMultiplier}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setTrafficMultiplier(val);
                    fetchSwarmData(val);
                  }}
                  style={{ width: '100%', accentColor: '#A855F7', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Right: Head-to-Head SLA Defense Comparison */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Baseline Pipeline Box */}
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '16px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#F87171', fontWeight: 600 }}>
                    TRADITIONAL SINGLE-RIDER RETURN TRIP
                  </span>
                  <span style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#EF4444',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.68rem',
                    fontWeight: 700
                  }}>
                    {swarmData.baseline_pipeline.sla_status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#EF4444', marginTop: '6px' }}>
                  {swarmData.baseline_pipeline.total_duration_min} min
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
                  Rider travels full {swarmData.baseline_pipeline.total_distance_km}km through traffic gridlock. Breaches 10m target by {Math.max(0, swarmData.baseline_pipeline.total_duration_min - 10.0).toFixed(1)}m.
                </div>
              </div>

              {/* Swarm Intercept Box */}
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                borderRadius: '16px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#4ADE80', fontWeight: 600 }}>
                    AUTONOMOUS SWARM INTERCEPT HANDOFF
                  </span>
                  <span style={{
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#22C55E',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.68rem',
                    fontWeight: 700
                  }}>
                    {swarmData.swarm_intercept_pipeline.sla_status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#22C55E', marginTop: '6px' }}>
                  {swarmData.swarm_intercept_pipeline.total_duration_min} min
                </div>
                <div style={{ fontSize: '0.72rem', color: '#86EFAC', marginTop: '4px' }}>
                  ⚡ Saved {swarmData.swarm_intercept_pipeline.time_saved_min} minutes • Battery saved: {swarmData.swarm_intercept_pipeline.battery_burn_saved_pct}%
                </div>
              </div>

              {/* Tactical Summary Advisory */}
              <div style={{
                background: 'rgba(168, 85, 247, 0.12)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                borderRadius: '14px',
                padding: '12px 14px',
                fontSize: '0.75rem',
                color: '#E9D5FF',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Sparkles size={16} color="#C084FC" style={{ flexShrink: 0 }} />
                <span>{swarmData.tactical_advisory}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* MODE C: SELF-HEALING URBAN MESH */}
      {activeMode === 'mesh' && meshData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {/* Top Ledger Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '14px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)' }}>ACTIVE MESH HUBS</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '4px' }}>{meshData.active_hubs_count} Stores</div>
            </div>
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderRadius: '14px', padding: '14px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <div style={{ fontSize: '0.7rem', color: '#86EFAC' }}>SPOILED UNITS PREVENTED</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#22C55E', marginTop: '4px' }}>{meshData.total_spoilage_units_saved} Units</div>
            </div>
            <div style={{ background: 'rgba(0, 113, 227, 0.1)', borderRadius: '14px', padding: '14px', border: '1px solid rgba(0, 113, 227, 0.2)' }}>
              <div style={{ fontSize: '0.7rem', color: '#93C5FD' }}>STOCKOUT GMV PROTECTED</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#60A5FA', marginTop: '4px' }}>₹{meshData.total_stockout_gmv_saved_inr}</div>
            </div>
            <div style={{ background: 'rgba(168, 85, 247, 0.15)', borderRadius: '14px', padding: '14px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              <div style={{ fontSize: '0.7rem', color: '#D8B4FE' }}>NET ECONOMIC ALPHA</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#C084FC', marginTop: '4px' }}>+₹{meshData.net_grid_alpha_inr}</div>
            </div>
          </div>

          {/* Active Transshipment Route Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {meshData.transshipments?.map((tr, idx) => (
              <div
                key={tr.transfer_id || idx}
                style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  borderRadius: '16px',
                  padding: '18px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#C084FC', fontWeight: 700 }}>
                    {tr.transfer_id}
                  </span>
                  <span style={{
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#4ADE80',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.68rem',
                    fontWeight: 600
                  }}>
                    {tr.status}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600 }}>
                  <span style={{ color: '#F59E0B' }}>{tr.source_hub_name}</span>
                  <ArrowRight size={16} color="#94A3B8" />
                  <span style={{ color: '#60A5FA' }}>{tr.target_hub_name}</span>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '6px' }}>
                  {tr.vehicle_type} • {tr.distance_km} km ({tr.transit_duration_min} min transit)
                </div>

                {/* Items Transferred */}
                <div style={{ marginTop: '12px', background: 'rgba(255, 255, 255, 0.02)', padding: '10px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>CARGO MANIFEST</div>
                  {tr.items?.map((item, itemIdx) => (
                    <div key={itemIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginTop: '2px' }}>
                      <span style={{ color: '#FFFFFF' }}>{item.sku}</span>
                      <span style={{ color: '#22C55E', fontWeight: 600 }}>{item.transfer_units} units (Saved ₹{item.transfer_units * item.unit_price})</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    EV Route Cost: <span style={{ color: '#EF4444' }}>₹{tr.ev_logistics_cost_inr}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#22C55E', fontWeight: 700 }}>
                    Net Gain: +₹{tr.net_economic_gain_inr}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
