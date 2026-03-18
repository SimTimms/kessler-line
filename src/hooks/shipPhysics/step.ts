import * as THREE from 'three';
import { THRUST, YAW_THRUST, thrustMultiplier } from '../../context/ShipState';
import { gravityBodies } from '../../context/GravityRegistry';
import { applyGravityStep } from './gravity';
import { resolveCollisions } from './collisions';

const _localForward = new THREE.Vector3();
const _localRight = new THREE.Vector3();
const _radialDir = new THREE.Vector3();
const _shipPos = new THREE.Vector3();

interface StepParams {
  group: THREE.Group;
  velocity: THREE.Vector3;
  angularVelocity: { current: number };
  primaryGravityId: { current: string | null };
  primaryGravityVelocity: THREE.Vector3;
  dt: number;
  anyThrusting: boolean;
  disableGravity: boolean;
  freezeCollisions: boolean;
  yawLeft: boolean;
  yawRight: boolean;
  fwd: boolean;
  rev: boolean;
  revScale?: number;
  strL: boolean;
  strR: boolean;
  radOut: boolean;
  radIn: boolean;
}

export function applyPhysicsStep({
  group,
  velocity,
  angularVelocity,
  primaryGravityId,
  primaryGravityVelocity,
  dt,
  anyThrusting,
  disableGravity,
  freezeCollisions,
  yawLeft,
  yawRight,
  fwd,
  rev,
  revScale = 1,
  strL,
  strR,
  radOut,
  radIn,
}: StepParams) {
  if (yawLeft) angularVelocity.current -= YAW_THRUST * dt;
  if (yawRight) angularVelocity.current += YAW_THRUST * dt;
  group.rotation.y += angularVelocity.current * dt;

  _localForward.set(0, 0, 1).applyQuaternion(group.quaternion);
  if (fwd) velocity.addScaledVector(_localForward, -THRUST * thrustMultiplier.current * dt);
  if (rev)
    velocity.addScaledVector(_localForward, THRUST * thrustMultiplier.current * revScale * dt);

  _localRight.set(1, 0, 0).applyQuaternion(group.quaternion);
  if (strL) velocity.addScaledVector(_localRight, -THRUST * dt);
  if (strR) velocity.addScaledVector(_localRight, THRUST * dt);

  if ((radOut || radIn) && primaryGravityId.current) {
    const body = gravityBodies.get(primaryGravityId.current);
    if (body) {
      group.getWorldPosition(_shipPos);
      _radialDir.subVectors(_shipPos, body.position).normalize();
      if (radOut) velocity.addScaledVector(_radialDir, THRUST * thrustMultiplier.current * dt);
      if (radIn) velocity.addScaledVector(_radialDir, -THRUST * thrustMultiplier.current * dt);
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
    resolveCollisions(group, velocity);
  }
}
