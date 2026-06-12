export default function AmbientBackground() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: -1,
      overflow: 'hidden',
      background: '#090d16',
      pointerEvents: 'none'
    }}>
      {/* Animated glowing orbs */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '15%',
        width: '50vw',
        height: '50vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0) 70%)',
        filter: 'blur(40px)',
        animation: 'pulse 12s infinite alternate'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '10%',
        width: '60vw',
        height: '60vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, rgba(168, 85, 247, 0) 70%)',
        filter: 'blur(60px)',
        animation: 'pulse 18s infinite alternate-reverse'
      }} />
    </div>
  );
}
