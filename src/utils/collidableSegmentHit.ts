import * as THREE from 'three';
import {
  getCollidables,
  type CollidableEntry,
  type ColliderShape,
} from '../context/CollisionRegistry';

export type SegmentHit = {
  collidable: CollidableEntry;
  /** Hit point in world space. */
  point: THREE.Vector3;
  /** Outward surface normal at the hit. */
  normal: THREE.Vector3;
  /** Parametric distance along the segment [0, 1]. */
  t: number;
};

const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _invQuat = new THREE.Quaternion();
const _fromLocal = new THREE.Vector3();
const _toLocal = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _closest = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _capsuleA = new THREE.Vector3();
const _capsuleB = new THREE.Vector3();
const _up = new THREE.Vector3();
const _ab = new THREE.Vector3();
const _ac = new THREE.Vector3();
const _r = new THREE.Vector3();
const _d2 = new THREE.Vector3();
const _point = new THREE.Vector3();
const _candPoint = new THREE.Vector3();
const _candNormal = new THREE.Vector3();
const _hitPointOut = new THREE.Vector3();
const _hitNormalOut = new THREE.Vector3();

function isDockingBay(id: string): boolean {
  return id.startsWith('docking-bay-');
}

function shouldTestCollidable(entry: CollidableEntry, ignoreIds: ReadonlySet<string> | undefined): boolean {
  // Shooters pass their own id in ignoreIds (player / NPC). Do not hard-skip the
  // player ship — NPC rounds must be able to hit `spaceship`.
  if (ignoreIds?.has(entry.id)) return false;
  if (isDockingBay(entry.id)) return false;
  if (entry.physicalCollision === false) return false;
  return true;
}

/**
 * Segment vs sphere. Returns parametric t in [0, 1] or null.
 * Sphere is expanded by `radiusPad` (bullet radius).
 */
function segmentSphereT(
  from: THREE.Vector3,
  to: THREE.Vector3,
  center: THREE.Vector3,
  radius: number
): number | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const fx = from.x - center.x;
  const fy = from.y - center.y;
  const fz = from.z - center.z;
  const a = dx * dx + dy * dy + dz * dz;
  if (a < 1e-12) {
    // Degenerate segment — point test.
    const distSq = fx * fx + fy * fy + fz * fz;
    return distSq <= radius * radius ? 0 : null;
  }
  const b = 2 * (fx * dx + fy * dy + fz * dz);
  const c = fx * fx + fy * fy + fz * fz - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sqrt = Math.sqrt(disc);
  const t0 = (-b - sqrt) / (2 * a);
  const t1 = (-b + sqrt) / (2 * a);
  if (t0 >= 0 && t0 <= 1) return t0;
  if (t1 >= 0 && t1 <= 1) return t1;
  // Started already inside — report entry at start.
  if (c <= 0) return 0;
  return null;
}

/** Slab segment vs AABB in local space. halfExtents expanded by radiusPad. */
function segmentAabbT(
  from: THREE.Vector3,
  to: THREE.Vector3,
  half: THREE.Vector3,
  radiusPad: number
): number | null {
  const hx = half.x + radiusPad;
  const hy = half.y + radiusPad;
  const hz = half.z + radiusPad;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;

  let tMin = 0;
  let tMax = 1;

  const axes: Array<[number, number, number]> = [
    [from.x, dx, hx],
    [from.y, dy, hy],
    [from.z, dz, hz],
  ];

  for (let i = 0; i < 3; i++) {
    const [o, d, h] = axes[i]!;
    if (Math.abs(d) < 1e-12) {
      if (o < -h || o > h) return null;
      continue;
    }
    const inv = 1 / d;
    let t1 = (-h - o) * inv;
    let t2 = (h - o) * inv;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }

  return tMin;
}

function closestPointsOnSegments(
  p1: THREE.Vector3,
  q1: THREE.Vector3,
  p2: THREE.Vector3,
  q2: THREE.Vector3,
  outOn1: THREE.Vector3,
  outOn2: THREE.Vector3
): void {
  _ab.subVectors(q1, p1);
  _d2.subVectors(q2, p2);
  _r.subVectors(p1, p2);
  const a = _ab.lengthSq();
  const e = _d2.lengthSq();
  const f = _d2.dot(_r);
  let s: number;
  let t: number;

  if (a <= 1e-12 && e <= 1e-12) {
    outOn1.copy(p1);
    outOn2.copy(p2);
    return;
  }
  if (a <= 1e-12) {
    s = 0;
    t = THREE.MathUtils.clamp(f / e, 0, 1);
  } else {
    const c = _ab.dot(_r);
    if (e <= 1e-12) {
      t = 0;
      s = THREE.MathUtils.clamp(-c / a, 0, 1);
    } else {
      const b = _ab.dot(_d2);
      const denom = a * e - b * b;
      s = denom !== 0 ? THREE.MathUtils.clamp((b * f - c * e) / denom, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = THREE.MathUtils.clamp(-c / a, 0, 1);
      } else if (t > 1) {
        t = 1;
        s = THREE.MathUtils.clamp((b - c) / a, 0, 1);
      }
    }
  }
  outOn1.copy(p1).addScaledVector(_ab, s);
  outOn2.copy(p2).addScaledVector(_d2, t);
}

function testShape(
  from: THREE.Vector3,
  to: THREE.Vector3,
  entry: CollidableEntry,
  shape: ColliderShape,
  radiusPad: number,
  out: { t: number; point: THREE.Vector3; normal: THREE.Vector3 }
): boolean {
  entry.getWorldPosition(_pos);

  if (shape.type === 'sphere') {
    const t = segmentSphereT(from, to, _pos, shape.radius + radiusPad);
    if (t === null) return false;
    out.t = t;
    out.point.lerpVectors(from, to, t);
    out.normal.subVectors(out.point, _pos);
    if (out.normal.lengthSq() < 1e-10) {
      _dir.subVectors(to, from);
      if (_dir.lengthSq() > 1e-10) out.normal.copy(_dir).normalize();
      else out.normal.set(0, 1, 0);
    } else {
      out.normal.normalize();
    }
    return true;
  }

  if (shape.type === 'box') {
    if (entry.getWorldQuaternion) entry.getWorldQuaternion(_quat);
    else _quat.identity();
    _invQuat.copy(_quat).invert();
    _fromLocal.copy(from).sub(_pos).applyQuaternion(_invQuat);
    _toLocal.copy(to).sub(_pos).applyQuaternion(_invQuat);
    const t = segmentAabbT(_fromLocal, _toLocal, shape.halfExtents, radiusPad);
    if (t === null) return false;
    out.t = t;
    out.point.lerpVectors(from, to, t);
    // Approximate outward normal from closest face in local space.
    _closest.copy(_fromLocal).lerp(_toLocal, t);
    const ax = Math.abs(_closest.x) / Math.max(shape.halfExtents.x, 1e-6);
    const ay = Math.abs(_closest.y) / Math.max(shape.halfExtents.y, 1e-6);
    const az = Math.abs(_closest.z) / Math.max(shape.halfExtents.z, 1e-6);
    if (ax >= ay && ax >= az) _normal.set(Math.sign(_closest.x) || 1, 0, 0);
    else if (ay >= az) _normal.set(0, Math.sign(_closest.y) || 1, 0);
    else _normal.set(0, 0, Math.sign(_closest.z) || 1);
    out.normal.copy(_normal).applyQuaternion(_quat).normalize();
    return true;
  }

  // Capsule: segment vs finite capsule segment, expanded by radii.
  if (entry.getWorldQuaternion) entry.getWorldQuaternion(_quat);
  else _quat.identity();
  const halfH = shape.height * 0.5;
  _up.set(0, 1, 0).applyQuaternion(_quat);
  _capsuleA.copy(_pos).addScaledVector(_up, -halfH);
  _capsuleB.copy(_pos).addScaledVector(_up, halfH);
  closestPointsOnSegments(from, to, _capsuleA, _capsuleB, _point, _closest);
  const hitRadius = shape.radius + radiusPad;
  const distSq = _point.distanceToSquared(_closest);
  if (distSq > hitRadius * hitRadius) return false;

  // Parametric t along bullet segment.
  _dir.subVectors(to, from);
  const lenSq = _dir.lengthSq();
  const t =
    lenSq > 1e-12
      ? THREE.MathUtils.clamp(_dir.dot(_ac.subVectors(_point, from)) / lenSq, 0, 1)
      : 0;
  out.t = t;
  out.point.lerpVectors(from, to, t);
  out.normal.subVectors(out.point, _closest);
  if (out.normal.lengthSq() < 1e-10) out.normal.copy(_up);
  else out.normal.normalize();
  return true;
}

export interface QuerySegmentCollidableOptions {
  /** Extra radius around the bullet path (world units). */
  radiusPad?: number;
  /** Collidable ids to skip (e.g. the firing ship). */
  ignoreIds?: ReadonlySet<string>;
  /** Optional reusable result vectors to avoid allocations. */
  hitPoint?: THREE.Vector3;
  hitNormal?: THREE.Vector3;
  /** Prefetched registry snapshot (avoids Array.from per bullet). */
  collidables?: CollidableEntry[];
}

/**
 * Swept segment vs all physical collidables. Returns the earliest hit, or null.
 * Bullets stay as lightweight pool entries — no registry / physics bodies needed.
 */
export function querySegmentCollidableHit(
  from: THREE.Vector3,
  to: THREE.Vector3,
  options: QuerySegmentCollidableOptions = {}
): SegmentHit | null {
  const radiusPad = options.radiusPad ?? 0;
  const ignoreIds = options.ignoreIds;
  let bestT = Infinity;
  let best: CollidableEntry | null = null;
  const scratchPoint = options.hitPoint ?? _hitPointOut;
  const scratchNormal = options.hitNormal ?? _hitNormalOut;
  const cand = { t: 0, point: _candPoint, normal: _candNormal };
  const list = options.collidables ?? getCollidables();

  for (const entry of list) {
    if (!shouldTestCollidable(entry, ignoreIds)) continue;
    if (!testShape(from, to, entry, entry.shape, radiusPad, cand)) continue;
    if (cand.t < bestT) {
      bestT = cand.t;
      best = entry;
      scratchPoint.copy(cand.point);
      scratchNormal.copy(cand.normal);
    }
  }

  if (!best) return null;
  return {
    collidable: best,
    point: scratchPoint,
    normal: scratchNormal,
    t: bestT,
  };
}
