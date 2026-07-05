import * as THREE from 'three';
import type { CollidableEntry } from '../context/CollisionRegistry';

const _center = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _invQuat = new THREE.Quaternion();
const _localOrigin = new THREE.Vector3();
const _localDir = new THREE.Vector3();
const _halfExtents = new THREE.Vector3();
const _capCenter = new THREE.Vector3();

function findCollidableForHit(
  obj: THREE.Object3D,
  collidables: CollidableEntry[]
): CollidableEntry | null {
  for (const entry of collidables) {
    const root = entry.getObject3D?.();
    if (!root) continue;
    let node: THREE.Object3D | null = obj;
    while (node) {
      if (node === root) return entry;
      node = node.parent;
    }
  }
  return null;
}

function intersectRaySphere(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  center: THREE.Vector3,
  radius: number
): number | null {
  const ox = origin.x - center.x;
  const oy = origin.y - center.y;
  const oz = origin.z - center.z;
  const b = 2 * (ox * dir.x + oy * dir.y + oz * dir.z);
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  const disc = b * b - 4 * c;
  if (disc < 0) return null;
  const sqrtDisc = Math.sqrt(disc);
  const t0 = (-b - sqrtDisc) * 0.5;
  if (t0 >= 0) return t0;
  const t1 = (-b + sqrtDisc) * 0.5;
  return t1 >= 0 ? t1 : null;
}

function intersectShape(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  entry: CollidableEntry
): number | null {
  entry.getWorldPosition(_center);
  const { shape } = entry;

  if (shape.type === 'sphere') {
    return intersectRaySphere(origin, dir, _center, shape.radius);
  }

  if (!entry.getWorldQuaternion) return null;
  entry.getWorldQuaternion(_quat);

  _invQuat.copy(_quat).invert();
  _localOrigin.copy(origin).sub(_center).applyQuaternion(_invQuat);
  _localDir.copy(dir).applyQuaternion(_invQuat);

  if (shape.type === 'box') {
    _halfExtents.copy(shape.halfExtents);
    let tMin = -Infinity;
    let tMax = Infinity;

    const axes: Array<[keyof THREE.Vector3, number]> = [
      ['x', _halfExtents.x],
      ['y', _halfExtents.y],
      ['z', _halfExtents.z],
    ];

    for (const [axis, half] of axes) {
      const o = _localOrigin[axis];
      const d = _localDir[axis];
      if (Math.abs(d) < 1e-8) {
        if (o < -half || o > half) return null;
        continue;
      }
      const t1 = (-half - o) / d;
      const t2 = (half - o) / d;
      const near = Math.min(t1, t2);
      const far = Math.max(t1, t2);
      tMin = Math.max(tMin, near);
      tMax = Math.min(tMax, far);
      if (tMin > tMax) return null;
    }

    return tMin >= 0 ? tMin : tMax >= 0 ? tMax : null;
  }

  const radius = shape.radius;
  const halfHeight = shape.height * 0.5;

  _capCenter.set(0, 0, 0);
  const cylT = intersectRaySphere(_localOrigin, _localDir, _capCenter, radius);
  if (cylT !== null) {
    const py = _localOrigin.y + _localDir.y * cylT;
    if (py >= -halfHeight && py <= halfHeight) return cylT;
  }

  _capCenter.set(0, halfHeight, 0);
  const topT = intersectRaySphere(_localOrigin, _localDir, _capCenter, radius);
  if (topT !== null) return topT;

  _capCenter.set(0, -halfHeight, 0);
  return intersectRaySphere(_localOrigin, _localDir, _capCenter, radius);
}

/** Returns the closest collidable along `raycaster`, or null if nothing was hit. */
export function pickCollidable(
  raycaster: THREE.Raycaster,
  collidables: CollidableEntry[],
  excludeId?: string
): CollidableEntry | null {
  let bestDist = Infinity;
  let bestEntry: CollidableEntry | null = null;

  const origin = raycaster.ray.origin;
  const dir = raycaster.ray.direction;

  // Analytical shape tests — always run so invisible planet meshes and belt
  // asteroids (no getObject3D) still pick correctly.
  for (const entry of collidables) {
    if (entry.id === excludeId) continue;
    const t = intersectShape(origin, dir, entry);
    if (t !== null && t < bestDist) {
      bestDist = t;
      bestEntry = entry;
    }
  }

  const meshRoots: THREE.Object3D[] = [];
  for (const entry of collidables) {
    if (entry.id === excludeId) continue;
    const root = entry.getObject3D?.();
    if (root?.visible) meshRoots.push(root);
  }

  if (meshRoots.length > 0) {
    const hits = raycaster.intersectObjects(meshRoots, true);
    for (const hit of hits) {
      if (!hit.object.visible) continue;
      const entry = findCollidableForHit(hit.object, collidables);
      if (entry && entry.id !== excludeId && hit.distance < bestDist) {
        bestDist = hit.distance;
        bestEntry = entry;
      }
    }
  }

  return bestEntry;
}
