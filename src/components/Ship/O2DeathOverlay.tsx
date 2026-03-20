import { useEffect, useState } from 'react';
import { clearAllSaves } from '../../context/SaveStore';

export function O2DeathOverlay() {
  const [triggered, setTriggered] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const onDepleted = () => {
      setTriggered(true);
      setTimeout(() => setShowContent(true), 3500);
    };
    window.addEventListener('O2Depleted', onDepleted);
    return () => window.removeEventListener('O2Depleted', onDepleted);
  }, []);

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
      {showContent && (
        <>
          <div
            style={{
              color: '#aaccff',
              fontSize: 42,
              fontFamily: 'monospace',
              fontWeight: 'bold',
              letterSpacing: '0.08em',
            }}
          >
            OXYGEN DEPLETED
          </div>
          <div
            style={{
              color: '#6688aa',
              fontSize: 20,
              fontFamily: 'monospace',
              letterSpacing: '0.12em',
            }}
          >
            PILOT DECEASED
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
