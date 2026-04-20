import { memo, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { thrustMultiplier, MAX_THRUST_MULTIPLIER } from '../../context/ShipState';
import {
  KEY_THRUST_INCREASE,
  KEY_THRUST_INCREASE_NP,
  KEY_THRUST_DECREASE,
  KEY_THRUST_DECREASE_NP,
} from '../../config/keybindings';

interface ThrustPanelProps {
  thrustLevel: number;
  setThrustLevel: Dispatch<SetStateAction<number>>;
}

const THRUST_STEP = 0.5;
const THRUST_MIN = 0.5;

const ThrustPanel = memo(function ThrustPanel({ thrustLevel, setThrustLevel }: ThrustPanelProps) {
  const isDanger = thrustLevel >= 2;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === KEY_THRUST_INCREASE || e.code === KEY_THRUST_INCREASE_NP) {
        setThrustLevel((prev) => {
          const next = Math.min(MAX_THRUST_MULTIPLIER, parseFloat((prev + THRUST_STEP).toFixed(1)));
          thrustMultiplier.current = next;
          return next;
        });
      } else if (e.code === KEY_THRUST_DECREASE || e.code === KEY_THRUST_DECREASE_NP) {
        setThrustLevel((prev) => {
          const next = Math.max(THRUST_MIN, parseFloat((prev - THRUST_STEP).toFixed(1)));
          thrustMultiplier.current = next;
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setThrustLevel]);

  return (
    <div
      className="thrust-panel"
      style={{
        position: 'fixed',
        bottom: 8,
        right: '140px',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        fontFamily: 'monospace',
        fontSize: 12,
        background: 'rgba(0,0,0,0.15)',
        backdropFilter: 'blur(10px)',
        padding: '8px 16px',
        border: `1px solid ${isDanger ? 'rgba(255,40,140,0.25)' : 'rgba(0,200,255,0.23)'}`,
        userSelect: 'none',
      }}
    >
      <div
        className="thrust-label-text"
        style={{
          color: isDanger ? 'rgba(255,40,140,0.85)' : '#00cfff',
          letterSpacing: 1,
          fontWeight: 'bold',
        }}
      >
        THRUST: {thrustLevel.toFixed(1)}x{isDanger ? '  ⚠ DANGER' : ''}
      </div>
      <input
        type="range"
        min={THRUST_MIN}
        max={MAX_THRUST_MULTIPLIER}
        step={THRUST_STEP}
        value={thrustLevel}
        className={isDanger ? 'thrust-slider danger' : 'thrust-slider'}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          setThrustLevel(v);
          thrustMultiplier.current = v;
        }}
      />
      <div
        className="thrust-ticks"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: 200,
          color: '#666',
          fontSize: 10,
        }}
      >
        <span>{THRUST_MIN}×</span>
        <span>{MAX_THRUST_MULTIPLIER}×</span>
      </div>
    </div>
  );
});

export default ThrustPanel;
