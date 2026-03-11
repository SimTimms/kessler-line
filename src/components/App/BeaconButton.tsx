import { memo } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

interface BeaconButtonProps {
  activeAudioRef: MutableRefObject<HTMLAudioElement | null>;
  listeningToMessage: boolean;
  setListeningToMessage: Dispatch<SetStateAction<boolean>>;
}

const BeaconButton = memo(function BeaconButton({
  activeAudioRef,
  listeningToMessage,
  setListeningToMessage,
}: BeaconButtonProps) {
  return (
    <button
      className="listen-btn"
      onClick={() => {
        setListeningToMessage((v) => {
          const next = !v;
          if (next) {
            activeAudioRef.current?.play();
          } else {
            activeAudioRef.current?.pause();
            if (activeAudioRef.current) activeAudioRef.current.currentTime = 0;
          }
          return next;
        });
      }}
      style={{
        position: 'fixed',
        bottom: 16,
        left: 160,
        fontFamily: 'monospace',
        fontSize: 14,
        padding: '6px 14px',
        background: listeningToMessage ? 'rgba(0,255,136,0.2)' : 'rgba(0,255,136,0.07)',
        color: '#00ff88',
        border: '1px solid rgba(0,255,136,0.7)',
        borderRadius: 4,
        cursor: 'pointer',
        userSelect: 'none',
        animation: listeningToMessage ? 'none' : 'beaconPulse 1.4s ease-in-out infinite',
      }}
    >
      {listeningToMessage ? 'RECEIVING...' : 'LISTEN TO MESSAGE'}
    </button>
  );
});

export default BeaconButton;
