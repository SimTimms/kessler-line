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
  disableAutopilot,
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

import { clearThrusts }    from '../autopilot/clearThrusts';
import { computeYaw }      from '../autopilot/computeYaw';
import { autopilotThrust } from '../autopilot/autopilotThrust';
import { Approach }        from '../autopilot/Approach';
import { OrbitInsertion }  from '../autopilot/OrbitInsertion';
import { Circularize }     from '../autopilot/Circularize';
import { StabilizeOrbit }  from '../autopilot/StabilizeOrbit';
import {
  ALIGN_ANGLE_THRESHOLD,
  ALIGN_ANG_VEL_THRESHOLD,
  PLANET_ARRIVAL_RADIUS,
  PLANET_RETRO_ARRIVAL_SPEED,
  STATION_ARRIVAL_RADIUS,
} from '../autopilot/constants';
import type { AutopilotCtx } from '../autopilot/types';

// Saved player thrust level — restored when autopilot disengages
const _savedThrust        = { current: 1 };
const _autopilotWasActive = { current: false };

// Scratch vectors — reused every frame to avoid allocations
const _noseDir  = new THREE.Vector3();
const _toTarget = new THREE.Vector3();
const _velFlat  = new THREE.Vector3();

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
      }
      clearThrusts(autopilotThrustForward, autopilotThrustReverse, autopilotYawLeft, autopilotYawRight);
      return;
    }

    // Save player thrust on first active frame
    if (!_autopilotWasActive.current) {
      _savedThrust.current = thrustMultiplier.current;
      _autopilotWasActive.current = true;
    }

    clearThrusts(autopilotThrustForward, autopilotThrustReverse, autopilotYawLeft, autopilotYawRight);

    // ── Per-frame shared state ────────────────────────────────────────────────
    const shipPos   = shipPosRef.current;

    // Keep nav target locked to the live planet/body position — planets orbit
    const targetId = navTargetIdRef.current;
    const gravBody =
      gravityBodies.get(targetId) ??
      gravityBodies.get(targetId.charAt(0).toUpperCase() + targetId.slice(1));
    if (gravBody) navTargetPosRef.current.copy(gravBody.position);

    const targetPos = navTargetPosRef.current;

    _toTarget.set(targetPos.x - shipPos.x, 0, targetPos.z - shipPos.z);
    const dist = _toTarget.length();
    if (dist < 0.1) { autopilotPhase.current = 'done'; return; }
    _toTarget.normalize();

    const arrivalRadius = gravBody ? PLANET_ARRIVAL_RADIUS : STATION_ARRIVAL_RADIUS;

    _velFlat.set(shipVelocity.x, 0, shipVelocity.z);
    const vToward       = _velFlat.dot(_toTarget); // + = closing on target
    const speed         = _velFlat.length();
    const distToArrival = dist - arrivalRadius;

    // Scale thrust multiplier for this phase and distance
    const nextThrust = autopilotThrust(
      dist, autopilotPhase.current, speed, distToArrival,
      gravBody ? PLANET_RETRO_ARRIVAL_SPEED : 0,
    );
    if (nextThrust !== thrustMultiplier.current) {
      thrustMultiplier.current = nextThrust;
      window.dispatchEvent(new CustomEvent('ThrustChanged', { detail: { value: nextThrust } }));
    }

    // Ship nose direction in world XZ — visual nose = local +Z
    _noseDir.set(0, 0, 1).applyQuaternion(shipQuaternion).setY(0).normalize();

    // Signed angle from nose to target: crossY > 0 → target is CW → yawLeft
    const crossY              = _noseDir.x * _toTarget.z - _noseDir.z * _toTarget.x;
    const signedErrorToTarget = Math.atan2(crossY, _noseDir.dot(_toTarget));
    const angVel              = shipAngularVelocity.current;
    const aligned             =
      Math.abs(signedErrorToTarget) < ALIGN_ANGLE_THRESHOLD &&
      Math.abs(angVel)              < ALIGN_ANG_VEL_THRESHOLD;

    // Context object shared by all phase helpers this frame
    const ctx: AutopilotCtx = {
      shipPos,
      noseDir:      _noseDir,
      toTarget:     _toTarget,
      velFlat:      _velFlat,
      dist,
      distToArrival,
      vToward,
      speed,
      angVel,
      aligned,
      gravBody,
      arrivalRadius,
      orbitStatus:   orbitStatusRef.current,
      thrustForward: autopilotThrustForward,
      thrustReverse: autopilotThrustReverse,
      yawLeft:       autopilotYawLeft,
      yawRight:      autopilotYawRight,
      status:        autopilotStatus,
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Phase cascade — read top-to-bottom to see precedence.
    // Each block is a complete handler for that phase; it returns after acting.
    // ─────────────────────────────────────────────────────────────────────────

    // ── idle: nothing to do ───────────────────────────────────────────────────
    if (autopilotPhase.current === 'idle') return;

    // ── done: disengage autopilot ─────────────────────────────────────────────
    if (autopilotPhase.current === 'done') {
      autopilotStatus.current = 'ORBIT ESTABLISHED';
      disableAutopilot();
      window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: false } }));
      return;
    }

    // ── align: rotate nose toward target ─────────────────────────────────────
    if (autopilotPhase.current === 'align') {
      autopilotStatus.current = 'ALIGNING';
      const { yawLeft, yawRight } = computeYaw(signedErrorToTarget, angVel);
      autopilotYawLeft.current  = yawLeft;
      autopilotYawRight.current = yawRight;
      if (aligned) autopilotPhase.current = distToArrival > 0 ? 'burn' : 'done';
      return;
    }

    // ── burn: approach target ─────────────────────────────────────────────────
    if (autopilotPhase.current === 'burn') {
      autopilotStatus.current = 'APPROACH BURN';
      const next = Approach(ctx);
      if (next) autopilotPhase.current = next;
      return;
    }

    // ── retroburn: flip to retrograde and kill velocity ───────────────────────
    if (autopilotPhase.current === 'retroburn') {
      // status is set by OrbitInsertion — it has speed/distance context
      const next = OrbitInsertion(ctx);
      if (next) autopilotPhase.current = next;
      return;
    }

    // ── circularize: insertion burn to set periapsis ──────────────────────────
    if (autopilotPhase.current === 'circularize') {
      // status is set by Circularize — it knows if burning or done
      const next = Circularize(ctx);
      if (next) autopilotPhase.current = next;
      return;
    }

    // ── stabilize-orbit: Hohmann burns to reach target orbit ─────────────────
    if (autopilotPhase.current === 'stabilize-orbit') {
      // status is set by StabilizeOrbit — it knows coasting vs burning
      const next = StabilizeOrbit(ctx);
      if (next) autopilotPhase.current = next;
      return;
    }
  });

  return null;
}
