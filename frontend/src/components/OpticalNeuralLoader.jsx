import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Scan, Target, Cpu, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

const CALIBRATION_STEPS = [
  { step: 'OPTICAL_ALIGNMENT', text: 'Calibrating WebRTC video pipeline & aperture...' },
  { step: 'MANDI_MODEL_WARM', text: 'Warming Indian Mandi produce neural weights (v4.2)...' },
  { step: 'CHROMA_DECAY', text: 'Indexing RGB chlorophyll dispersion & surface rot thresholds...' },
  { step: 'BLUETOOTH_SCALE', text: 'Locking tare weight calibration (±0.0g tolerance)...' },
  { step: 'CRYPTO_SEAL', text: 'Initializing SHA-256 digital passport cryptographic engine...' },
  { step: 'READY', text: 'VisionPack AI™ Dock calibrated. Engaging live optical scanner...' },
];

export default function OpticalNeuralLoader({ onComplete, autoDismiss = true, durationMs = 2400 }) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [fps, setFps] = useState(59.4);
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStepIdx(prev => {
        if (prev < CALIBRATION_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, durationMs / CALIBRATION_STEPS.length);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + Math.floor(Math.random() * 8 + 5);
      });
      setFps((58 + Math.random() * 2).toFixed(1));
    }, 120);

    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, durationMs);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, [durationMs, onComplete]);

  const activeStep = CALIBRATION_STEPS[currentStepIdx];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#02040A] text-white overflow-hidden select-none">
      {/* Background Cyber-Grid with Laser Radial Glow */}
      <div 
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 240, 255, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 240, 255, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute inset-0 bg-radial from-transparent via-[#02040A]/80 to-[#02040A]" />

      {/* Central Targeting Reticle */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
        {/* Outer Pulsing Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-2 border-dashed border-[#00F0FF]/30 shadow-[0_0_30px_rgba(0,240,255,0.2)]"
        />

        {/* Counter-Rotating Inner Ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-4 rounded-full border border-dotted border-[#10F98E]/40"
        />

        {/* Bounding Corner Brackets */}
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#00F0FF]" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#00F0FF]" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#00F0FF]" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#00F0FF]" />

        {/* Sweeping Laser Line */}
        <motion.div
          animate={{ y: [-110, 110, -110] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-52 h-[2px] bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent shadow-[0_0_12px_#00F0FF]"
        />

        {/* Center Target Icon */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="p-4 rounded-2xl bg-[#00F0FF]/10 border border-[#00F0FF]/40 shadow-[0_0_25px_rgba(0,240,255,0.3)]">
            <Scan size={36} className="text-[#00F0FF] animate-pulse" />
          </div>
          <span className="mt-3 text-[10px] font-mono font-bold tracking-widest text-[#00F0FF] uppercase">
            VISIONPACK AI™
          </span>
        </div>
      </div>

      {/* Real-Time Calibration Telemetry */}
      <div className="mt-8 text-center max-w-md px-6 z-10 space-y-3">
        <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold text-[#10F98E]">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10F98E] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10F98E]"></span>
          </span>
          <span>OPTICAL SENSOR: 1080P @ {fps} FPS</span>
        </div>

        {/* Dynamic Loading Step Text */}
        <div className="h-6 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={activeStep.step}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-slate-300 font-medium font-mono"
            >
              {activeStep.text}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* High-Tech Progress Bar */}
        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden border border-white/10 p-[1px]">
          <motion.div
            className="h-full bg-gradient-to-r from-[#00F0FF] via-[#10F98E] to-[#00F0FF] rounded-full shadow-[0_0_10px_#00F0FF]"
            style={{ width: `${Math.min(100, progress)}%` }}
            transition={{ ease: 'easeOut', duration: 0.1 }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>STATION: DOCK-OPTICAL-01</span>
          <span className="text-[#00F0FF] font-bold">{Math.min(100, progress)}% COMPLETE</span>
          <span>NEON: CONNECTED</span>
        </div>
      </div>
    </div>
  );
}
