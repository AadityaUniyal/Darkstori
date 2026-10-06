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
      background: '#07090E',
      pointerEvents: 'none'
    }}>
      {/* Apple-grade subtle deep space ambient illumination */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '20%',
        width: '65vw',
        height: '50vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0, 113, 227, 0.05) 0%, rgba(0, 113, 227, 0) 70%)',
        filter: 'blur(80px)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '15%',
        width: '50vw',
        height: '45vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(14, 165, 233, 0.035) 0%, rgba(14, 165, 233, 0) 70%)',
        filter: 'blur(90px)',
      }} />
    </div>
  );
}
