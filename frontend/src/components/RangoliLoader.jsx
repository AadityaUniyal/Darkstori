import { motion, useReducedMotion } from 'framer-motion';

export default function RangoliLoader() {
  const shouldReduceMotion = useReducedMotion();

  const rotationAnimation = shouldReduceMotion
    ? {}
    : { rotate: 360 };

  const pulseAnimation = shouldReduceMotion
    ? { opacity: [0.4, 1, 0.4] }
    : {};

  const transition = shouldReduceMotion
    ? { repeat: Infinity, duration: 2, ease: "easeInOut" }
    : { repeat: Infinity, duration: 7, ease: "linear" };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: '200px',
      width: '100%',
      color: 'var(--color-text-muted)',
      fontFamily: 'var(--font-body)',
      fontSize: '0.88rem'
    }}>
      <motion.svg
        width="80"
        height="80"
        viewBox="0 0 100 100"
        animate={shouldReduceMotion ? pulseAnimation : rotationAnimation}
        transition={transition}
        style={{ marginBottom: '16px' }}
      >
        {/* Background / Inner Ring */}
        <circle
          cx="50"
          cy="50"
          r="12"
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="1.5"
        />

        {/* 8 Petal geometry matching RangoliGauge */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <ellipse
            key={i}
            cx="50"
            cy="50"
            rx="30"
            ry="9"
            transform={`rotate(${angle} 50 50)`}
            fill="none"
            stroke={i % 2 === 0 ? "var(--saffron-500)" : "var(--peacock-500)"}
            strokeWidth="1.5"
            opacity="0.8"
          />
        ))}

        {/* Outer Ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
      </motion.svg>
      <div 
        style={{ 
          fontFamily: 'var(--font-display)',
          fontWeight: 600, 
          letterSpacing: '0.05em', 
          color: 'var(--saffron-500)', 
          animation: 'pulse 1.8s infinite ease-in-out' 
        }}
      >
        LOADING HYPERLOCAL INTELLIGENCE...
      </div>
    </div>
  );
}

