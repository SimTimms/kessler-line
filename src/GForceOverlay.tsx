import { useRef, useEffect } from 'react';
import { shipAcceleration, THRUST } from './components/Ship/Spaceship';

export function GForceOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const gForceRef = useRef(0);

  useEffect(() => {
    let rafId: number;
    let lastTime = performance.now();

    const update = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Normalise: max acceleration = THRUST × 50× multiplier
      const normalizedAccel = Math.min(shipAcceleration.current / (THRUST * 50), 1);
      // Builds quickly, dissipates slowly — like a real g-force blackout
      const rate = normalizedAccel > gForceRef.current ? 3.0 : 0.8;
      gForceRef.current += (normalizedAccel - gForceRef.current) * delta * rate;

      if (overlayRef.current) {
        overlayRef.current.style.opacity = String(gForceRef.current * 0.95);
      }

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        opacity: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
