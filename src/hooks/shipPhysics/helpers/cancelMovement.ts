import * as THREE from 'three';
import type { RefObject } from 'react';

interface CancelLateralMovementParams {
  velocity: RefObject<THREE.Vector3>;
  group: THREE.Group;
  strL: boolean;
  strR: boolean;
  _assistRight: THREE.Vector3;
  CANCEL_LINEAR_EPS: number;
}

export function cancelLateralMovement({
  velocity,
  group,
  strL,
  strR,
  _assistRight,
  CANCEL_LINEAR_EPS,
}: CancelLateralMovementParams): { strL: boolean; strR: boolean } {
  if (strL && strR) {
    _assistRight.set(1, 0, 0).applyQuaternion(group.quaternion);
    const vRight = velocity.current.dot(_assistRight);
    if (Math.abs(vRight) <= CANCEL_LINEAR_EPS) {
      // Snap lateral component to zero so assist does not re-pulse.
      velocity.current.addScaledVector(_assistRight, -vRight);
      strL = false;
      strR = false;
    } else if (vRight > 0) {
      // Moving +right → apply strafe-left (-right acceleration)
      strL = true;
      strR = false;
    } else {
      strL = false;
      strR = true;
    }
  }
  return { strL, strR };
}

interface CancelYawMovementParams {
  angularVelocity: RefObject<number>;
  yawLeft: boolean;
  yawRight: boolean;
  CANCEL_YAW_EPS: number;
}

export function cancelYawMovement({
  angularVelocity,
  yawLeft,
  yawRight,
  CANCEL_YAW_EPS,
}: CancelYawMovementParams): { yawLeft: boolean; yawRight: boolean } {
  if (yawLeft && yawRight) {
    const yawRate = angularVelocity.current;
    if (Math.abs(yawRate) <= CANCEL_YAW_EPS) {
      // Clamp residual angular drift at threshold.
      angularVelocity.current = 0;
      yawLeft = false;
      yawRight = false;
    } else if (yawRate > 0) {
      // Positive yaw rate → apply yaw-right torque (negative) to oppose it
      yawLeft = false;
      yawRight = true;
    } else {
      yawLeft = true;
      yawRight = false;
    }
  }
  return { yawLeft, yawRight };
}

interface CancelLongitudinalMovementParams {
  velocity: RefObject<THREE.Vector3>;
  _assistForward: THREE.Vector3;
  fwd: boolean;
  rev: boolean;
  CANCEL_LINEAR_EPS: number;
  group: THREE.Group;
}

export function cancelLongitudinalMovement({
  velocity,
  _assistForward,
  fwd,
  rev,
  CANCEL_LINEAR_EPS,
  group,
}: CancelLongitudinalMovementParams): { fwd: boolean; rev: boolean } {
  if (fwd && rev) {
    _assistForward.set(0, 0, 1).applyQuaternion(group.quaternion);
    const vForward = velocity.current.dot(_assistForward);
    if (Math.abs(vForward) <= CANCEL_LINEAR_EPS) {
      // Snap longitudinal component to zero so assist does not re-pulse.
      velocity.current.addScaledVector(_assistForward, -vForward);
      fwd = false;
      rev = false;
    } else if (vForward > 0) {
      // Moving +forward → apply opposite acceleration (-forward)
      fwd = true;
      rev = false;
    } else {
      fwd = false;
      rev = true;
    }
  }
  return { fwd, rev };
}
