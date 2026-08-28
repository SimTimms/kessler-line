import { useEffect, useRef, useState } from 'react';
import { clearAllSaves } from '../../context/SaveStore';
import { respawnAsNewShip } from '../../context/respawnAsNewShip';

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
  /** Show a "Take Over Ship" respawn button alongside the restart button. */
  respawnEnabled?: boolean;
}

export function DeathOverlay({
  onRestart,
  restartLabel = 'Restart',
  respawnEnabled = false,
}: DeathOverlayProps) {
  const triggeredRef = useRef(false);
  const [cause, setCause] = useState<DeathCause | null>(null);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // When respawn is enabled, DerelictField (inside the Canvas) owns death handling.
    // Do not capture/respawn from this DOM tree — that freezes the WebGL root.
    if (respawnEnabled) return;

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
  }, [respawnEnabled]);

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

  const handleRespawn = () => {
    if (!cause) return;
    // Defer so module-level ref resets don't run inside a DOM click handler.
    queueMicrotask(() => {
      respawnAsNewShip(cause);
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'black',
        opacity: triggered ? 1 : 0,
        transition: triggered ? 'opacity 3s ease-in' : 'opacity 0.5s ease-out',
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
          {respawnEnabled && (
            <button
              type="button"
              className="start-button restart-button"
              style={{ marginTop: 28 }}
              onClick={handleRespawn}
            >
              Take Over Ship
            </button>
          )}
          <button
            type="button"
            className="start-button restart-button"
            style={{ marginTop: respawnEnabled ? 8 : 28 }}
            onClick={handleRestart}
          >
            {restartLabel}
          </button>
        </>
      )}
    </div>
  );
}
