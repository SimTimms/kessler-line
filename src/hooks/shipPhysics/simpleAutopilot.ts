import * as THREE from 'three';
import {
  autopilotActive,
  autopilotThrustForward,
  autopilotThrustReverse,
  autopilotYawLeft,
  autopilotYawRight,
} from '../../context/AutopilotState';
import { navTargetIdRef, navTargetPosRef } from '../../context/NavTarget';
import {
  selectedTargetName,
  selectedTargetPosition,
  selectedTargetVelocity,
} from '../../context/TargetSelection';
import { shipPosRef } from '../../context/ShipPos';

const _toTarget = new THREE.Vector3();
const _nose = new THREE.Vector3();
const _aim = new THREE.Vector3();

/** ~23° — only burn main/reverse when roughly pointed at target (yaw-only ship). */
const ALIGN_DOT_MIN = 0.92;
const YAW_CROSS_THRESHOLD = 0.08;
const MAX_CLOSING = 35;
const MIN_CLOSING = 6;
const CLOSING_HYST = 2;

/** Fills `autopilotThrust*` refs for `getCombinedInputs`; clears them when autopilot is off. */
export function updateAutopilotThrustOutputs(
  group: THREE.Group,
  shipVelocity: THREE.Vector3,
  opts: { controlsLocked: boolean; shipDestroyed: boolean },
): void {
  autopilotThrustForward.current = false;
  autopilotThrustReverse.current = false;
  autopilotYawLeft.current = false;
  autopilotYawRight.current = false;

  if (!autopilotActive.current || opts.controlsLocked || opts.shipDestroyed) return;

  const hasSelected =
    selectedTargetName !== null && selectedTargetPosition.lengthSq() > 0.01;
  const hasNav = navTargetIdRef.current.trim().length > 0;
  if (!hasSelected && !hasNav) return;

  const targetPos = hasSelected ? selectedTargetPosition : navTargetPosRef.current;

  _toTarget.subVectors(targetPos, shipPosRef.current);
  const dist = _toTarget.length();
  if (dist < 1.5) return;

  _toTarget.multiplyScalar(1 / dist);

  const closingRate = hasSelected
    ? shipVelocity.dot(_toTarget) - selectedTargetVelocity.dot(_toTarget)
    : shipVelocity.dot(_toTarget);

  _nose.set(0, 0, -1).applyQuaternion(group.quaternion);
  _nose.y = 0;
  if (_nose.lengthSq() < 1e-8) return;
  _nose.normalize();

  _aim.copy(_toTarget);
  _aim.y = 0;
  if (_aim.lengthSq() < 1e-8) return;
  _aim.normalize();

  const dot = _nose.x * _aim.x + _nose.z * _aim.z;
  // (nose × aim).y in XZ: positive ⇒ aim lies to port → yaw left
  const crossY = _nose.x * _aim.z - _nose.z * _aim.x;

  if (dot < ALIGN_DOT_MIN) {
    if (crossY > YAW_CROSS_THRESHOLD) autopilotYawLeft.current = true;
    else if (crossY < -YAW_CROSS_THRESHOLD) autopilotYawRight.current = true;
    return;
  }

  const desiredClose = Math.max(MIN_CLOSING, Math.min(MAX_CLOSING, dist * 0.12));
  if (closingRate < desiredClose - CLOSING_HYST) {
    autopilotThrustForward.current = true;
  } else if (closingRate > desiredClose + CLOSING_HYST) {
    autopilotThrustReverse.current = true;
  }
}
