import { NAV_TARGET_DEFS } from '../../../config/worldConfig';
import { shipPosRef } from '../../../context/ShipPos';
import { getShipSpeedMps, orbitStatusRef, shipVelocity } from '../../../context/ShipState';
import { gravityBodies } from '../../../context/GravityRegistry';
import { navTargetIdRef, navTargetPosRef } from '../../../context/NavTarget';
import {
  selectedTargetKey,
  selectedTargetName,
  selectedTargetPosition,
  selectedTargetVelocity,
  targetFlashUntil,
} from '../../../context/TargetSelection';
import { getClosingSpeed } from '../../../utils/relativeVelocity';
import { autopilotActive, autopilotMode, autopilotStatus } from '../../../context/AutopilotState';
import { velocityLevel } from '../PowerHUD/PowerHUDHelpers';
import { computeOrbitHudMetrics, orbitBodyLabel } from './orbitHudMetrics';
import * as THREE from 'three';

const ORBIT_LABELS = new Map(NAV_TARGET_DEFS.map((p) => [p.id, p.label]));

/** Scratch vector for ship→target direction. */
const _toTargetDir = new THREE.Vector3();
/** Zero velocity fallback for nav-only targets. */
const _zeroVel = new THREE.Vector3();

export interface HudDisplayRefs {
  coords: { current: HTMLSpanElement | null };
  orbit: { current: HTMLSpanElement | null };
  alt: { current: HTMLSpanElement | null };
  periapsis: { current: HTMLSpanElement | null };
  apoapsis: { current: HTMLSpanElement | null };
  apsesTarget: { current: HTMLSpanElement | null };
  approach: { current: HTMLSpanElement | null };
  relativeVel: { current: HTMLSpanElement | null };
  autopilotBtn: { current: HTMLSpanElement | null };
  orbitLine: { current: HTMLSpanElement | null };
  speed: { current: HTMLSpanElement | null };
}

/**
 * Per-frame DOM ref updates for all HUD readouts.
 *
 * Writes directly to DOM elements via refs to avoid React re-renders.
 * Called every animation frame from the NavHUD rAF loop.
 */
export function updateHudDisplayRefs(
  refs: HudDisplayRefs,
  layout: 'classic' | 'helmet',
  focusElements: string[]
): void {
  // Coords
  if (refs.coords.current) {
    const { x, z } = shipPosRef.current;
    refs.coords.current.textContent = `${Math.round(x)}, ${Math.round(z)}`;
  }

  const orbitMetrics = computeOrbitHudMetrics();

  // Orbit body label
  if (refs.orbit.current) {
    const { bodyId } = orbitStatusRef.current;
    const label = bodyId ? (ORBIT_LABELS.get(bodyId) ?? orbitBodyLabel(bodyId)) : '\u2014';
    refs.orbit.current.textContent = label;
  }

  // Altitude
  if (refs.alt.current) {
    refs.alt.current.textContent = orbitMetrics.alt;
  }

  // Periapsis / Apoapsis
  if (refs.periapsis.current) {
    refs.periapsis.current.textContent = orbitMetrics.peri;
  }
  if (refs.apoapsis.current) {
    refs.apoapsis.current.textContent = orbitMetrics.apo;
  }

  // Apsis target (ideal orbit altitude)
  if (refs.apsesTarget.current) {
    const { bodyId } = orbitStatusRef.current;
    if (bodyId) {
      const idealAlt = gravityBodies.get(bodyId)?.orbitAltitude;
      refs.apsesTarget.current.textContent =
        idealAlt != null ? `[${Math.round(idealAlt)}]` : '\u2014';
    } else {
      refs.apsesTarget.current.textContent = '\u2014';
    }
  }

  // Approach (distance to next apsis)
  if (refs.approach.current) {
    updateApproachRef(refs.approach.current);
  }

  // Relative velocity
  if (refs.relativeVel.current) {
    updateRelativeVelocity(refs.relativeVel.current);
  }

  // Autopilot button
  if (refs.autopilotBtn.current) {
    updateAutopilotButton(refs.autopilotBtn.current);
  }

  // Helmet-only: speed readout
  if (layout === 'helmet' && refs.speed.current) {
    const speedMps = getShipSpeedMps();
    refs.speed.current.textContent = ``;
    const level = velocityLevel(speedMps);
    refs.speed.current.className = `helmet-nav-speed hud-value${level === 'red' ? ' helmet-nav-speed--crit' : level === 'orange' ? ' helmet-nav-speed--warn' : ''}${focusElements.includes('velocity') ? ' helmet-nav-speed--highlight' : ''}`;
  }

  // Helmet-only: compact orbit line
  if (layout === 'helmet' && refs.orbitLine.current) {
    const { bodyId, isOrbiting } = orbitStatusRef.current;
    if (!bodyId) {
      refs.orbitLine.current.textContent = '';
      refs.orbitLine.current.style.display = 'none';
    } else {
      const label = ORBIT_LABELS.get(bodyId) ?? orbitBodyLabel(bodyId);
      const { alt, peri, apo } = orbitMetrics;
      const prefix = isOrbiting === true ? 'ORB' : 'SOI';
      refs.orbitLine.current.textContent = `${prefix} ${label} \u00b7 ALT ${alt} \u00b7 PE ${peri} \u00b7 AP ${apo}`;
      refs.orbitLine.current.style.display = '';
    }
  }
}

// ── Internal helpers ──────────────────────────────────────────────────

function updateApproachRef(el: HTMLSpanElement): void {
  const { bodyId, periapsis, apoapsis, surfaceRadius, radialVelocity, hyperbolicPeriapsis } =
    orbitStatusRef.current;
  const effectivePeri = periapsis > 0 ? periapsis : hyperbolicPeriapsis;

  if (bodyId && effectivePeri > 0) {
    const body = gravityBodies.get(bodyId);
    if (body) {
      const dx = shipPosRef.current.x - body.position.x;
      const dy = shipPosRef.current.y - body.position.y;
      const dz = shipPosRef.current.z - body.position.z;
      const currentAlt = Math.max(0, Math.sqrt(dx * dx + dy * dy + dz * dz) - surfaceRadius);
      if (radialVelocity >= 0 && apoapsis > 0) {
        const apoAlt = Math.max(0, apoapsis - surfaceRadius);
        el.textContent = `APO +${Math.round(apoAlt - currentAlt)}`;
      } else {
        const periAlt = Math.max(0, effectivePeri - surfaceRadius);
        el.textContent = `PERI -${Math.round(currentAlt - periAlt)}`;
      }
      return;
    }
  }
  el.textContent = '\u2014';
}

function updateRelativeVelocity(relVelEl: HTMLSpanElement): void {
  const hasSelected = selectedTargetName !== null && selectedTargetPosition.lengthSq() > 0.01;
  const hasNavId = navTargetIdRef.current.trim().length > 0;

  if (!hasSelected && !hasNavId) {
    relVelEl.textContent = '\u2014';
    relVelEl.className = 'hud-value nav-relative-velocity';
    return;
  }

  const targetPos = hasSelected ? selectedTargetPosition : navTargetPosRef.current;
  const baseId = hasSelected
    ? (selectedTargetKey ?? 'nav-hud-selected')
    : navTargetIdRef.current;

  // Compute ship→target vector and distance
  _toTargetDir.subVectors(targetPos, shipPosRef.current);
  const dist = _toTargetDir.length();

  // Use selectedTargetVelocity (kept in sync by TargetIndicatorLine each frame)
  // for selected targets; zero for nav-only targets with no live velocity.
  const targetVel = hasSelected ? selectedTargetVelocity : _zeroVel;

  const relVel = getClosingSpeed(`navhud:${baseId}`, shipVelocity, targetVel, _toTargetDir, dist);
  relVelEl.textContent = `${relVel >= 0 ? '+' : ''}${relVel.toFixed(1)} m/s`;

  const flash = Date.now() < targetFlashUntil;
  relVelEl.className = `hud-value nav-relative-velocity${flash ? ' nav-relative-velocity--flash' : ''}`;
}

function updateAutopilotButton(el: HTMLSpanElement): void {
  const active = autopilotActive.current && autopilotMode.current === 'approach';
  const helmetAp = el.closest('.helmet-nav');

  el.textContent = active
    ? helmetAp
      ? 'ON'
      : autopilotStatus.current
    : helmetAp
      ? 'OFF'
      : 'DISENGAGED';

  const btn = el.parentElement;
  if (btn instanceof HTMLButtonElement) {
    if (helmetAp) {
      btn.classList.toggle('helmet-nav-btn--active', active);
    } else {
      btn.className = `autopilot-btn ${active ? ' autopilot-active' : ''}`;
    }
  }
}
