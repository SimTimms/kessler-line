import { memo, useEffect, useRef, useState } from 'react';
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
    animationDelay:   `${(Math.pow(pseudo(s + 8), 0.4) * 5).toFixed(2)}s`,
  };
});

// Letters start fading at 6s; overlay fade starts at 6s over 3s → done at 9s.
const FADE_START_MS = 6000;
const AUTO_DISMISS_MS = 9500;

const StartOverlay = memo(function StartOverlay({ onStart }: StartOverlayProps) {
  const [fading, setFading] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setFading(true), FADE_START_MS);
    dismissTimer.current = window.setTimeout(onStart, AUTO_DISMISS_MS);
    return () => {
      window.clearTimeout(fadeTimer);
      if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    };
  }, [onStart]);

  return (
    <div className={`start-overlay${fading ? ' fading' : ''}`}>
      <div className="start-panel">
        <div className="start-title">
          {'Kessler'.split('').map((letter, i) => (
            <span key={i} className="kessler-letter" style={{ animationDelay: `${6 + i * 0.35}s` }}>
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
