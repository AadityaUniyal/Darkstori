import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, CheckCircle2, ShieldCheck, ArrowRight,
  TrendingDown, Zap, Eye, Calculator, DollarSign
} from 'lucide-react';

export default function ExplainableAiModal({ isOpen, onClose, decision, onConfirmAction }) {
  if (!isOpen) return null;

  const data = decision || {
    title: "Autonomous Anticipatory Pre-Pick & Staging",
    category: "Neuro-Symbolic Actuation",
    sku_name: "Farm Fresh Whole Milk 1L + Artisanal Sourdough",
    location: "Koramangala 4th Block Hub (Aisle 1 ➔ Staging Bay C3)",
    observation: "Customer dwelt 45s in Dairy and added Espresso Roast. Point process self-excitation and cross-excitation triggered 94.2% checkout probability.",
    math_engine: "Multivariate Hawkes Mutual-Excitation: λ_j(t) = μ_j + Σ α_ij · e^(-β Δt). Calibrated via Locally-Adaptive Conformal Quantile Regression.",
    statistical_guarantee: "Distribution-free 95% SLA coverage bound (q_hi ≤ 7.4 min).",
    economic_impact: "Defends ₹140 GMV, saves 1.8 min in picker transit, and prevents 10-minute SLA failure.",
    action_label: "Authorize Pre-Stage at Bay C3"
  };

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)'
      }}>
        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 30, stiffness: 400 }}
          style={{
            width: '100%',
            maxWidth: '680px',
            background: 'rgba(18, 24, 38, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '28px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            color: '#FFFFFF',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {/* Subtle Ambient Top Radial Glow */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '450px',
            height: '180px',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          {/* Modal Header */}
          <div style={{
            padding: '24px 28px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            position: 'relative',
            zIndex: 1
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{
                  background: 'rgba(168, 85, 247, 0.2)',
                  color: '#C084FC',
                  border: '1px solid rgba(168, 85, 247, 0.35)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em'
                }}>
                  {data.category}
                </span>
                <span style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                  {data.location}
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                Why Did the AI Trigger This Decision?
              </h3>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body: 4 Explainability Layers */}
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '68vh', overflowY: 'auto' }}>
            {/* Layer 1: The Human/Physical Observation */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              gap: '14px'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60A5FA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Eye size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#93C5FD', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  1. Real-Time Telemetry Observation
                </div>
                <div style={{ fontSize: '0.84rem', color: '#FFFFFF', marginTop: '4px', lineHeight: 1.5 }}>
                  {data.observation}
                </div>
              </div>
            </div>

            {/* Layer 2: Mathematical Engine & Excitation Modeling */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              gap: '14px'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#C084FC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Calculator size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#C084FC', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  2. Algorithmic Formulation
                </div>
                <div style={{ fontSize: '0.84rem', color: '#FFFFFF', marginTop: '4px', lineHeight: 1.5, fontFamily: 'monospace' }}>
                  {data.math_engine}
                </div>
              </div>
            </div>

            {/* Layer 3: Finite-Sample Statistical Coverage Proof */}
            <div style={{
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              gap: '14px'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(34, 197, 94, 0.2)',
                color: '#4ADE80',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#4ADE80', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  3. Distribution-Free Statistical Guarantee
                </div>
                <div style={{ fontSize: '0.84rem', color: '#86EFAC', marginTop: '4px', lineHeight: 1.5 }}>
                  {data.statistical_guarantee}
                </div>
              </div>
            </div>

            {/* Layer 4: Net Dollar Economic Alpha */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              gap: '14px'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#FBBF24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <DollarSign size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#FBBF24', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  4. Bottom-Line Financial Alpha
                </div>
                <div style={{ fontSize: '0.84rem', color: '#FDE68A', marginTop: '4px', lineHeight: 1.5 }}>
                  {data.economic_impact}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer / Action Button */}
          <div style={{
            padding: '20px 28px 24px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.2)'
          }}>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '10px 18px',
                color: 'rgba(255, 255, 255, 0.75)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>

            <button
              onClick={() => {
                if (onConfirmAction) onConfirmAction();
                onClose();
              }}
              style={{
                background: 'linear-gradient(135deg, #FF9F1C, #A855F7)',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 22px',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(0, 113, 227, 0.4)'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{data.action_label}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
