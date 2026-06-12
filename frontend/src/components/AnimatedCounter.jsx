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
        background: 'rgba(30, 41, 59, 0.45)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        minWidth: '220px',
        flex: 1
      }}
    >
      <div style={{
        background: `${color}18`,
        color: color,
        borderRadius: '12px',
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {Icon && <Icon size={24} />}
      </div>
      <div>
        <div style={{
          fontSize: '1.8rem',
          fontWeight: 800,
          color: '#ffffff',
          lineHeight: '1.2'
        }}>
          {typeof count === 'number' ? count.toLocaleString() : count}{suffix}
        </div>
        <div style={{
          fontSize: '0.78rem',
          fontWeight: 600,
          color: '#94a3b8',
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
