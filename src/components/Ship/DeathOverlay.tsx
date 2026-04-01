import { useEffect, useRef, useState } from 'react';
import { clearAllSaves } from '../../context/SaveStore';

type DeathCause = 'o2' | 'hull';

const CAUSE_CONFIG: Record<
  DeathCause,
  { title: string; subtitle: string; titleColor: string; subtitleColor: string }
> = {
  o2: {
    title: 'OXYGEN DEPLETED',
    subtitle: 'PILOT DECEASED',
    titleColor: '#707580',
    subtitleColor: '#3d4657',
  },
  hull: {
    title: 'HULL VENTED',
    subtitle: 'SHIP DESTROYED',
    titleColor: '#707580',
    subtitleColor: '#3d4657',
  },
};

export function DeathOverlay() {
  const triggeredRef = useRef(false);
  const [cause, setCause] = useState<DeathCause | null>(null);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const trigger = (c: DeathCause) => {
      if (triggeredRef.current) return;
      triggeredRef.current = true;
      setCause(c);
      setTimeout(() => setShowContent(true), 3500);
    };
    const onO2 = () => trigger('o2');
    const onHull = () => trigger('hull');
    window.addEventListener('O2Depleted', onO2);
    window.addEventListener('ShipDestroyed', onHull);
    return () => {
      window.removeEventListener('O2Depleted', onO2);
      window.removeEventListener('ShipDestroyed', onHull);
    };
  }, []);

  const triggered = cause !== null;
  const config = cause ? CAUSE_CONFIG[cause] : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'black',
        opacity: triggered ? 1 : 0,
        transition: 'opacity 3s ease-in',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        pointerEvents: triggered ? 'auto' : 'none',
        zIndex: 300,
      }}
    >
      {showContent && config && (
        <>
          <div
            style={{
              color: config.titleColor,
              fontSize: 42,
              fontFamily: 'monospace',
              fontWeight: 'bold',
              letterSpacing: '0.08em',
            }}
          >
            {config.title}
          </div>
          <div
            style={{
              color: config.subtitleColor,
              fontSize: 20,
              fontFamily: 'monospace',
              letterSpacing: '0.12em',
            }}
          >
            {config.subtitle}
          </div>
          <button
            type="button"
            className="start-button restart-button"
            style={{ marginTop: 28 }}
            onClick={() => {
              clearAllSaves();
              window.location.reload();
            }}
          >
            Restart
          </button>
        </>
      )}
    </div>
  );
}
