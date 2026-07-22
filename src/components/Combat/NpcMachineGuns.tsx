import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CANNON_FIRE_RATE,
  CANNON_BULLET_SPEED,
  CANNON_BULLET_LIFETIME,
  CANNON_BULLET_SIZE,
  CANNON_TRACER_LENGTH,
  CANNON_SPREAD,
  CANNON_BULLET_COLOR,
  CANNON_POWER_DRAIN,
  CANNON_BULLET_HIT_RADIUS,
  EVENT_CANNON_BULLET_HIT,
  NPC_CANNON_MAX_BULLETS,
  PLAYER_SHIP_GUNS,
  type ShipGunMountConfig,
} from '../../config/combatConfig';
import { querySegmentCollidableHit } from '../../utils/collidableSegmentHit';
import { getCollidables } from '../../context/CollisionRegistry';
import { clampAimToGunArc, resolveCannonAimDirection } from './cannonAim';

type Bullet = {
  active: boolean;
  age: number;
  maxAge: number;
  px: number;
  py: number;
  pz: number;
  vx: number;
  vy: number;
  vz: number;
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
  headPos[h] = headPos[h + 1] = headPos[h + 2] = 0;
  headCol[h] = headCol[h + 1] = headCol[h + 2] = 0;
  tracerPos[t] = tracerPos[t + 1] = tracerPos[t + 2] = 0;
  tracerPos[t + 3] = tracerPos[t + 4] = tracerPos[t + 5] = 0;
  tracerCol[t] = tracerCol[t + 1] = tracerCol[t + 2] = 0;
  tracerCol[t + 3] = tracerCol[t + 4] = tracerCol[t + 5] = 0;
}

export type NpcWeaponState = {
  ammo: number;
  power: number;
};

interface NpcMachineGunsProps {
  shipGroupRef: { current: THREE.Group | null };
  /** World-space velocity of the firing NPC. */
  shipVelocityRef: { current: THREE.Vector3 };
  /** Mutable resource bag (ammo / power drained while firing). */
  resources: { current: NpcWeaponState };
  /** Aim point in world space (usually the player). */
  getAimTarget: (out: THREE.Vector3) => THREE.Vector3;
  /** When false, trigger stays off. */
  wantsFire: { current: boolean };
  /** Collidable ids to skip (the firing NPC). */
  ignoreIds: ReadonlySet<string>;
  guns?: readonly ShipGunMountConfig[];
  maxBullets?: number;
}

const _shipWorld = new THREE.Vector3();
const _aimTarget = new THREE.Vector3();
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
 * Twin machine guns for an NPC — same mounts / ballistics as the player,
 * but driven by AI trigger + aim target instead of KeyG / laserAimRef.
 */
export default function NpcMachineGuns({
  shipGroupRef,
  shipVelocityRef,
  resources,
  getAimTarget,
  wantsFire,
  ignoreIds,
  guns = PLAYER_SHIP_GUNS,
  maxBullets = NPC_CANNON_MAX_BULLETS,
}: NpcMachineGunsProps) {
  const anchorRef = useRef<THREE.Group>(null!);
  const headGeoRef = useRef<THREE.BufferGeometry>(null!);
  const tracerGeoRef = useRef<THREE.BufferGeometry>(null!);

  const headPos = useMemo(() => new Float32Array(maxBullets * 3), [maxBullets]);
  const headCol = useMemo(() => new Float32Array(maxBullets * 3), [maxBullets]);
  const tracerPos = useMemo(() => new Float32Array(maxBullets * 6), [maxBullets]);
  const tracerCol = useMemo(() => new Float32Array(maxBullets * 6), [maxBullets]);

  const pool = useRef<Bullet[]>(makePool(maxBullets));
  const slot = useRef(0);
  const fireAccum = useRef(0);
  const gunCycle = useRef(0);

  useEffect(() => {
    pool.current = makePool(maxBullets);
    slot.current = 0;
  }, [maxBullets]);

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

  function spawnBullet(ship: THREE.Group, gun: ShipGunMountConfig): boolean {
    const res = resources.current;
    if (res.ammo < 1 || res.power <= 0) return false;

    const [mx, my, mz] = gun.muzzleLocal ?? [0, 0, 0];
    _muzzleLocal.set(mx, my, mz);
    _muzzleWorld.copy(_muzzleLocal).applyMatrix4(ship.matrixWorld);

    getAimTarget(_aimTarget);
    resolveCannonAimDirection(_muzzleWorld, _aimTarget, _aimDir);

    const [flx, fly, flz] = gun.forwardLocal ?? [0, 0, -1];
    _localForward.set(flx, fly, flz);
    _gunForward.copy(_localForward).applyQuaternion(ship.quaternion).normalize();
    clampAimToGunArc(_aimDir, _gunForward, gun, _aimDir);

    const dx = _aimDir.x + (Math.random() - 0.5) * CANNON_SPREAD;
    const dy = _aimDir.y + (Math.random() - 0.5) * CANNON_SPREAD;
    const dz = _aimDir.z + (Math.random() - 0.5) * CANNON_SPREAD;
    const len = Math.hypot(dx, dy, dz) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const uz = dz / len;

    const idx = slot.current;
    slot.current = (idx + 1) % maxBullets;
    const b = pool.current[idx]!;

    b.active = true;
    b.age = 0;
    b.maxAge = CANNON_BULLET_LIFETIME;
    b.px = _muzzleWorld.x;
    b.py = _muzzleWorld.y;
    b.pz = _muzzleWorld.z;
    const vel = shipVelocityRef.current;
    b.vx = ux * CANNON_BULLET_SPEED + vel.x;
    b.vy = uy * CANNON_BULLET_SPEED + vel.y;
    b.vz = uz * CANNON_BULLET_SPEED + vel.z;
    b.fdx = ux;
    b.fdy = uy;
    b.fdz = uz;

    res.ammo -= 1;
    // No muzzle SFX — vacuum; the player only hears impacts on their own hull.
    return true;
  }

  useFrame((_, delta) => {
    const ship = shipGroupRef.current;
    if (!ship || !anchorRef.current || !headGeoRef.current || !tracerGeoRef.current) return;

    ship.getWorldPosition(_shipWorld);
    anchorRef.current.position.copy(_shipWorld);

    const res = resources.current;
    if (wantsFire.current && res.ammo > 0 && res.power > 0 && guns.length > 0) {
      fireAccum.current += CANNON_FIRE_RATE * delta;
      const count = Math.floor(fireAccum.current);
      fireAccum.current -= count;
      for (let i = 0; i < count; i++) {
        const gun = guns[gunCycle.current % guns.length]!;
        if (!spawnBullet(ship, gun)) break;
        gunCycle.current = (gunCycle.current + 1) % guns.length;
      }
      res.power = Math.max(0, res.power - CANNON_POWER_DRAIN * delta);
    } else {
      fireAccum.current = 0;
    }

    _headColor.set(CANNON_BULLET_COLOR);
    const collidables = getCollidables();

    for (let i = 0; i < maxBullets; i++) {
      const b = pool.current[i]!;
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

      _from.set(b.px, b.py, b.pz);
      b.px += b.vx * delta;
      b.py += b.vy * delta;
      b.pz += b.vz * delta;
      _to.set(b.px, b.py, b.pz);

      const hit = querySegmentCollidableHit(_from, _to, {
        radiusPad: CANNON_BULLET_HIT_RADIUS,
        ignoreIds,
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

      const ox = b.px - _shipWorld.x;
      const oy = b.py - _shipWorld.y;
      const oz = b.pz - _shipWorld.z;

      headPos[h] = ox;
      headPos[h + 1] = oy;
      headPos[h + 2] = oz;

      tracerPos[t] = ox - b.fdx * CANNON_TRACER_LENGTH;
      tracerPos[t + 1] = oy - b.fdy * CANNON_TRACER_LENGTH;
      tracerPos[t + 2] = oz - b.fdz * CANNON_TRACER_LENGTH;
      tracerPos[t + 3] = ox;
      tracerPos[t + 4] = oy;
      tracerPos[t + 5] = oz;

      const lifeT = b.age / b.maxAge;
      const fade = lifeT < 0.7 ? 1 : 1 - (lifeT - 0.7) / 0.3;
      const r = _headColor.r * fade;
      const g = _headColor.g * fade;
      const bl = _headColor.b * fade;

      headCol[h] = r;
      headCol[h + 1] = g;
      headCol[h + 2] = bl;
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
    <group ref={anchorRef}>
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
  );
}
