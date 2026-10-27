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
      background: '#090B10',
      pointerEvents: 'none'
    }}>
      {/* Subtle deep space ambient illumination */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '20%',
        width: '65vw',
        height: '50vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 70%)',
        filter: 'blur(80px)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '15%',
        width: '50vw',
        height: '45vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245, 158, 11, 0.015) 0%, rgba(245, 158, 11, 0) 70%)',
        filter: 'blur(90px)',
      }} />
    </div>
  );
}
