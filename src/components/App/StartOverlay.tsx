import { memo } from 'react';

interface StartOverlayProps {
  onStart: () => void;
}

const StartOverlay = memo(function StartOverlay({ onStart }: StartOverlayProps) {
  return (
    <div className="start-overlay">
      <div className="start-panel">
        <div className="start-title">Systems Ready</div>
        <div className="start-subtitle">Tap to arm audio and begin.</div>
        <button type="button" className="start-button" onClick={onStart}>
          Start Game
        </button>
      </div>
    </div>
  );
});

export default StartOverlay;
