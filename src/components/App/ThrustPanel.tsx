import { memo, useEffect, useState } from 'react';
import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import {
  thrustMultiplier,
  thrustBoostHeld,
  thrustBoostStoredMultiplier,
  MAX_THRUST_MULTIPLIER,
} from '../../context/ShipState';
import { THRUST_BOOST_MULTIPLIER } from '../../config/shipConfig';
import { getActiveThrustMultiplierCap } from '../../context/FastTravelZones';
import { NORMAL_TRAVEL_THRUST_MULTIPLIER } from '../../config/fastTravelConfig';
import {
  KEY_THRUST_INCREASE,
  KEY_THRUST_INCREASE_NP,
  KEY_THRUST_DECREASE,
  KEY_THRUST_DECREASE_NP,
} from '../../config/keybindings';

interface ThrustPanelProps {
  thrustLevel?: number;
  setThrustLevel?: Dispatch<SetStateAction<number>>;
  /** Renders inside helmet controls column (no fixed screen position). */
  embedded?: boolean;
}

const THRUST_STEP = 0.5;
const THRUST_MIN = 0.5;

function getThrustDialMax(): number {
  return MAX_THRUST_MULTIPLIER;
}

function getThrustSelectableMax(): number {
  const zoneCap = getActiveThrustMultiplierCap();
  if (zoneCap == null) return MAX_THRUST_MULTIPLIER;
  return Math.min(zoneCap, MAX_THRUST_MULTIPLIER);
}

/** Keep HUD dial + restore value in sync; physics stays at boost while ArrowUp is held. */
function syncPhysicsMultiplier(dial: number) {
  const cappedDial = Math.min(dial, getThrustSelectableMax());
  thrustBoostStoredMultiplier.current = cappedDial;
  const boosted = thrustBoostHeld.current ? THRUST_BOOST_MULTIPLIER : cappedDial;
  thrustMultiplier.current = Math.min(boosted, getThrustSelectableMax());
}

const ThrustPanel = memo(function ThrustPanel({
  thrustLevel: thrustLevelProp,
  setThrustLevel: setThrustLevelProp,
  embedded = false,
}: ThrustPanelProps) {
  const [internalLevel, setInternalLevel] = useState(() => thrustMultiplier.current);
  const dialMax = getThrustDialMax();
  const selectableMax = getThrustSelectableMax();
  const thrustCapUnlocked = selectableMax > NORMAL_TRAVEL_THRUST_MULTIPLIER;
  const thrustLevel = thrustLevelProp ?? internalLevel;
  const setThrustLevel = setThrustLevelProp ?? setInternalLevel;
  const isDanger = thrustLevel >= 2;

  // Keep level in sync with zone selection cap while dial visual max stays fixed.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const nextMax = getThrustSelectableMax();
      setThrustLevel((prev) => {
        if (prev <= nextMax) return prev;
        syncPhysicsMultiplier(nextMax);
        return nextMax;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [setThrustLevel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === KEY_THRUST_INCREASE || e.code === KEY_THRUST_INCREASE_NP) {
        setThrustLevel((prev) => {
          const next = Math.min(
            getThrustSelectableMax(),
            parseFloat((prev + THRUST_STEP).toFixed(1))
          );
          syncPhysicsMultiplier(next);
          return next;
        });
      } else if (e.code === KEY_THRUST_DECREASE || e.code === KEY_THRUST_DECREASE_NP) {
        setThrustLevel((prev) => {
          const next = Math.max(THRUST_MIN, parseFloat((prev - THRUST_STEP).toFixed(1)));
          syncPhysicsMultiplier(next);
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setThrustLevel]);

  const panelStyle = embedded
    ? undefined
    : {
        position: 'fixed' as const,
        bottom: 8,
        right: '140px',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: 5,
        fontFamily: 'monospace',
        fontSize: 12,
        background: 'rgba(0,0,0,0.15)',
        backdropFilter: 'blur(10px)',
        padding: '8px 16px',
        border: `1px solid ${isDanger ? 'rgba(255,40,140,0.25)' : 'rgba(0,200,255,0.23)'}`,
        userSelect: 'none' as const,
      };

  const sliderClassName = `thrust-slider${isDanger ? ' danger' : ''}${thrustCapUnlocked ? ' unlocked' : ''}${embedded ? ' thrust-slider--vertical' : ''}`;
  const displayLevel = Math.min(thrustLevel, dialMax);

  const onSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = Math.min(getThrustSelectableMax(), parseFloat(e.target.value));
    setThrustLevel(v);
    syncPhysicsMultiplier(v);
  };

  if (embedded) {
    return (
      <div className="thrust-panel thrust-panel--embedded" aria-label="Thrust multiplier">
        <div className="thrust-slider-column">
          <span className="thrust-tick thrust-tick--max">{dialMax}×</span>
          <div className="thrust-slider-wrap">
            <input
              type="range"
              min={THRUST_MIN}
              max={dialMax}
              step={THRUST_STEP}
              value={displayLevel}
              className={sliderClassName}
              onChange={onSliderChange}
            />
          </div>
          <span className="thrust-tick thrust-tick--min">{THRUST_MIN}×</span>
        </div>
        <div className={`thrust-label-text${isDanger ? ' thrust-label-text--danger' : ''}`}>
          {displayLevel.toFixed(1)}
        </div>
      </div>
    );
  }

  return (
    <div className="thrust-panel" style={panelStyle}>
      <div
        className="thrust-label-text"
        style={{
          color: isDanger ? 'rgba(255,40,140,0.85)' : '#00cfff',
          letterSpacing: 1,
          fontWeight: 'bold',
        }}
      >
        THRUST: {displayLevel.toFixed(1)}x{isDanger ? '  ⚠ DANGER' : ''}
      </div>
      <input
        type="range"
        min={THRUST_MIN}
        max={dialMax}
        step={THRUST_STEP}
        value={displayLevel}
        className={sliderClassName}
        onChange={onSliderChange}
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
        <span>
          {dialMax}× {thrustCapUnlocked ? 'FAST CAP UNLOCKED' : 'SLOW CAP 3×'}
        </span>
      </div>
    </div>
  );
});

export default ThrustPanel;
