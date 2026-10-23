import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Store, Navigation, Sparkles } from 'lucide-react';

const PERSONAS = [
  {
    id: 'executive',
    label: 'Executive Lens',
    subtext: 'Capital ROI & Net Alpha',
    icon: Briefcase,
    color: '#0071E3',
    badge: 'C-Suite'
  },
  {
    id: 'store-gm',
    label: 'Store GM Lens',
    subtext: 'Digital Twin & Micro-Warehouse',
    icon: Store,
    color: '#A855F7',
    badge: 'Operations'
  },
  {
    id: 'fleet-commander',
    label: 'Fleet Commander Lens',
    subtext: 'Swarm Intercept & Dispatch',
    icon: Navigation,
    color: '#10B981',
    badge: 'Logistics'
  }
];

export default function ApplePersonaSelector({ activePersona, onSelectPersona, audioFeedback }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: 'rgba(255, 255, 255, 0.04)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '20px',
      padding: '5px',
      position: 'relative',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
      userSelect: 'none'
    }}>
      {PERSONAS.map(p => {
        const Icon = p.icon;
        const isSelected = activePersona === p.id;

        return (
          <button
            key={p.id}
            onClick={() => {
              onSelectPersona(p.id);
              if (audioFeedback) audioFeedback('tactical');
            }}
            style={{
              position: 'relative',
              background: 'transparent',
              border: 'none',
              borderRadius: '16px',
              padding: '10px 18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              zIndex: 1,
              outline: 'none',
              transition: 'color 0.2s ease',
              color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'
            }}
          >
            {/* Sliding Fluid Indicator */}
            {isSelected && (
              <motion.div
                layoutId="apple-persona-pill"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '15px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04))',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
                  zIndex: -1
                }}
              />
            )}

            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '10px',
              background: isSelected ? `${p.color}33` : 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isSelected ? p.color : 'rgba(255, 255, 255, 0.5)',
              transition: 'all 0.2s ease'
            }}>
              <Icon size={15} />
            </div>

            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontSize: '0.82rem',
                fontWeight: isSelected ? 600 : 500,
                letterSpacing: '-0.01em',
                lineHeight: 1.2
              }}>
                {p.label}
              </div>
              <div style={{
                fontSize: '0.66rem',
                color: isSelected ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.4)',
                marginTop: '1px'
              }}>
                {p.subtext}
              </div>
            </div>

            <span style={{
              fontSize: '0.6rem',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '6px',
              background: isSelected ? `${p.color}26` : 'rgba(255, 255, 255, 0.05)',
              color: isSelected ? p.color : 'rgba(255, 255, 255, 0.35)',
              border: `1px solid ${isSelected ? `${p.color}40` : 'transparent'}`,
              marginLeft: '4px'
            }}>
              {p.badge}
            </span>
          </button>
        );
      })}
    </div>
  );
}
