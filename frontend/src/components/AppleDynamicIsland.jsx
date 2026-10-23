import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, CheckCircle2, ChevronRight, HelpCircle, ArrowRight,
  ShieldCheck, Radio, AlertTriangle, Truck
} from 'lucide-react';
import { toast } from 'sonner';

export default function AppleDynamicIsland({ onOpenExplainModal, audioFeedback }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isActionExecuted, setIsActionExecuted] = useState(false);

  const handleExecute = (e) => {
    e.stopPropagation();
    setIsActionExecuted(true);
    if (audioFeedback) audioFeedback('success');
    toast.success("Autonomous Transshipment Authorized: EV Cargo Van #EV-4 dispatched!");
    setTimeout(() => {
      setIsExpanded(false);
    }, 1500);
  };

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '20px',
      zIndex: 40
    }}>
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        onClick={() => {
          setIsExpanded(!isExpanded);
          if (audioFeedback) audioFeedback('tactical');
        }}
        style={{
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: isExpanded ? '24px' : '30px',
          padding: isExpanded ? '18px 24px' : '10px 20px',
          boxShadow: isExpanded
            ? '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.15)'
            : '0 8px 24px rgba(0, 0, 0, 0.35)',
          cursor: 'pointer',
          color: '#FFFFFF',
          maxWidth: isExpanded ? '640px' : '440px',
          width: '100%',
          overflow: 'hidden'
        }}
      >
        {/* Compact Resting Pill State */}
        {!isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#22C55E',
                  boxShadow: '0 0 10px #22C55E'
                }} />
                <span style={{
                  position: 'absolute',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.3)',
                  animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
                }} />
              </div>

              <div style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '-0.01em', color: '#FFFFFF' }}>
                4 Hubs Synced • Conformal SLA 99.2% Defended
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                background: 'rgba(168, 85, 247, 0.2)',
                color: '#C084FC',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.66rem',
                fontWeight: 600
              }}>
                1 Action Pending
              </span>
              <ChevronRight size={14} color="rgba(255, 255, 255, 0.4)" />
            </div>
          </motion.div>
        )}

        {/* Expanded Live Activity Capsule State */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {/* Top Bar inside Island */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#F59E0B',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.66rem',
                  fontWeight: 700
                }}>
                  CRITICAL AUTONOMOUS TRIAGE
                </span>
                <span style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                  Inter-Hub Mesh Balance
                </span>
              </div>

              <span style={{ fontSize: '0.72rem', color: '#4ADE80', fontWeight: 600 }}>
                +₹5,850 Net Alpha
              </span>
            </div>

            {/* Description */}
            <div style={{ fontSize: '0.84rem', color: '#FFFFFF', lineHeight: 1.45 }}>
              Koramangala holds <strong>50 surplus units</strong> of Milk & Sourdough (spoilage hazard in 6h). Indiranagar is down to 4 units.
            </div>

            {/* Route Summary */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '8px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.74rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#93C5FD' }}>
                <Truck size={14} />
                <span>EV Cargo Van #EV-4 • 4.2 km (15 min transit)</span>
              </div>
              <span style={{ color: '#22C55E', fontWeight: 600 }}>Zero Spoilage Risk</span>
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenExplainModal) onOpenExplainModal();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#C084FC',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 8px',
                  borderRadius: '6px'
                }}
              >
                <HelpCircle size={14} />
                <span>Why this Decision?</span>
              </button>

              <button
                onClick={handleExecute}
                disabled={isActionExecuted}
                style={{
                  background: isActionExecuted ? 'rgba(34, 197, 94, 0.25)' : 'linear-gradient(135deg, #0071E3, #A855F7)',
                  border: `1px solid ${isActionExecuted ? '#22C55E' : 'transparent'}`,
                  borderRadius: '12px',
                  padding: '8px 18px',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: isActionExecuted ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(0, 113, 227, 0.35)'
                }}
              >
                <CheckCircle2 size={14} />
                <span>{isActionExecuted ? "Authorized & En Route" : "Authorize 1-Click Dispatch"}</span>
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
