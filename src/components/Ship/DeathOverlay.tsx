import { useEffect, useRef, useState } from 'react';
import { clearAllSaves } from '../../context/SaveStore';

export type DeathCause = 'o2' | 'hull' | 'radiation' | 'speed';

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
  radiation: {
    title: 'RADIATION OVERLOAD',
    subtitle: 'HULL INTEGRITY LOST',
    titleColor: '#88ff44',
    subtitleColor: '#5a9e3a',
  },
  speed: {
    title: 'SHIP DESTROYED',
    subtitle: 'STRUCTURAL FAILURE',
    titleColor: '#707580',
    subtitleColor: '#3d4657',
  },
};

interface DeathOverlayProps {
  /** When set, Restart runs this instead of clearing saves and reloading the page. */
  onRestart?: () => void;
  restartLabel?: string;
}

export function DeathOverlay({ onRestart, restartLabel = 'Restart' }: DeathOverlayProps) {
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
    const onHull = (e: Event) => {
      const detail = (e as CustomEvent<{ cause?: DeathCause }>).detail;
      if (detail?.cause === 'radiation') trigger('radiation');
      else if (detail?.cause === 'speed') trigger('speed');
      else trigger('hull');
    };
    window.addEventListener('O2Depleted', onO2);
    window.addEventListener('ShipDestroyed', onHull);
    return () => {
      window.removeEventListener('O2Depleted', onO2);
      window.removeEventListener('ShipDestroyed', onHull);
    };
  }, []);

  const triggered = cause !== null;
  const config = cause ? CAUSE_CONFIG[cause] : null;

  const handleRestart = () => {
    if (onRestart) {
      onRestart();
      return;
    }
    clearAllSaves();
    window.location.reload();
  };

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
            onClick={handleRestart}
          >
            {restartLabel}
          </button>
        </>
      )}
    </div>
  );
}
