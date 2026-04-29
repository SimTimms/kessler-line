import { memo, useCallback, useRef, useState } from 'react';
import { clearAllSaves } from '../../context/SaveStore';

interface StartOverlayProps {
  onStart: () => void;
  onTutorial: () => void;
}

// Deterministic pseudo-random (sin-hash) so the field is stable across renders.
const pseudo = (n: number) => (((Math.sin(n) * 43758.5453123) % 1) + 1) % 1;

// Delays skewed heavily toward the end: x^0.3 pushes pseudo-random values near 1,
// so most asteroids appear late — sparse at first, dense as the animation progresses.
const ASTEROID_DATA = Array.from({ length: 500 }, (_, i) => {
  const s = i * 17.3;
  const w = Math.round(3 + pseudo(s) * 16); // 3–19 px wide
  const h = Math.round(w * (0.35 + pseudo(s + 1) * 0.55));
  // Extreme asymmetric border-radius for jagged silhouettes
  const a = Math.round(8 + pseudo(s + 2) * 72);
  const b = Math.round(8 + pseudo(s + 3) * 72);
  const c = Math.round(8 + pseudo(s + 4) * 72);
  const d = Math.round(8 + pseudo(s + 5) * 72);
  return {
    width: `${w}px`,
    height: `${h}px`,
    borderRadius: `${a}% ${100 - a}% ${b}% ${100 - b}% / ${c}% ${d}% ${100 - d}% ${100 - c}%`,
    top: `${(pseudo(s + 6) * 96).toFixed(1)}%`,
    animationDuration: `${(2.5 + pseudo(s + 7) * 9).toFixed(2)}s`,
    animationDelay: `${(Math.pow(pseudo(s + 8), 0.4) * 5).toFixed(2)}s`,
  };
});

// Total dismiss animation: last letter fades at 0.48s + 0.7s = 1.18s,
// overlay fades at 0.9s delay + 0.5s = 1.4s. Navigate after 1.5s.
const DISMISS_DELAY_MS = 1500;

const StartOverlay = memo(function StartOverlay({ onStart, onTutorial }: StartOverlayProps) {
  const [dismissing, setDismissing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback((action: () => void) => {
    if (timerRef.current) return; // already dismissing
    setDismissing(true);
    timerRef.current = window.setTimeout(action, DISMISS_DELAY_MS);
  }, []);

  return (
    <div className={`start-overlay${dismissing ? ' dismissing' : ''}`}>
      <div className="start-panel">
        <div className="start-title">
          {'Kessler'.split('').map((letter, i) => (
            <span key={i} className="kessler-letter">
              {letter}
            </span>
          ))}
        </div>
        <button type="button" className="start-button" onClick={() => dismiss(onStart)}>
          Start Game
        </button>
        <button
          type="button"
          className="start-button"
          onClick={() => dismiss(onTutorial)}
          style={{ opacity: 0.75 }}
        >
          Tutorial
        </button>
        <button
          type="button"
          className="start-button restart-button"
          onClick={() => dismiss(() => { clearAllSaves(); window.location.reload(); })}
        >
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
