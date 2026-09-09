import * as THREE from 'three';
import { registerCollidable, type CollidableEntry } from '../../context/CollisionRegistry';
import {
  DEBUG_COLLISION_TEST_PROJECTILE_SPEED,
  DEBUG_COLLISION_TEST_SPAWN_DISTANCE,
} from '../../config/debugConfig';

export type TestProjectile = {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  ageSec: number;
  targetId: string;
  nextVentAtMs: number;
};

export const PROJECTILE_RADIUS = 2.4;

const PROJECTILE_IMPULSE_SCALE = 0.14;

const _shipPos = new THREE.Vector3();
const _shipVel = new THREE.Vector3();
const _spawnDir = new THREE.Vector3();
const _spawnPos = new THREE.Vector3();
const _toShip = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/**
 * Spawns a debug collision-test projectile aimed at `target` (or `defaultAim`),
 * registers it in the collision system, and pushes it onto `projectiles`.
 */
export function spawnProjectile(
  target: CollidableEntry | null,
  defaultAim: THREE.Vector3 | null,
  projectiles: TestProjectile[],
  getNextId: () => number
): void {
  if (target) {
    target.getWorldPosition(_shipPos);
    if (target.getWorldVelocity) {
      target.getWorldVelocity(_shipVel);
    } else {
      _shipVel.set(0, 0, 0);
    }
  } else {
    if (!defaultAim) return;
    _shipPos.copy(defaultAim);
    _shipVel.set(0, 0, 0);
  }

  const ySquash = 0.1;
  _spawnDir
    .set(Math.random() - 0.5, (Math.random() - 0.5) * ySquash, Math.random() - 0.5)
    .normalize();
  if (_spawnDir.lengthSq() < 1e-6) _spawnDir.copy(_up);
  _spawnPos.copy(_shipPos).addScaledVector(_spawnDir, DEBUG_COLLISION_TEST_SPAWN_DISTANCE);
  _toShip.subVectors(_shipPos, _spawnPos).normalize();

  const id = `debug-collision-test-${getNextId()}`;
  const projectile: TestProjectile = {
    id,
    position: _spawnPos.clone(),
    velocity: _shipVel
      .clone()
      .addScaledVector(_toShip, DEBUG_COLLISION_TEST_PROJECTILE_SPEED + Math.random() * 15),
    ageSec: 0,
    targetId: target?.id ?? 'default-aim',
    nextVentAtMs: 0,
  };

  registerCollidable({
    id,
    label: 'Debug Collision Test Projectile',
    getWorldPosition: (t) => t.copy(projectile.position),
    getWorldVelocity: (t) => t.copy(projectile.velocity),
    shape: { type: 'sphere', radius: PROJECTILE_RADIUS },
    applyImpulse: (impulse) => {
      projectile.velocity.addScaledVector(impulse, PROJECTILE_IMPULSE_SCALE);
    },
    physicalCollision: true,
  });

  projectiles.push(projectile);
}
