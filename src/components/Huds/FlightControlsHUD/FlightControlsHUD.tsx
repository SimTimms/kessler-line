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

/* ── Button definitions ─────────────────────────────────────────────────── */

interface BtnDef {
  id: string;
  key: string;
  label: string;
}

const ROW_1: BtnDef[] = [
  { id: 'strafeL', key: 'Q', label: 'Port' },
  { id: 'fwd', key: 'W', label: 'Forward' },
  { id: 'strafeR', key: 'E', label: 'Stbd' },
];

const ROW_2: BtnDef[] = [
  { id: 'yawL', key: 'A', label: 'Left' },
  { id: 'rev', key: 'S', label: 'Reverse' },
  { id: 'yawR', key: 'D', label: 'Right' },
];

const ROW_3: BtnDef[] = [
  { id: 'radOut', key: 'R', label: 'Radial+' },
  { id: 'radIn', key: 'F', label: 'Radial\u2212' },
  { id: 'fire', key: 'G', label: 'Fire' },
];

const ROW_4: BtnDef[] = [
  { id: 'stabilize', key: 'Space', label: 'Stabilize' },
  { id: 'boost', key: '\u2191', label: 'Boost' },
  { id: 'thrustUp', key: '+', label: 'Thrust' },
  { id: 'thrustDown', key: '\u2212', label: 'Thrust' },
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
  const [open, setOpen] = useState(false);
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

      // Directional / stabilizer refs
      const ref = MOBILE_REFS[id];
      if (ref) {
        ref.current = true;
        return;
      }

      // Boost
      if (id === 'boost') {
        beginThrustBoost();
        return;
      }

      // Fire / Thrust ±  → synthetic keydown
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
      <div className="flight-controls-bezel">
        <div
          className={`flight-controls-head${open ? ' flight-controls-head--open' : ''}`}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="flight-controls-lamp" aria-hidden />
          <span className="flight-controls-title">RCS</span>
          <button
            className={`flight-controls-toggle${open ? ' flight-controls-toggle--open' : ''}`}
          >
            <span className="flight-controls-toggle-face">{open ? '\u25B4' : '\u25BE'}</span>
          </button>
        </div>

        {open && (
          <div className="flight-controls-crt">
            <div className="flight-controls-grid">{ROW_1.map(renderBtn)}</div>
            <div className="flight-controls-grid" style={{ marginTop: 4 }}>
              {ROW_2.map(renderBtn)}
            </div>
            <div className="flight-controls-grid" style={{ marginTop: 4 }}>
              {ROW_3.map(renderBtn)}
            </div>
            <div className="flight-controls-row-extra">{ROW_4.map(renderBtn)}</div>
          </div>
        )}
      </div>
    </div>
  );
});

export default FlightControlsHUD;
