import { memo, useCallback, useState } from 'react';
import {
  mobileThrustForward,
  mobileThrustReverse,
  mobileThrustLeft,
  mobileThrustRight,
  mobileThrustStrafeLeft,
  mobileThrustStrafeRight,
  mobileThrustRadialOut,
  mobileThrustRadialIn,
  mobileStabilizerActive,
  thrustBoostHeld,
  thrustBoostStoredMultiplier,
  thrustMultiplier,
} from '../../../context/ShipState';
import { THRUST_BOOST_MULTIPLIER } from '../../../config/shipConfig';
import { getActiveThrustMultiplierCap } from '../../../context/FastTravelZones';
import './FlightControlsHUD.css';

/* ── Button definitions (2-column layout) ─────────────────────────────── */

interface BtnDef {
  id: string;
  key: string;
  label: string;
}

const BUTTONS: BtnDef[] = [
  { id: 'strafeL', key: 'Q', label: 'Port' },
  { id: 'fwd', key: 'W', label: 'Fwd' },
  { id: 'yawL', key: 'A', label: 'Left' },
  { id: 'rev', key: 'S', label: 'Rev' },
  { id: 'strafeR', key: 'E', label: 'Stbd' },
  { id: 'yawR', key: 'D', label: 'Right' },
  { id: 'radOut', key: 'R', label: 'Rad+' },
  { id: 'radIn', key: 'F', label: 'Rad\u2212' },
  { id: 'fire', key: 'G', label: 'Fire' },
  { id: 'stabilize', key: 'Space', label: 'Stab' },
  { id: 'boost', key: '\u2191', label: 'Boost' },
  { id: 'thrustUp', key: '+', label: 'Thr' },
  { id: 'thrustDown', key: '\u2212', label: 'Thr' },
];

/* ── Ref setters for directional thrusters ──────────────────────────────── */

const MOBILE_REFS: Record<string, { current: boolean }> = {
  fwd: mobileThrustForward,
  rev: mobileThrustReverse,
  yawL: mobileThrustLeft,
  yawR: mobileThrustRight,
  strafeL: mobileThrustStrafeLeft,
  strafeR: mobileThrustStrafeRight,
  radOut: mobileThrustRadialOut,
  radIn: mobileThrustRadialIn,
  stabilize: mobileStabilizerActive,
};

/* ── Synthetic keyboard helpers ─────────────────────────────────────────── */

function dispatchKey(code: string, key: string, type: 'keydown' | 'keyup') {
  window.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true }));
}

/* ── Boost helpers (mirrors inputListeners.ts logic) ────────────────────── */

function beginThrustBoost() {
  if (thrustBoostHeld.current) return;
  thrustBoostHeld.current = true;
  thrustBoostStoredMultiplier.current = thrustMultiplier.current;
  const zoneCap = getActiveThrustMultiplierCap();
  const boostTarget =
    zoneCap == null ? THRUST_BOOST_MULTIPLIER : Math.min(THRUST_BOOST_MULTIPLIER, zoneCap);
  thrustMultiplier.current = boostTarget;
}

function endThrustBoost() {
  if (!thrustBoostHeld.current) return;
  thrustBoostHeld.current = false;
  const zoneCap = getActiveThrustMultiplierCap();
  const restored = thrustBoostStoredMultiplier.current;
  thrustMultiplier.current = zoneCap == null ? restored : Math.min(restored, zoneCap);
}

/* ── Component ──────────────────────────────────────────────────────────── */

const FlightControlsHUD = memo(function FlightControlsHUD() {
  const [pressed, setPressed] = useState<Set<string>>(() => new Set());

  const markPressed = useCallback((id: string) => {
    setPressed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const markReleased = useCallback((id: string) => {
    setPressed((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleDown = useCallback(
    (id: string) => {
      markPressed(id);

      const ref = MOBILE_REFS[id];
      if (ref) {
        ref.current = true;
        return;
      }

      if (id === 'boost') {
        beginThrustBoost();
        return;
      }

      if (id === 'fire') {
        dispatchKey('KeyG', 'g', 'keydown');
        return;
      }
      if (id === 'thrustUp') {
        dispatchKey('Equal', '=', 'keydown');
        return;
      }
      if (id === 'thrustDown') {
        dispatchKey('Minus', '-', 'keydown');
        return;
      }
    },
    [markPressed],
  );

  const handleUp = useCallback(
    (id: string) => {
      markReleased(id);

      const ref = MOBILE_REFS[id];
      if (ref) {
        ref.current = false;
        return;
      }

      if (id === 'boost') {
        endThrustBoost();
        return;
      }

      if (id === 'fire') {
        dispatchKey('KeyG', 'g', 'keyup');
        return;
      }
      if (id === 'thrustUp') {
        dispatchKey('Equal', '=', 'keyup');
        return;
      }
      if (id === 'thrustDown') {
        dispatchKey('Minus', '-', 'keyup');
        return;
      }
    },
    [markReleased],
  );

  const renderBtn = (def: BtnDef) => (
    <button
      key={def.id}
      className={`flight-btn${pressed.has(def.id) ? ' flight-btn--active' : ''}`}
      onPointerDown={(e) => {
        e.preventDefault();
        handleDown(def.id);
      }}
      onPointerUp={() => handleUp(def.id)}
      onPointerLeave={() => {
        if (pressed.has(def.id)) handleUp(def.id);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="flight-btn-key">{def.key}</span>
      <span className="flight-btn-label">{def.label}</span>
    </button>
  );

  return (
    <div className="flight-controls-hud" aria-label="Flight Controls">
      <div className="flight-controls-grid">{BUTTONS.map(renderBtn)}</div>
    </div>
  );
});

export default FlightControlsHUD;
