import { useRef, useEffect } from 'react';

export function ShipDestroyedOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDestroyed = () => {
      if (overlayRef.current) overlayRef.current.style.display = 'flex';
    };
    window.addEventListener('ShipDestroyed', onDestroyed);
    return () => window.removeEventListener('ShipDestroyed', onDestroyed);
  }, []);

  return (
    <div
      ref={overlayRef}
      style={{
        display: 'none',
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        pointerEvents: 'none',
        zIndex: 200,
      }}
    >
      <div
        style={{
          color: '#ff2222',
          fontSize: 52,
          fontFamily: 'monospace',
          fontWeight: 'bold',
          letterSpacing: '0.08em',
        }}
      >
        HULL BREACH
      </div>
      <div
        style={{ color: '#ff7777', fontSize: 22, fontFamily: 'monospace', letterSpacing: '0.12em' }}
      >
        SHIP DESTROYED
      </div>
    </div>
  );
}
