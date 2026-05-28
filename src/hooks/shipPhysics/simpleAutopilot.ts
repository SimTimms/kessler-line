import * as THREE from 'three';
import {
  autopilotActive,
  autopilotMode,
  autopilotStatus,
  autopilotThrustForward,
  autopilotThrustReverse,
  autopilotYawLeft,
  autopilotYawRight,
  autopilotRadialOut,
  autopilotRadialIn,
  autopilotThrustStrafeLeft,
  autopilotThrustStrafeRight,
} from '../../context/AutopilotState';
import { navTargetIdRef, navTargetPosRef } from '../../context/NavTarget';
import {
  selectedTargetKey,
  selectedTargetName,
  selectedTargetPosition,
  selectedTargetVelocity,
} from '../../context/TargetSelection';
import { shipPosRef } from '../../context/ShipPos';
import { MAX_THRUST_MULTIPLIER, shipAngularVelocity, THRUST, thrustMultiplier } from '../../context/ShipState';
import { updateVelocityMatchThrustOutputs } from './velocityMatchAutopilot';
import { getCollidables } from '../../context/CollisionRegistry';
import { DOCKING_PORT_LOCAL_Z } from '../../config/shipConfig';

const _toTarget = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _nose = new THREE.Vector3();
const _relVel = new THREE.Vector3();
const _dockPos = new THREE.Vector3();
const _dockQuat = new THREE.Quaternion();
const _dockForward = new THREE.Vector3();

type Stage = 'align' | 'match-velocity' | 'burn' | 'retroburn' | 'dock-align' | 'hold';

const state = {
  stage: 'align' as Stage,
  targetKey: '',
  yawBurstDir: 0 as -1 | 0 | 1,
  yawBurstEndsAtMs: 0,
  yawCooldownEndsAtMs: 0,
};

const ALIGN_ENTER_DEG = 8;
const ALIGN_EXIT_DEG = 10;
const DOCK_ALIGN_ENTER_DEG = 4;
const DOCK_ALIGN_EXIT_DEG = 6;
const SPIN_ZERO = 0.02;
const CLOSING_ZERO = 0.6;
const LATERAL_ZERO = 0.6;
const SPEED_HYST = 0.8;

// Gentler than previous: short taps with long coast.
const YAW_TAP_ON_MS = 60;
const YAW_TAP_OFF_MS = 420;
const YAW_BRAKE_ON_MS = 50;
const YAW_BRAKE_OFF_MS = 380;

const TARGET_DIST_FOR_RETRO_COMPLETE = 1000;
const TARGET_SPEED_AT_RETRO_COMPLETE = 20;
const DOCK_ALIGN_ENTRY_DIST = 160;

function resetState() {
  state.stage = 'align';
  state.targetKey = '';
  state.yawBurstDir = 0;
  state.yawBurstEndsAtMs = 0;
  state.yawCooldownEndsAtMs = 0;
}

function setThrustMultiplier(next: number) {
  if (Math.abs(thrustMultiplier.current - next) < 1e-6) return;
  thrustMultiplier.current = next;
  window.dispatchEvent(new CustomEvent('ThrustChanged', { detail: { value: next } }));
}

function desiredSpeedByDistance(dist: number): number {
  if (dist > 2000) return 320;
  if (dist > 1000) return 80;
  if (dist > 200) return 20;
  return Math.max(2, Math.min(20, dist / 10));
}

function findDockingBayForSelectedTarget() {
  const key = selectedTargetKey?.trim() ?? '';
  const name = selectedTargetName?.trim() ?? '';
  if (!key && !name) return null;
  return (
    getCollidables().find(
      (c) =>
        c.id.startsWith('docking-bay-') &&
        !!c.stationId &&
        (c.stationId === key || c.stationId === name || c.id === `docking-bay-${key}`)
    ) ?? null
  );
}

function computeSelectedTargetPoint() {
  const dockingBay = findDockingBayForSelectedTarget();
  _targetPos.copy(selectedTargetPosition);
  if (dockingBay) {
    dockingBay.getWorldPosition(_dockPos);
    if (dockingBay.getWorldQuaternion) dockingBay.getWorldQuaternion(_dockQuat);
    else _dockQuat.identity();
    _dockForward.set(0, 0, DOCKING_PORT_LOCAL_Z).applyQuaternion(_dockQuat);
    // Aim ship center at docking capture pose.
    _targetPos.copy(_dockPos).sub(_dockForward);
  }
  return { dockingBay, targetPos: _targetPos };
}

function pulseYaw(dir: -1 | 0 | 1, braking: boolean): -1 | 0 | 1 {
  const now = performance.now();
  const onMs = braking ? YAW_BRAKE_ON_MS : YAW_TAP_ON_MS;
  const offMs = braking ? YAW_BRAKE_OFF_MS : YAW_TAP_OFF_MS;

  if (dir === 0) {
    state.yawBurstDir = 0;
    return 0;
  }

  if (state.yawBurstDir !== 0) {
    if (now < state.yawBurstEndsAtMs) return state.yawBurstDir;
    state.yawBurstDir = 0;
    state.yawCooldownEndsAtMs = now + offMs;
    return 0;
  }

  if (now < state.yawCooldownEndsAtMs) return 0;
  state.yawBurstDir = dir;
  state.yawBurstEndsAtMs = now + onMs;
  return dir;
}

function applyYawControl(
  signedErr: number,
  angVel: number,
  enterDeg: number,
  exitDeg: number
): { inDeadZone: boolean; deadZoneSpinKill: boolean } {
  const absErr = Math.abs((signedErr * 180) / Math.PI);
  const inDeadZone = absErr <= exitDeg;
  const deadZoneSpinKill = inDeadZone && Math.abs(angVel) > SPIN_ZERO;

  if (deadZoneSpinKill) {
    // Explicitly trigger yaw cancel assist in physics.
    autopilotYawLeft.current = true;
    autopilotYawRight.current = true;
    return { inDeadZone, deadZoneSpinKill };
  }

  if (absErr > enterDeg) {
    const cmdDir: -1 | 1 = signedErr > 0 ? -1 : 1;
    const pulsed = pulseYaw(cmdDir, false);
    autopilotYawLeft.current = pulsed === -1;
    autopilotYawRight.current = pulsed === 1;
  } else if (Math.abs(angVel) > SPIN_ZERO) {
    const cmdDir: -1 | 1 = angVel > 0 ? -1 : 1;
    const pulsed = pulseYaw(cmdDir, true);
    autopilotYawLeft.current = pulsed === -1;
    autopilotYawRight.current = pulsed === 1;
  }

  return { inDeadZone, deadZoneSpinKill };
}

export interface AutopilotThrustOpts {
  controlsLocked: boolean;
  shipDestroyed: boolean;
  primaryGravityId: { current: string | null };
}

/** Fills `autopilotThrust*` refs for `getCombinedInputs`; clears them when autopilot is off. */
export function updateAutopilotThrustOutputs(
  group: THREE.Group,
  shipVelocity: THREE.Vector3,
  opts: AutopilotThrustOpts
): void {
  autopilotThrustForward.current = false;
  autopilotThrustReverse.current = false;
  autopilotYawLeft.current = false;
  autopilotYawRight.current = false;
  autopilotRadialOut.current = false;
  autopilotRadialIn.current = false;
  autopilotThrustStrafeLeft.current = false;
  autopilotThrustStrafeRight.current = false;

  if (!autopilotActive.current || opts.controlsLocked || opts.shipDestroyed) {
    resetState();
    return;
  }

  if (autopilotMode.current === 'velocityMatch') {
    resetState();
    updateVelocityMatchThrustOutputs(group, shipVelocity, opts);
    return;
  }

  updateApproachAutopilotThrustOutputs(group, shipVelocity);
}

function updateApproachAutopilotThrustOutputs(group: THREE.Group, shipVelocity: THREE.Vector3): void {
  const hasSelected = selectedTargetName !== null && selectedTargetPosition.lengthSq() > 0.01;
  const hasNav = navTargetIdRef.current.trim().length > 0;
  if (!hasSelected && !hasNav) {
    resetState();
    return;
  }

  // New staged AP applies to selected scan/metal targets.
  if (hasSelected) {
    setThrustMultiplier(MAX_THRUST_MULTIPLIER);

    const { dockingBay, targetPos } = computeSelectedTargetPoint();
    const key = `${selectedTargetKey ?? selectedTargetName}:${Math.round(targetPos.x)}:${Math.round(targetPos.z)}`;
    if (key !== state.targetKey) {
      resetState();
      state.targetKey = key;
    }

    _toTarget.subVectors(targetPos, shipPosRef.current);
    const dist = _toTarget.length();
    if (dist < 0.5) {
      state.stage = dockingBay ? 'dock-align' : 'hold';
    } else {
      _toTarget.multiplyScalar(1 / dist);
    }

    _relVel.set(
      shipVelocity.x - selectedTargetVelocity.x,
      0,
      shipVelocity.z - selectedTargetVelocity.z
    );
    const closing = _relVel.dot(_toTarget); // + toward target
    const lateral = _relVel.x * -_toTarget.z + _relVel.z * _toTarget.x; // + right-of-track

    _nose.set(0, 0, 1).applyQuaternion(group.quaternion).setY(0);
    if (_nose.lengthSq() < 1e-8) return;
    _nose.normalize();
    const dot = _nose.x * _toTarget.x + _nose.z * _toTarget.z;
    const crossY = _nose.x * _toTarget.z - _nose.z * _toTarget.x;
    const signedErr = Math.atan2(crossY, dot);
    const angVel = shipAngularVelocity.current;
    const absErrDeg = Math.abs((signedErr * 180) / Math.PI);

    const applyLateralCorrection = () => {
      if (Math.abs(lateral) <= LATERAL_ZERO) return;
      // Current physics mapping: this direction cancels observed divergence.
      if (lateral > 0) autopilotThrustStrafeRight.current = true;
      else autopilotThrustStrafeLeft.current = true;
    };

    // Stage transitions
    if (
      state.stage === 'align' &&
      absErrDeg <= ALIGN_ENTER_DEG &&
      Math.abs(angVel) <= SPIN_ZERO
    ) {
      state.stage = 'match-velocity';
    }
    if (
      state.stage === 'match-velocity' &&
      Math.abs(closing) <= CLOSING_ZERO &&
      Math.abs(lateral) <= LATERAL_ZERO &&
      Math.abs(angVel) <= SPIN_ZERO &&
      absErrDeg <= ALIGN_ENTER_DEG
    ) {
      state.stage = 'burn';
    }

    const accel = Math.max(0.1, THRUST * thrustMultiplier.current);
    const retroTarget = TARGET_SPEED_AT_RETRO_COMPLETE;
    const speedToKill = Math.max(0, closing - retroTarget);
    const stopDist = (speedToKill * speedToKill) / (2 * accel);
    if (state.stage === 'burn' && dist <= TARGET_DIST_FOR_RETRO_COMPLETE + stopDist + 120) {
      state.stage = 'retroburn';
    }
    if (
      state.stage === 'retroburn' &&
      dist <= TARGET_DIST_FOR_RETRO_COMPLETE &&
      closing <= TARGET_SPEED_AT_RETRO_COMPLETE + SPEED_HYST
    ) {
      state.stage = dockingBay && dist <= DOCK_ALIGN_ENTRY_DIST ? 'dock-align' : 'burn';
    }

    if (state.stage === 'align') {
      applyYawControl(signedErr, angVel, ALIGN_ENTER_DEG, ALIGN_EXIT_DEG);
      applyLateralCorrection();
      autopilotStatus.current = `AP1 ALIGN  e=${absErrDeg.toFixed(1)} av=${angVel.toFixed(2)}`;
      return;
    }

    if (state.stage === 'match-velocity') {
      applyYawControl(signedErr, angVel, ALIGN_ENTER_DEG, ALIGN_EXIT_DEG);
      applyLateralCorrection();
      if (closing > CLOSING_ZERO) autopilotThrustForward.current = true; // brake approach
      else if (closing < -CLOSING_ZERO && dot > 0.4) autopilotThrustReverse.current = true; // remove receding
      autopilotStatus.current = `AP2 MATCH VEL  rv=${closing.toFixed(1)} lat=${lateral.toFixed(1)}`;
      return;
    }

    if (state.stage === 'burn') {
      applyYawControl(signedErr, angVel, ALIGN_ENTER_DEG + 2, ALIGN_EXIT_DEG + 2);
      applyLateralCorrection();
      const desired = desiredSpeedByDistance(dist);
      if (closing < desired - SPEED_HYST && dot > 0.35) autopilotThrustReverse.current = true;
      if (closing > desired + SPEED_HYST) autopilotThrustForward.current = true;
      if (dockingBay && dist <= DOCK_ALIGN_ENTRY_DIST) state.stage = 'dock-align';
      autopilotStatus.current = `AP3 BURN  d=${Math.round(dist)} rv=${closing.toFixed(1)} des=${desired.toFixed(1)}`;
      return;
    }

    if (state.stage === 'retroburn') {
      applyYawControl(signedErr, angVel, ALIGN_ENTER_DEG + 3, ALIGN_EXIT_DEG + 4);
      applyLateralCorrection();
      if (closing > TARGET_SPEED_AT_RETRO_COMPLETE) autopilotThrustForward.current = true;
      autopilotStatus.current = `AP3R RETRO  d=${Math.round(dist)} rv=${closing.toFixed(1)} tgt=${TARGET_SPEED_AT_RETRO_COMPLETE}`;
      return;
    }

    if (state.stage === 'dock-align') {
      applyYawControl(signedErr, angVel, DOCK_ALIGN_ENTER_DEG, DOCK_ALIGN_EXIT_DEG);
      applyLateralCorrection();
      // Keep a gentle close-in speed for capture, ramping down with distance.
      const desiredDock = Math.max(2, Math.min(6, dist / 30));
      if (closing < desiredDock - SPEED_HYST && dot > 0.5) autopilotThrustReverse.current = true;
      if (closing > desiredDock + SPEED_HYST) autopilotThrustForward.current = true;
      autopilotStatus.current = `AP4 DOCK ALIGN  d=${Math.round(dist)} e=${absErrDeg.toFixed(1)} rv=${closing.toFixed(1)} des=${desiredDock.toFixed(1)}`;
      return;
    }

    // hold
    applyYawControl(signedErr, angVel, ALIGN_ENTER_DEG, ALIGN_EXIT_DEG);
    applyLateralCorrection();
    if (Math.abs(closing) > CLOSING_ZERO) {
      if (closing > 0) autopilotThrustForward.current = true;
      else if (dot > 0.4) autopilotThrustReverse.current = true;
    }
    autopilotStatus.current = 'AP HOLD';
    return;
  }

  // Legacy nav-target approach path (non-selected targets).
  resetState();
  _toTarget.subVectors(navTargetPosRef.current, shipPosRef.current);
  const dist = _toTarget.length();
  if (dist < 1.5) return;
  _toTarget.multiplyScalar(1 / dist);
  _nose.set(0, 0, 1).applyQuaternion(group.quaternion).setY(0);
  if (_nose.lengthSq() < 1e-8) return;
  _nose.normalize();

  const dot = _nose.x * _toTarget.x + _nose.z * _toTarget.z;
  const crossY = _nose.x * _toTarget.z - _nose.z * _toTarget.x;
  if (dot < 0.92) {
    if (crossY > 0.08) autopilotYawLeft.current = true;
    else if (crossY < -0.08) autopilotYawRight.current = true;
    return;
  }

  const closing = shipVelocity.dot(_toTarget);
  const desiredClose = Math.max(6, Math.min(35, dist * 0.12));
  if (closing < desiredClose - 2) autopilotThrustReverse.current = true;
  else if (closing > desiredClose + 2) autopilotThrustForward.current = true;
}
