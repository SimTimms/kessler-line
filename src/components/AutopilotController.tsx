import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  autopilotActive,
  autopilotPhase,
  autopilotStatus,
  autopilotThrustForward,
  autopilotThrustReverse,
  autopilotYawLeft,
  autopilotYawRight,
  autopilotRadialOut,
  autopilotRadialIn,
} from '../context/AutopilotState';
import { navTargetPosRef, navTargetIdRef } from '../context/NavTarget';
import { shipPosRef } from '../context/ShipPos';
import {
  shipVelocity,
  shipQuaternion,
  shipAngularVelocity,
  thrustMultiplier,
  orbitStatusRef,
} from '../context/ShipState';
import { gravityBodies } from '../context/GravityRegistry';
import { getMagneticTargets } from '../context/MagneticRegistry';

import { clearThrusts } from '../autopilot/clearThrusts';
import { autopilotThrust } from '../autopilot/autopilotThrust';
import { Approach } from '../autopilot/Approach';
import { CoastToPeriapsis } from '../autopilot/CoastToPeriapsis';
import { HyperbolicApproach, resetHyperbolicApproach } from '../autopilot/HyperbolicApproach';
import { HyperbolicCapture } from '../autopilot/HyperbolicCapture';
import { OrbitInsertion } from '../autopilot/OrbitInsertion';
import { computeYaw } from '../autopilot/computeYaw';
import { apLogReset, apLogPhaseChange, apLogStatus, apLogThrust } from '../autopilot/log';
import {
  ALIGN_ANGLE_THRESHOLD,
  ALIGN_ANG_VEL_THRESHOLD,
  PLANET_RETRO_ARRIVAL_SPEED,
  STATION_ARRIVAL_RADIUS,
} from '../autopilot/constants';
import type { AutopilotCtx } from '../autopilot/types';
import { selectedTargetName, selectedTargetPosition, selectedTargetVelocity } from '../context/TargetSelection';
import { fuelStationWorldVel } from '../context/SolarSystemMinimap';

// Saved player thrust level — restored when autopilot disengages
const _savedThrust = { current: 1 };
const _autopilotWasActive = { current: false };
const _lastStatusLogged = { current: '' };

// Scratch vectors — reused every frame to avoid allocations
const _noseDir = new THREE.Vector3();
const _toTarget = new THREE.Vector3();
const _velFlat = new THREE.Vector3();
const _predictedTargetPos = new THREE.Vector3();
const ALIGN_ACCEPT_ANGLE = (10 * Math.PI) / 180; // 10 degrees
const ALIGN_STOP_ANG_VEL = 0.03; // rad/s
const ALIGN_BURST_ON_MS = 140;
const ALIGN_BURST_OFF_MS = 280;
const ALIGN_BRAKE_BURST_ON_MS = 100;
const ALIGN_BRAKE_BURST_OFF_MS = 220;

const _alignYawPulse = {
  activeDir: 0 as -1 | 0 | 1, // -1 = yawLeft, +1 = yawRight
  burstEndsAtMs: 0,
  cooldownEndsAtMs: 0,
};

function resetAlignYawPulse() {
  _alignYawPulse.activeDir = 0;
  _alignYawPulse.burstEndsAtMs = 0;
  _alignYawPulse.cooldownEndsAtMs = 0;
}

function applyAlignYawBurst(dir: -1 | 0 | 1, braking: boolean): -1 | 0 | 1 {
  const now = performance.now();
  const onMs = braking ? ALIGN_BRAKE_BURST_ON_MS : ALIGN_BURST_ON_MS;
  const offMs = braking ? ALIGN_BRAKE_BURST_OFF_MS : ALIGN_BURST_OFF_MS;

  if (dir === 0) {
    if (_alignYawPulse.activeDir !== 0 && now < _alignYawPulse.burstEndsAtMs) {
      return _alignYawPulse.activeDir;
    }
    _alignYawPulse.activeDir = 0;
    return 0;
  }

  if (_alignYawPulse.activeDir !== 0) {
    if (now < _alignYawPulse.burstEndsAtMs) return _alignYawPulse.activeDir;
    _alignYawPulse.activeDir = 0;
    _alignYawPulse.cooldownEndsAtMs = now + offMs;
    return 0;
  }

  const brakingOppositeSpin =
    (dir === -1 && shipAngularVelocity.current > ALIGN_STOP_ANG_VEL) ||
    (dir === 1 && shipAngularVelocity.current < -ALIGN_STOP_ANG_VEL);
  if (!brakingOppositeSpin && now < _alignYawPulse.cooldownEndsAtMs) return 0;

  _alignYawPulse.activeDir = dir;
  _alignYawPulse.burstEndsAtMs = now + onMs;
  return dir;
}

export default function AutopilotController() {
  useFrame(() => {
    // ── Guard: autopilot inactive ─────────────────────────────────────────────
    if (!autopilotActive.current) {
      if (_autopilotWasActive.current) {
        thrustMultiplier.current = _savedThrust.current;
        window.dispatchEvent(
          new CustomEvent('ThrustChanged', { detail: { value: _savedThrust.current } })
        );
        _autopilotWasActive.current = false;
        _lastStatusLogged.current = '';
      }
      clearThrusts(
        autopilotThrustForward,
        autopilotThrustReverse,
        autopilotYawLeft,
        autopilotYawRight,
        autopilotRadialOut,
        autopilotRadialIn
      );
      return;
    }

    // Save player thrust and reset logger on first active frame
    if (!_autopilotWasActive.current) {
      _savedThrust.current = thrustMultiplier.current;
      _autopilotWasActive.current = true;
      apLogReset();
      resetHyperbolicApproach();
      resetAlignYawPulse();
      _lastStatusLogged.current = '';
    }

    // Selected scan/metal targets are controlled by simpleAutopilot (shipPhysics path).
    // Avoid competing writes from this legacy phase-based controller.
    const selectedTargetActive =
      selectedTargetName !== null && selectedTargetPosition.lengthSq() > 0.01;
    if (selectedTargetActive) {
      resetAlignYawPulse();
      return;
    }

    clearThrusts(
      autopilotThrustForward,
      autopilotThrustReverse,
      autopilotYawLeft,
      autopilotYawRight,
      autopilotRadialOut,
      autopilotRadialIn
    );

    // ── Per-frame shared state ────────────────────────────────────────────────
    const shipPos = shipPosRef.current;

    const targetId = navTargetIdRef.current;
    const gravBody =
      gravityBodies.get(targetId) ??
      gravityBodies.get(targetId.charAt(0).toUpperCase() + targetId.slice(1));

    // Planets: track live body position. Magnetic / scan contacts: track registry each frame.
    if (gravBody) {
      navTargetPosRef.current.copy(gravBody.position);
    } else if (targetId) {
      const magnetic = getMagneticTargets().find((t) => t.id === targetId);
      if (magnetic) {
        magnetic.getPosition(navTargetPosRef.current);
        if (magnetic.getVelocity) {
          magnetic.getVelocity(selectedTargetVelocity);
        }
      }
    }

    const targetPos = navTargetPosRef.current;

    // Velocity computed first — needed for predictive intercept below
    _velFlat.set(shipVelocity.x, 0, shipVelocity.z);
    const speed = _velFlat.length();

    // For non-gravity targets that are moving, aim at predicted intercept position:
    // predict where the target will be when the ship arrives rather than where it is now.
    // Use the live per-frame velocity for the fuel station; fall back to selectedTargetVelocity
    // (set once at selection time) for other targets.
    let effectiveTargetPos = targetPos;
    if (!gravBody) {
      const isFuelStation = targetId === 'fuel-station';
      const tvx = isFuelStation ? fuelStationWorldVel.x : selectedTargetVelocity.x;
      const tvz = isFuelStation ? fuelStationWorldVel.z : selectedTargetVelocity.z;
      if (tvx * tvx + tvz * tvz > 0.01) {
        const roughDist = Math.sqrt(
          (targetPos.x - shipPos.x) ** 2 + (targetPos.z - shipPos.z) ** 2
        );
        const toa = speed > 0.1 ? roughDist / speed : 0;
        _predictedTargetPos.set(targetPos.x + tvx * toa, targetPos.y, targetPos.z + tvz * toa);
        effectiveTargetPos = _predictedTargetPos;
      }
    }

    _toTarget.set(effectiveTargetPos.x - shipPos.x, 0, effectiveTargetPos.z - shipPos.z);
    const dist = _toTarget.length();
    if (dist < 0.1) {
      autopilotPhase.current = 'done';
      return;
    }
    _toTarget.normalize();

    // Arrival radius = ideal orbit altitude (the green ring), clamped to SOI.
    // Matches VelocityIndicator's idealOrbitRadius formula exactly.
    const arrivalRadius = gravBody
      ? Math.min(gravBody.surfaceRadius + gravBody.orbitAltitude, gravBody.soiRadius * 0.9)
      : STATION_ARRIVAL_RADIUS;

    // Target speed at the end of retroburn — scaled to the planet's circular orbital
    // velocity at the arrival radius so circularize can burn mostly tangentially.
    // Cap at PLANET_RETRO_ARRIVAL_SPEED for large planets; falls to ~0 for small ones.
    const retroTargetSpeed = gravBody
      ? Math.min(PLANET_RETRO_ARRIVAL_SPEED, Math.sqrt(gravBody.mu / arrivalRadius) * 0.2)
      : 0;

    const vToward = _velFlat.dot(_toTarget); // + = closing on target
    const distToArrival = dist - arrivalRadius;

    // Scale thrust multiplier for this phase and distance
    const nextThrust = autopilotThrust(
      dist,
      autopilotPhase.current,
      speed,
      distToArrival,
      retroTargetSpeed
    );
    if (nextThrust !== thrustMultiplier.current) {
      thrustMultiplier.current = nextThrust;
      window.dispatchEvent(new CustomEvent('ThrustChanged', { detail: { value: nextThrust } }));
    }

    // Ship nose direction in world XZ — visual nose = local +Z
    _noseDir.set(0, 0, 1).applyQuaternion(shipQuaternion).setY(0).normalize();

    // Signed angle from nose to target: crossY > 0 → target is CW → yawLeft
    const crossY = _noseDir.x * _toTarget.z - _noseDir.z * _toTarget.x;
    const signedErrorToTarget = Math.atan2(crossY, _noseDir.dot(_toTarget));
    const angVel = shipAngularVelocity.current;
    const aligned =
      Math.abs(signedErrorToTarget) < ALIGN_ANGLE_THRESHOLD &&
      Math.abs(angVel) < ALIGN_ANG_VEL_THRESHOLD;

    // Context object shared by all phase helpers this frame
    const ctx: AutopilotCtx = {
      shipPos,
      noseDir: _noseDir,
      toTarget: _toTarget,
      velFlat: _velFlat,
      dist,
      distToArrival,
      vToward,
      speed,
      angVel,
      aligned,
      gravBody,
      arrivalRadius,
      retroTargetSpeed,
      orbitStatus: orbitStatusRef.current,
      thrustForward: autopilotThrustForward,
      thrustReverse: autopilotThrustReverse,
      yawLeft: autopilotYawLeft,
      yawRight: autopilotYawRight,
      radialOut: autopilotRadialOut,
      radialIn: autopilotRadialIn,
      status: autopilotStatus,
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Phase cascade — one branch runs per frame; logging fires after.
    // Read top-to-bottom to trace the full autopilot sequence.
    // ─────────────────────────────────────────────────────────────────────────

    const prevPhase = autopilotPhase.current;

    // ── Global emergency: periapsis below orbit target while falling toward planet ──
    // Fires regardless of phase — radial-out works at any orbital position.
    // Continues until periapsis reaches arrivalRadius (the ideal orbit altitude),
    // not just the surface, so the orbit is properly raised before handing off.
    const _emergencyOs = orbitStatusRef.current;
    const _periapsisEmergency =
      _emergencyOs.surfaceRadius > 0 &&
      _emergencyOs.periapsis > 0 &&
      _emergencyOs.periapsis < arrivalRadius &&
      _emergencyOs.radialVelocity < 0 &&
      dist <= arrivalRadius; // only emergency-correct once inside the orbital layer
    if (_periapsisEmergency) {
      autopilotStatus.current = `RADIAL BURN  (Pe ${Math.round(_emergencyOs.periapsis)} / ${Math.round(arrivalRadius)} u)`;
      autopilotRadialOut.current = true;
      apLogStatus(autopilotStatus.current);
      return;
    }

    // ── hyperbolic-approach: steer to periapsis = ideal orbit radius ──────────
    if (autopilotPhase.current === 'hyperbolic-approach') {
      // status set by HyperbolicApproach
      const next = HyperbolicApproach(ctx);
      if (next) autopilotPhase.current = next;

      // ── coast-to-periapsis: no thrust; pre-orient retrograde ─────────────────
    } else if (autopilotPhase.current === 'coast-to-periapsis') {
      const next = CoastToPeriapsis(ctx);
      if (next) autopilotPhase.current = next;

      // ── hyperbolic-capture ───────────────────────────────────────────────────
    } else if (autopilotPhase.current === 'hyperbolic-capture') {
      const next = HyperbolicCapture(ctx);
      if (next) autopilotPhase.current = next;
    }

    // ── done: arrived — disengage ─────────────────────────────────────────────
    if (autopilotPhase.current === 'done') {
      autopilotStatus.current = 'ARRIVED';

      // ── align: rotate nose toward target ─────────────────────────────────────
    } else if (autopilotPhase.current === 'align') {
      autopilotStatus.current = 'ALIGNING (BURST)';
      const absErr = Math.abs(signedErrorToTarget);
      let yawDir: -1 | 0 | 1 = 0;

      if (absErr > ALIGN_ACCEPT_ANGLE) {
        // Outside 10° cone: pulse-turn toward target.
        yawDir = signedErrorToTarget > 0 ? -1 : 1;
        yawDir = applyAlignYawBurst(yawDir, false);
      } else if (Math.abs(angVel) > ALIGN_STOP_ANG_VEL) {
        // Inside 10° cone: pulse counter-rotation until yaw rate is near zero.
        yawDir = angVel > 0 ? -1 : 1;
        yawDir = applyAlignYawBurst(yawDir, true);
      } else {
        // Aligned and stabilized.
        yawDir = applyAlignYawBurst(0, true);
      }

      autopilotYawLeft.current = yawDir === -1;
      autopilotYawRight.current = yawDir === 1;

      const alignDone = absErr <= ALIGN_ACCEPT_ANGLE && Math.abs(angVel) <= ALIGN_STOP_ANG_VEL;
      if (alignDone) {
        resetAlignYawPulse();
        if (distToArrival <= 0) {
          autopilotPhase.current = 'done';
        } else if (gravBody) {
          autopilotPhase.current = 'hyperbolic-approach';
        } else {
          autopilotPhase.current = 'burn';
        }
      }

      // ── burn: straight-line approach to station ───────────────────────────────
    } else if (autopilotPhase.current === 'burn') {
      const next = Approach(ctx);
      if (next) autopilotPhase.current = next;

      // ── retroburn: brake to near-zero at arrival radius ───────────────────────
    } else if (autopilotPhase.current === 'retroburn') {
      const next = OrbitInsertion(ctx);
      if (next) autopilotPhase.current = next;
    }

    if (autopilotPhase.current !== 'align') {
      resetAlignYawPulse();
    }

    // ── Log any changes that happened this frame ──────────────────────────────
    if (autopilotPhase.current !== prevPhase) {
      apLogPhaseChange(prevPhase, autopilotPhase.current);
    }
    apLogStatus(autopilotStatus.current);
    if (autopilotStatus.current !== _lastStatusLogged.current) {
      // eslint-disable-next-line no-console
      console.log(`[AP STATUS] ${autopilotStatus.current}`);
      _lastStatusLogged.current = autopilotStatus.current;
    }
    apLogThrust(
      autopilotThrustForward.current,
      autopilotThrustReverse.current,
      autopilotYawLeft.current,
      autopilotYawRight.current,
      speed
    );
  });

  return null;
}
