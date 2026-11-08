import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ShoppingBag, Loader2 } from 'lucide-react';

export default function RangoliLoader() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] w-full p-6 text-white font-sans select-none">
      <div className="relative flex flex-col items-center max-w-xs w-full p-6 rounded-3xl bg-[#0F1522]/90 border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute -top-10 -left-10 w-24 h-24 bg-[#FF9F1C]/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-[#7C3AED]/15 rounded-full blur-2xl pointer-events-none" />

        {/* Central Hub & Bag Icon Stage */}
        <div className="relative w-20 h-20 flex items-center justify-center my-3">
          <motion.div
            animate={shouldReduceMotion ? {} : { rotate: 360 }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-[#FF9F1C]/40"
          />

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF9F1C] to-[#FF6B00] flex items-center justify-center shadow-[0_0_20px_rgba(255,159,28,0.35)] relative z-10">
            <ShoppingBag size={24} className="text-white drop-shadow" />
          </div>
        </div>

        {/* Status Text */}
        <div className="mt-2 text-center space-y-1">
          <div className="text-sm font-bold text-white tracking-wide">
            Darkstori Intelligence
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-white/60 font-medium">
            <Loader2 size={13} className="animate-spin text-[#FF9F1C]" />
            <span>Synchronizing operations...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
