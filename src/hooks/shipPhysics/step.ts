import * as THREE from 'three';
import { MAX_YAW_RATE, THRUST, YAW_THRUST } from '../../context/ShipState';
import { gravityBodies } from '../../context/GravityRegistry';
import { applyYawAndRoll, getYawFromQuaternion } from '../../orbitalRoll/shipYawRoll';
import { renderToSimulationSpace } from '../../context/FloatingOrigin';
import { applyGravityStep } from './gravity';
import { resolveCollisions, type CollisionResolveOptions } from './collisions';

const _localForward = new THREE.Vector3();
const _localRight = new THREE.Vector3();
const _radialDir = new THREE.Vector3();
const _shipPos = new THREE.Vector3();
const _yawPivotBefore = new THREE.Vector3();
const _yawPivotAfter = new THREE.Vector3();

interface StepParams {
  group: THREE.Group;
  velocity: THREE.Vector3;
  angularVelocity: { current: number };
  primaryGravityId: { current: string | null };
  primaryGravityVelocity: THREE.Vector3;
  thrustMultiplierRef: { current: number };
  dt: number;
  anyThrusting: boolean;
  disableGravity: boolean;
  freezeCollisions: boolean;
  selfCollisionId?: string;
  yawThrustScale?: number;
  yawPivotLocal?: THREE.Vector3 | null;
  yawLeft: boolean;
  yawRight: boolean;
  fwd: boolean;
  rev: boolean;
  revScale?: number;
  strL: boolean;
  strR: boolean;
  radOut: boolean;
  radIn: boolean;
  collisionOptions?: CollisionResolveOptions;
}

export function applyPhysicsStep({
  group,
  velocity,
  angularVelocity,
  primaryGravityId,
  primaryGravityVelocity,
  thrustMultiplierRef,
  dt,
  anyThrusting,
  disableGravity,
  freezeCollisions,
  selfCollisionId,
  yawThrustScale = 1,
  yawPivotLocal,
  yawLeft,
  yawRight,
  fwd,
  rev,
  revScale = 1,
  strL,
  strR,
  radOut,
  radIn,
  collisionOptions,
}: StepParams) {
  const forwardThrustMultiplier = thrustMultiplierRef.current;
  // Cap RCS/reverse authority so maneuvering remains controllable at high global thrust.
  const cappedManeuverMultiplier = Math.min(forwardThrustMultiplier, 2);

  const scaledYawThrust = YAW_THRUST * yawThrustScale;
  if (yawRight) angularVelocity.current -= scaledYawThrust * cappedManeuverMultiplier * dt;
  if (yawLeft) angularVelocity.current += scaledYawThrust * cappedManeuverMultiplier * dt;
  angularVelocity.current = THREE.MathUtils.clamp(
    angularVelocity.current,
    -MAX_YAW_RATE,
    MAX_YAW_RATE
  );
  if (yawPivotLocal) {
    _yawPivotBefore.copy(yawPivotLocal).applyQuaternion(group.quaternion).add(group.position);
  }
  const yaw = getYawFromQuaternion(group.quaternion) + angularVelocity.current * dt;
  applyYawAndRoll(group, yaw, 0);
  if (yawPivotLocal) {
    _yawPivotAfter.copy(yawPivotLocal).applyQuaternion(group.quaternion).add(group.position);
    group.position.add(_yawPivotBefore.sub(_yawPivotAfter));
  }

  _localForward.set(0, 0, 1).applyQuaternion(group.quaternion);
  if (fwd) velocity.addScaledVector(_localForward, -THRUST * forwardThrustMultiplier * dt);
  if (rev)
    velocity.addScaledVector(_localForward, THRUST * cappedManeuverMultiplier * revScale * dt);

  _localRight.set(1, 0, 0).applyQuaternion(group.quaternion);
  if (strL) velocity.addScaledVector(_localRight, -THRUST * cappedManeuverMultiplier * dt);
  if (strR) velocity.addScaledVector(_localRight, THRUST * cappedManeuverMultiplier * dt);

  if ((radOut || radIn) && primaryGravityId.current) {
    const body = gravityBodies.get(primaryGravityId.current);
    if (body) {
      group.getWorldPosition(_shipPos);
      renderToSimulationSpace(_shipPos, _shipPos);
      _radialDir.subVectors(_shipPos, body.position).normalize();
      if (radOut) velocity.addScaledVector(_radialDir, THRUST * thrustMultiplierRef.current * dt);
      if (radIn) velocity.addScaledVector(_radialDir, -THRUST * thrustMultiplierRef.current * dt);
    }
  }

  applyGravityStep({
    disableGravity,
    group,
    velocity,
    primaryGravityId,
    primaryGravityVelocity,
    dt,
    anyThrusting,
  });

  group.position.addScaledVector(velocity, dt);
  if (!freezeCollisions) {
    resolveCollisions(group, velocity, selfCollisionId, collisionOptions);
  }
}
