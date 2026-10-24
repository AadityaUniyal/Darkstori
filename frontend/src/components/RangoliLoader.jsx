import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Clock, Zap, ShoppingBag, ShieldCheck, CheckCircle2 } from 'lucide-react';

const TELEMETRY_MSGS = [
  "Connecting to Koramangala 4th Block Micro-Warehouse...",
  "Pre-staging Bay C3 Baskets via Hawkes Point Process...",
  "Verifying 95% Conformal Prediction SLA Window...",
  "Calibrating Clarke-Wright VRP Multi-Drop Loops...",
  "Autonomous Swarm Intercept Active • 7.4 min Upper Bound"
];

export default function RangoliLoader() {
  const shouldReduceMotion = useReducedMotion();
  const [msgIdx, setMsgIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(599); // 09:59

  useEffect(() => {
    const timerInterval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 444 ? prev - 1 : 599));
    }, 80);

    const msgInterval = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % TELEMETRY_MSGS.length);
    }, 1800);

    return () => {
      clearInterval(timerInterval);
      clearInterval(msgInterval);
    };
  }, []);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[320px] w-full p-6 text-white font-sans select-none">
      <div className="relative flex flex-col items-center max-w-sm w-full p-6 rounded-3xl bg-[#0F1522]/90 border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute -top-10 -left-10 w-28 h-28 bg-[#FF9F1C]/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-[#7C3AED]/20 rounded-full blur-2xl pointer-events-none" />

        {/* 10-Min Live Delivery Countdown Capsule */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] mb-5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
          </span>
          <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400">10-MIN SLA GUARANTEE</span>
        </div>

        {/* Central Quick Commerce Rider & Bag Animation Stage */}
        <div className="relative w-28 h-28 flex items-center justify-center my-2">
          {/* Animated Speed Rings */}
          <motion.div
            animate={shouldReduceMotion ? {} : { rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-[#FF9F1C]/35"
          />
          <motion.div
            animate={shouldReduceMotion ? {} : { rotate: -360 }}
            transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
            className="absolute inset-2 rounded-full border border-dotted border-[#7C3AED]/40"
          />

          {/* Delivery Bag Icon with Micro-Spring */}
          <motion.div
            animate={shouldReduceMotion ? {} : { y: [-2, 3, -2], scale: [1, 1.04, 1] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF9F1C] to-[#FF6B00] flex items-center justify-center shadow-[0_0_24px_rgba(255,159,28,0.4)] relative z-10"
          >
            <ShoppingBag size={28} className="text-white drop-shadow" />
            
            {/* Speed Sparkle */}
            <motion.div
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#10B981] border-2 border-[#0F1522] flex items-center justify-center"
            >
              <Zap size={9} className="text-white fill-white" />
            </motion.div>
          </motion.div>
        </div>

        {/* Stopwatch Readout */}
        <div className="mt-3 text-center">
          <div className="font-mono text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
            <Clock size={16} className="text-[#FF9F1C]" />
            <span>{timeFormatted}</span>
            <span className="text-xs font-sans font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md ml-1">
              DEFENDED
            </span>
          </div>
          <div className="text-[11px] text-white/50 font-medium mt-1">
            Avg Hub Upper Bound: <strong className="text-white/80">7.4 min</strong>
          </div>
        </div>

        {/* Real-time Indian Quick Commerce Telemetry Line */}
        <div className="mt-5 w-full pt-3 border-t border-white/[0.06] text-center">
          <p className="text-xs font-semibold text-[#FF9F1C] h-5 transition-all duration-300 truncate">
            {TELEMETRY_MSGS[msgIdx]}
          </p>
          <div className="flex justify-center items-center gap-1.5 mt-2">
            {TELEMETRY_MSGS.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === msgIdx ? 'w-5 bg-[#FF9F1C]' : 'w-1.5 bg-white/15'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
