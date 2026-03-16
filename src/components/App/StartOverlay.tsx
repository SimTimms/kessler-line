import { memo } from 'react';
import { clearAllSaves } from '../../context/SaveStore';

interface StartOverlayProps {
  onStart: () => void;
}

// Deterministic pseudo-random (sin-hash) so the field is stable across renders.
const pseudo = (n: number) => ((Math.sin(n) * 43758.5453123) % 1 + 1) % 1;

// Delays skewed heavily toward the end: x^0.3 pushes pseudo-random values near 1,
// so most asteroids appear late — sparse at first, dense as the animation progresses.
const ASTEROID_DATA = Array.from({ length: 500 }, (_, i) => {
  const s = i * 17.3;
  const w = Math.round(3 + pseudo(s) * 16);          // 3–19 px wide
  const h = Math.round(w * (0.35 + pseudo(s + 1) * 0.55));
  // Extreme asymmetric border-radius for jagged silhouettes
  const a = Math.round(8  + pseudo(s + 2) * 72);
  const b = Math.round(8  + pseudo(s + 3) * 72);
  const c = Math.round(8  + pseudo(s + 4) * 72);
  const d = Math.round(8  + pseudo(s + 5) * 72);
  return {
    width:            `${w}px`,
    height:           `${h}px`,
    borderRadius:     `${a}% ${100 - a}% ${b}% ${100 - b}% / ${c}% ${d}% ${100 - d}% ${100 - c}%`,
    top:              `${(pseudo(s + 6) * 96).toFixed(1)}%`,
    animationDuration:`${(2.5 + pseudo(s + 7) * 9).toFixed(2)}s`,
    animationDelay:   `${(1   + Math.pow(pseudo(s + 8), 0.3) * 19).toFixed(2)}s`,
  };
});

const StartOverlay = memo(function StartOverlay({ onStart }: StartOverlayProps) {
  return (
    <div className="start-overlay">
      <div className="start-panel">
        <div className="start-title">
          {'Kessler'.split('').map((letter, i) => (
            <span key={i} className="kessler-letter" style={{ animationDelay: `${11 + i * 0.35}s` }}>
              {letter}
            </span>
          ))}
        </div>
        <button type="button" className="start-button" onClick={onStart}>
          Start Game
        </button>
        <button type="button" className="start-button restart-button" onClick={() => { clearAllSaves(); window.location.reload(); }}>
          Restart
        </button>
      </div>
      <div className="start-asteroids" aria-hidden="true">
        {ASTEROID_DATA.map((style, i) => (
          <div key={i} className="start-asteroid" style={style} />
        ))}
      </div>
    </div>
  );
});

export default StartOverlay;
