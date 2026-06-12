import { motion } from 'framer-motion';

export default function RangoliLoader() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: '200px',
      width: '100%',
      color: '#94a3b8',
      fontFamily: 'Inter, sans-serif',
      fontSize: '0.88rem'
    }}>
      <motion.svg
        width="80"
        height="80"
        viewBox="0 0 100 100"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
        style={{ marginBottom: '16px' }}
      >
        {/* Central Lotus / Flower Geometric Shape */}
        <circle cx="50" cy="50" r="10" fill="none" stroke="#3b82f6" strokeWidth="2" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <ellipse
            key={i}
            cx="50"
            cy="50"
            rx="25"
            ry="8"
            transform={`rotate(${angle} 50 50)`}
            fill="none"
            stroke={i % 2 === 0 ? "#60a5fa" : "#3b82f6"}
            strokeWidth="1.5"
            opacity="0.8"
          />
        ))}
        {/* Outer Ring */}
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="#1e293b"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
      </motion.svg>
      <div style={{ fontWeight: 600, letterSpacing: '0.05em', color: '#60a5fa', animation: 'pulse 1.5s infinite' }}>
        LOADING HYPERLOCAL INTELLIGENCE...
      </div>
    </div>
  );
}
