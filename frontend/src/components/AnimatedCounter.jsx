import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function AnimatedCounter({ value, label, icon: Icon, color = '#3b82f6', suffix = '' }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    if (isNaN(end) || end <= 0) {
      setCount(value);
      return;
    }

    const duration = 1.2; // seconds
    const increment = end / (duration * 60);
    const handle = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(handle);
        setCount(end);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);

    return () => clearInterval(handle);
  }, [value]);

  return (
    <motion.div
      className="kpi-card"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        background: 'var(--color-bg-card)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        minWidth: '220px',
        flex: 1
      }}
    >
      <div style={{
        background: `${color}18`,
        color: color,
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {Icon && <Icon size={24} />}
      </div>
      <div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.8rem',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          lineHeight: '1.2'
        }}>
          {typeof count === 'number' ? count.toLocaleString() : count}{suffix}
        </div>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.78rem',
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginTop: '4px'
        }}>
          {label}
        </div>
      </div>
    </motion.div>
  );
}
