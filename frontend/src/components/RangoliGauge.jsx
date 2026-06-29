import React from 'react';

/**
 * RangoliGauge Component
 * @param {number} value - The actual score value
 * @param {number} max - The maximum scale value (usually 10 for opportunity, 100 for coverage)
 * @param {'opportunity' | 'coverage'} type - Gauge type
 * @param {number} size - Size in pixels (default 64)
 */
export default function RangoliGauge({ value = 0, max = 10, type = 'opportunity', size = 64 }) {
  const normalizedValue = Math.max(0, Math.min(value, max));
  const fillFraction = normalizedValue / max;
  const numPetals = 8;
  const activePetals = Math.round(fillFraction * numPetals);

  // Determine color based on score
  let activeColor = 'var(--peacock-500)';
  if (type === 'opportunity') {
    if (normalizedValue < 4.0) {
      activeColor = 'var(--saffron-500)';
    } else if (normalizedValue < 8.0) {
      activeColor = 'var(--marigold-500)';
    } else {
      activeColor = 'var(--monsoon-500)';
    }
  } else {
    // Coverage: peacock to monsoon gradient mapping
    if (fillFraction < 0.4) {
      activeColor = 'var(--spice-500)'; // gap/poor
    } else if (fillFraction < 0.75) {
      activeColor = 'var(--peacock-500)'; // moderate
    } else {
      activeColor = 'var(--monsoon-500)'; // good
    }
  }

  // Pre-calculated angles for 8 petals
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <div style={{
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: `${size}px`,
      height: `${size}px`,
    }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ transform: 'rotate(-90deg)' }} // start from top
      >
        {/* Background segments */}
        {angles.map((angle, i) => {
          const isActive = i < activePetals;
          return (
            <ellipse
              key={i}
              cx="50"
              cy="50"
              rx="30"
              ry="9"
              transform={`rotate(${angle} 50 50)`}
              fill={isActive ? `${activeColor}15` : 'none'}
              stroke={isActive ? activeColor : 'var(--color-border)'}
              strokeWidth={isActive ? '2.5' : '1'}
              style={{ transition: 'stroke 0.3s, fill 0.3s' }}
            />
          );
        })}
        {/* Central Core */}
        <circle
          cx="50"
          cy="50"
          r="12"
          fill="var(--color-bg-card)"
          stroke={activePetals > 0 ? activeColor : 'var(--color-border)'}
          strokeWidth="1.5"
        />
      </svg>
      {/* Center Score text */}
      <div style={{
        position: 'absolute',
        fontFamily: 'var(--font-mono)',
        fontSize: size > 48 ? '0.75rem' : '0.6rem',
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        pointerEvents: 'none',
      }}>
        {type === 'opportunity' ? value.toFixed(1) : `${Math.round(value)}%`}
      </div>
    </div>
  );
}
