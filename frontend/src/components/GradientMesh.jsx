import React from 'react';

const GradientMesh = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <style>{`
        @keyframes float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(5%, 5%) scale(1.05); }
          66% { transform: translate(-5%, 8%) scale(0.95); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-8%, -5%) scale(0.95); }
          66% { transform: translate(5%, -8%) scale(1.05); }
        }
        @keyframes float-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(8%, 5%) scale(1.1); }
        }
        .mesh-bg {
          background-color: hsl(var(--background));
          width: 100vw;
          height: 100vh;
          position: absolute;
          inset: 0;
        }
        .mesh-blob-1 {
          position: absolute;
          top: -10%;
          left: -10%;
          width: 50vw;
          height: 50vw;
          background: radial-gradient(circle, hsla(var(--primary)/0.15) 0%, transparent 70%);
          border-radius: 50%;
          animation: float-1 20s infinite ease-in-out;
        }
        .mesh-blob-2 {
          position: absolute;
          bottom: -20%;
          right: -10%;
          width: 60vw;
          height: 60vw;
          background: radial-gradient(circle, hsla(var(--saffron-500)/0.1) 0%, transparent 70%);
          border-radius: 50%;
          animation: float-2 25s infinite ease-in-out reverse;
        }
        .mesh-blob-3 {
          position: absolute;
          top: 30%;
          left: 40%;
          width: 40vw;
          height: 40vw;
          background: radial-gradient(circle, hsla(var(--peacock-500)/0.1) 0%, transparent 70%);
          border-radius: 50%;
          animation: float-3 22s infinite ease-in-out;
        }
        .mesh-noise {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E");
          mix-blend-mode: overlay;
        }
      `}</style>
      <div className="mesh-bg">
        <div className="mesh-blob-1" />
        <div className="mesh-blob-2" />
        <div className="mesh-blob-3" />
        <div className="mesh-noise" />
      </div>
    </div>
  );
};

export default GradientMesh;
