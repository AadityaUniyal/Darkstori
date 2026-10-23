import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Command, Sparkles, Navigation, Store, Briefcase } from 'lucide-react';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { keyCombo: ['⌘', '1'], description: 'Switch to Executive Lens', category: 'Navigation', icon: Briefcase },
    { keyCombo: ['⌘', '2'], description: 'Switch to Store GM Lens', category: 'Navigation', icon: Store },
    { keyCombo: ['⌘', '3'], description: 'Switch to Fleet Commander Lens', category: 'Navigation', icon: Navigation },
    { keyCombo: ['⌘', 'K'], description: 'Open Global Command Palette', category: 'System', icon: Command },
    { keyCombo: ['?'], description: 'Toggle this Shortcuts Guide', category: 'System', icon: Sparkles },
    { keyCombo: ['Esc'], description: 'Dismiss active dialog or modal', category: 'System', icon: X },
  ];

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 30, stiffness: 450 }}
          style={{
            width: '100%',
            maxWidth: '540px',
            background: 'rgba(18, 24, 38, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            color: '#FFFFFF',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF'
              }}>
                <Command size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                  Keyboard Shortcuts
                </h3>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                  High-velocity control for dark store operators
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Shortcuts List */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {shortcuts.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ color: '#94A3B8' }}>
                      <Icon size={16} />
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.85)' }}>
                      {s.description}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    {s.keyCombo.map((k, kIdx) => (
                      <kbd
                        key={kIdx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.72rem',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: '#FFFFFF'
                        }}
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{
            padding: '14px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.72rem',
            color: 'rgba(255, 255, 255, 0.5)'
          }}>
            <span>Press <kbd style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '1px 5px', borderRadius: '4px', color: '#fff' }}>Esc</kbd> anytime to exit</span>
            <span style={{ color: '#A855F7', fontWeight: 600 }}>Apple HIG Standard</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
