import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { laserAimRef } from '../../context/LaserAim';
import { shipVelocity, drainPower, tryConsumeAmmo, ammo } from '../../context/ShipState';
import { playCannonShotSound } from '../../sound/SoundManager';
import {
  CANNON_MAX_BULLETS,
  CANNON_FIRE_RATE,
  CANNON_BULLET_SPEED,
  CANNON_BULLET_LIFETIME,
  CANNON_BULLET_SIZE,
  CANNON_TRACER_LENGTH,
  CANNON_SPREAD,
  CANNON_BULLET_COLOR,
  CANNON_POWER_DRAIN,
  CANNON_BULLET_HIT_RADIUS,
  CANNON_AIM_OFF_PLANE_Y,
  EVENT_CANNON_BULLET_HIT,
  PLAYER_SHIP_GUNS,
  type ShipGunMountConfig,
} from '../../config/combatConfig';
import { querySegmentCollidableHit } from '../../utils/collidableSegmentHit';
import { getCollidables } from '../../context/CollisionRegistry';
import CannonHitSparks from './CannonHitSparks';

const KEY_FIRE = 'KeyG';

// Module-level scratch to avoid per-frame allocations.
const _shipWorld = new THREE.Vector3();
const _headColor = new THREE.Color();
const _from = new THREE.Vector3();
const _to = new THREE.Vector3();
const _hitPoint = new THREE.Vector3();
const _hitNormal = new THREE.Vector3();
const _aimDir = new THREE.Vector3();
const _gunForward = new THREE.Vector3();
const _localForward = new THREE.Vector3();
const _muzzleLocal = new THREE.Vector3();
const _muzzleWorld = new THREE.Vector3();

/**
 * Aim muzzle → published cursor target. Horizontal (dir.y = 0) unless that
 * target sits off world Y = 0 (e.g. an elevated / sunken collidable).
 */
function resolveCannonAimDirection(
  origin: THREE.Vector3,
  target: THREE.Vector3,
  out: THREE.Vector3
): THREE.Vector3 {
  if (Math.abs(target.y) >= CANNON_AIM_OFF_PLANE_Y) {
    out.subVectors(target, origin);
    if (out.lengthSq() > 1e-12) return out.normalize();
  }

  // Flatten onto the horizontal plane through the muzzle.
  out.set(target.x - origin.x, 0, target.z - origin.z);
  if (out.lengthSq() < 1e-12) {
    out.set(0, 0, -1);
  }
  return out.normalize();
}

/**
 * Clamp a world aim direction into this gun's yaw (and optional pitch) arc
 * about the mount's forward vector.
 */
function clampAimToGunArc(
  desired: THREE.Vector3,
  gunForwardWorld: THREE.Vector3,
  gun: ShipGunMountConfig,
  out: THREE.Vector3
): THREE.Vector3 {
  const yawHalf = THREE.MathUtils.degToRad(gun.yawHalfArcDeg);
  const fLen = Math.hypot(gunForwardWorld.x, gunForwardWorld.z);
  const fx = fLen > 1e-8 ? gunForwardWorld.x / fLen : 0;
  const fz = fLen > 1e-8 ? gunForwardWorld.z / fLen : 1;

  const dHoriz = Math.hypot(desired.x, desired.z);
  const dx = dHoriz > 1e-8 ? desired.x / dHoriz : fx;
  const dz = dHoriz > 1e-8 ? desired.z / dHoriz : fz;

  const dot = fx * dx + fz * dz;
  const cross = fx * dz - fz * dx;
  const yaw = THREE.MathUtils.clamp(Math.atan2(cross, dot), -yawHalf, yawHalf);

  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const rx = fx * cos - fz * sin;
  const rz = fx * sin + fz * cos;

  const desiredLen = desired.length() || 1;
  let elev = Math.asin(THREE.MathUtils.clamp(desired.y / desiredLen, -1, 1));
  if (gun.pitchHalfArcDeg !== undefined) {
    const pitchHalf = THREE.MathUtils.degToRad(gun.pitchHalfArcDeg);
    elev = THREE.MathUtils.clamp(elev, -pitchHalf, pitchHalf);
  }

  const ce = Math.cos(elev);
  out.set(rx * ce, Math.sin(elev), rz * ce);
  if (out.lengthSq() < 1e-12) out.set(fx, 0, fz);
  return out.normalize();
}

/**
 * Each bullet stores its full-precision world-space position/velocity (JS doubles),
 * plus the muzzle direction in the *ship frame* (used to draw the tracer streak so it
 * reads correctly under the chase camera regardless of ship velocity).
 */
type Bullet = {
  active: boolean;
  age: number;
  maxAge: number;
  // world-space position (double precision)
  px: number;
  py: number;
  pz: number;
  // world-space velocity (muzzle dir * speed + ship velocity at spawn)
  vx: number;
  vy: number;
  vz: number;
  // muzzle direction, unit, ship frame (for tracer tail)
  fdx: number;
  fdy: number;
  fdz: number;
};

function makePool(count: number): Bullet[] {
  return Array.from({ length: count }, () => ({
    active: false,
    age: 0,
    maxAge: 0,
    px: 0,
    py: 0,
    pz: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    fdx: 0,
    fdy: 0,
    fdz: 1,
  }));
}

function deactivateBullet(
  b: Bullet,
  headPos: Float32Array,
  headCol: Float32Array,
  tracerPos: Float32Array,
  tracerCol: Float32Array,
  i: number
): void {
  b.active = false;
  b.age = 0;
  b.maxAge = 0;
  b.px = b.py = b.pz = 0;
  b.vx = b.vy = b.vz = 0;
  b.fdx = b.fdy = 0;
  b.fdz = 1;

  const h = i * 3;
  const t = i * 6;
  // Park geometry on the ship anchor so bloom / additive blending can't leave residue.
  headPos[h] = headPos[h + 1] = headPos[h + 2] = 0;
  headCol[h] = headCol[h + 1] = headCol[h + 2] = 0;
  tracerPos[t] = tracerPos[t + 1] = tracerPos[t + 2] = 0;
  tracerPos[t + 3] = tracerPos[t + 4] = tracerPos[t + 5] = 0;
  tracerCol[t] = tracerCol[t + 1] = tracerCol[t + 2] = 0;
  tracerCol[t + 3] = tracerCol[t + 4] = tracerCol[t + 5] = 0;
}

interface PlayerBulletsProps {
  shipGroupRef: { current: THREE.Group | null };
  /** Hardpoints that fire; defaults to the twin machine guns. Shots alternate across mounts. */
  guns?: readonly ShipGunMountConfig[];
}

export default function PlayerBullets({
  shipGroupRef,
  guns = PLAYER_SHIP_GUNS,
}: PlayerBulletsProps) {
  // Anchor group is repositioned to the ship's world position every frame, so the geometry
  // buffers only ever hold small offsets — avoiding float32 jitter at huge world coordinates.
  const anchorRef = useRef<THREE.Group>(null!);

  const headGeoRef = useRef<THREE.BufferGeometry>(null!);
  const tracerGeoRef = useRef<THREE.BufferGeometry>(null!);

  // Bullet heads: one point per bullet.
  const headPos = useMemo(() => new Float32Array(CANNON_MAX_BULLETS * 3), []);
  const headCol = useMemo(() => new Float32Array(CANNON_MAX_BULLETS * 3), []);
  // Tracers: two vertices (tail, head) per bullet.
  const tracerPos = useMemo(() => new Float32Array(CANNON_MAX_BULLETS * 6), []);
  const tracerCol = useMemo(() => new Float32Array(CANNON_MAX_BULLETS * 6), []);

  const pool = useRef<Bullet[]>(makePool(CANNON_MAX_BULLETS));
  const slot = useRef(0);
  const fireAccum = useRef(0);
  const firing = useRef(false);
  const gunCycle = useRef(0);

  // Soft radial sprite for the glowing bullet head.
  const sprite = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 1, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.7)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }, []);

  // Trigger: hold "G" to fire.
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === KEY_FIRE) firing.current = true;
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === KEY_FIRE) firing.current = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  function spawnBullet(ship: THREE.Group, gun: ShipGunMountConfig): boolean {
    if (!laserAimRef.valid) return false;
    if (!tryConsumeAmmo(1)) return false;

    const [mx, my, mz] = gun.muzzleLocal ?? [0, 0, 0];
    _muzzleLocal.set(mx, my, mz);
    _muzzleWorld.copy(_muzzleLocal).applyMatrix4(ship.matrixWorld);

    resolveCannonAimDirection(_muzzleWorld, laserAimRef.target, _aimDir);

    const [flx, fly, flz] = gun.forwardLocal ?? [0, 0, -1];
    _localForward.set(flx, fly, flz);
    _gunForward.copy(_localForward).applyQuaternion(ship.quaternion).normalize();
    clampAimToGunArc(_aimDir, _gunForward, gun, _aimDir);

    // Aim direction with a touch of random spread (spread on flattened / hit aim).
    const dx = _aimDir.x + (Math.random() - 0.5) * CANNON_SPREAD;
    const dy = _aimDir.y + (Math.random() - 0.5) * CANNON_SPREAD;
    const dz = _aimDir.z + (Math.random() - 0.5) * CANNON_SPREAD;
    const len = Math.hypot(dx, dy, dz) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const uz = dz / len;

    const idx = slot.current;
    slot.current = (idx + 1) % CANNON_MAX_BULLETS;
    const b = pool.current[idx];

    b.active = true;
    b.age = 0;
    b.maxAge = CANNON_BULLET_LIFETIME;
    b.px = _muzzleWorld.x;
    b.py = _muzzleWorld.y;
    b.pz = _muzzleWorld.z;
    // Inherit ship velocity so bullets keep pace with the moving ship.
    b.vx = ux * CANNON_BULLET_SPEED + shipVelocity.x;
    b.vy = uy * CANNON_BULLET_SPEED + shipVelocity.y;
    b.vz = uz * CANNON_BULLET_SPEED + shipVelocity.z;
    // Tracer is drawn along the muzzle direction (ship frame), not world velocity.
    b.fdx = ux;
    b.fdy = uy;
    b.fdz = uz;

    playCannonShotSound();
    return true;
  }

  useFrame((_, delta) => {
    const ship = shipGroupRef.current;
    if (!ship || !anchorRef.current || !headGeoRef.current || !tracerGeoRef.current) return;

    // Keep the render anchor on the ship so buffer offsets stay small/precise.
    ship.getWorldPosition(_shipWorld);
    anchorRef.current.position.copy(_shipWorld);

    // Spawn while the trigger is held (no power drain on empty magazine).
    // Shots alternate left ↔ right across PLAYER_SHIP_GUNS.
    if (firing.current && ammo > 0 && guns.length > 0) {
      fireAccum.current += CANNON_FIRE_RATE * delta;
      const count = Math.floor(fireAccum.current);
      fireAccum.current -= count;
      for (let i = 0; i < count; i++) {
        const gun = guns[gunCycle.current % guns.length]!;
        if (!spawnBullet(ship, gun)) break;
        gunCycle.current = (gunCycle.current + 1) % guns.length;
      }
      drainPower(CANNON_POWER_DRAIN * delta);
    } else {
      fireAccum.current = 0;
    }

    _headColor.set(CANNON_BULLET_COLOR);
    // One registry snapshot for the whole frame — bullets do not register as collidables.
    const collidables = getCollidables();

    for (let i = 0; i < CANNON_MAX_BULLETS; i++) {
      const b = pool.current[i];
      const h = i * 3;
      const t = i * 6;

      if (!b.active) {
        headPos[h] = headPos[h + 1] = headPos[h + 2] = 0;
        headCol[h] = headCol[h + 1] = headCol[h + 2] = 0;
        tracerPos[t] = tracerPos[t + 1] = tracerPos[t + 2] = 0;
        tracerPos[t + 3] = tracerPos[t + 4] = tracerPos[t + 5] = 0;
        tracerCol[t] = tracerCol[t + 1] = tracerCol[t + 2] = 0;
        tracerCol[t + 3] = tracerCol[t + 4] = tracerCol[t + 5] = 0;
        continue;
      }

      b.age += delta;
      if (b.age >= b.maxAge) {
        deactivateBullet(b, headPos, headCol, tracerPos, tracerCol, i);
        continue;
      }

      // Swept hit test: previous position → integrated position against registry meshes.
      _from.set(b.px, b.py, b.pz);
      b.px += b.vx * delta;
      b.py += b.vy * delta;
      b.pz += b.vz * delta;
      _to.set(b.px, b.py, b.pz);

      const hit = querySegmentCollidableHit(_from, _to, {
        radiusPad: CANNON_BULLET_HIT_RADIUS,
        hitPoint: _hitPoint,
        hitNormal: _hitNormal,
        collidables,
      });

      if (hit) {
        window.dispatchEvent(
          new CustomEvent(EVENT_CANNON_BULLET_HIT, {
            detail: {
              collidableId: hit.collidable.id,
              label: hit.collidable.label,
              point: { x: hit.point.x, y: hit.point.y, z: hit.point.z },
              normal: { x: hit.normal.x, y: hit.normal.y, z: hit.normal.z },
              velocity: { x: b.vx, y: b.vy, z: b.vz },
            },
          })
        );

        deactivateBullet(b, headPos, headCol, tracerPos, tracerCol, i);
        continue;
      }

      // Offset relative to the ship anchor → small values for the float32 buffer.
      const ox = b.px - _shipWorld.x;
      const oy = b.py - _shipWorld.y;
      const oz = b.pz - _shipWorld.z;

      // Head point.
      headPos[h] = ox;
      headPos[h + 1] = oy;
      headPos[h + 2] = oz;

      // Tracer: tail behind the head along the muzzle direction.
      tracerPos[t] = ox - b.fdx * CANNON_TRACER_LENGTH;
      tracerPos[t + 1] = oy - b.fdy * CANNON_TRACER_LENGTH;
      tracerPos[t + 2] = oz - b.fdz * CANNON_TRACER_LENGTH;
      tracerPos[t + 3] = ox;
      tracerPos[t + 4] = oy;
      tracerPos[t + 5] = oz;

      // Fade out over the final 30% of life.
      const lifeT = b.age / b.maxAge;
      const fade = lifeT < 0.7 ? 1 : 1 - (lifeT - 0.7) / 0.3;
      const r = _headColor.r * fade;
      const g = _headColor.g * fade;
      const bl = _headColor.b * fade;

      headCol[h] = r;
      headCol[h + 1] = g;
      headCol[h + 2] = bl;

      // Tail vertex is black (additive → invisible) so the streak fades into nothing.
      tracerCol[t] = tracerCol[t + 1] = tracerCol[t + 2] = 0;
      tracerCol[t + 3] = r;
      tracerCol[t + 4] = g;
      tracerCol[t + 5] = bl;
    }

    (headGeoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (headGeoRef.current.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (tracerGeoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (tracerGeoRef.current.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <>
      <group ref={anchorRef}>
        {/* Tracer streaks */}
        <lineSegments frustumCulled={false}>
          <bufferGeometry ref={tracerGeoRef}>
            <bufferAttribute attach="attributes-position" args={[tracerPos, 3]} />
            <bufferAttribute attach="attributes-color" args={[tracerCol, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            vertexColors
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>

        {/* Glowing bullet heads */}
        <points frustumCulled={false}>
          <bufferGeometry ref={headGeoRef}>
            <bufferAttribute attach="attributes-position" args={[headPos, 3]} />
            <bufferAttribute attach="attributes-color" args={[headCol, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={CANNON_BULLET_SIZE}
            map={sprite}
            alphaMap={sprite}
            vertexColors
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
            alphaTest={0.02}
            toneMapped={false}
          />
        </points>
      </group>
      <CannonHitSparks />
    </>
  );
}
