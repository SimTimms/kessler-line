import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { laserAimRef } from '../../context/LaserAim';
import { shipVelocity, drainPower } from '../../context/ShipState';
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
} from '../../config/combatConfig';

const KEY_FIRE = 'KeyG';

// Module-level scratch to avoid per-frame allocations.
const _shipWorld = new THREE.Vector3();
const _headColor = new THREE.Color();

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

interface PlayerBulletsProps {
  shipGroupRef: { current: THREE.Group | null };
}

export default function PlayerBullets({ shipGroupRef }: PlayerBulletsProps) {
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

  function spawnBullet() {
    if (!laserAimRef.valid) return;

    // Aim direction with a touch of random spread.
    const dx = laserAimRef.direction.x + (Math.random() - 0.5) * CANNON_SPREAD;
    const dy = laserAimRef.direction.y + (Math.random() - 0.5) * CANNON_SPREAD;
    const dz = laserAimRef.direction.z + (Math.random() - 0.5) * CANNON_SPREAD;
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
    b.px = laserAimRef.origin.x;
    b.py = laserAimRef.origin.y;
    b.pz = laserAimRef.origin.z;
    // Inherit ship velocity so bullets keep pace with the moving ship.
    b.vx = ux * CANNON_BULLET_SPEED + shipVelocity.x;
    b.vy = uy * CANNON_BULLET_SPEED + shipVelocity.y;
    b.vz = uz * CANNON_BULLET_SPEED + shipVelocity.z;
    // Tracer is drawn along the muzzle direction (ship frame), not world velocity.
    b.fdx = ux;
    b.fdy = uy;
    b.fdz = uz;
  }

  useFrame((_, delta) => {
    const ship = shipGroupRef.current;
    if (!ship || !anchorRef.current || !headGeoRef.current || !tracerGeoRef.current) return;

    // Keep the render anchor on the ship so buffer offsets stay small/precise.
    ship.getWorldPosition(_shipWorld);
    anchorRef.current.position.copy(_shipWorld);

    // Spawn while the trigger is held.
    if (firing.current) {
      fireAccum.current += CANNON_FIRE_RATE * delta;
      const count = Math.floor(fireAccum.current);
      fireAccum.current -= count;
      for (let i = 0; i < count; i++) spawnBullet();
      drainPower(CANNON_POWER_DRAIN * delta);
    } else {
      fireAccum.current = 0;
    }

    _headColor.set(CANNON_BULLET_COLOR);

    for (let i = 0; i < CANNON_MAX_BULLETS; i++) {
      const b = pool.current[i];
      const h = i * 3;
      const t = i * 6;

      if (!b.active) {
        headCol[h] = headCol[h + 1] = headCol[h + 2] = 0;
        tracerCol[t] = tracerCol[t + 1] = tracerCol[t + 2] = 0;
        tracerCol[t + 3] = tracerCol[t + 4] = tracerCol[t + 5] = 0;
        continue;
      }

      b.age += delta;
      if (b.age >= b.maxAge) {
        b.active = false;
        headCol[h] = headCol[h + 1] = headCol[h + 2] = 0;
        tracerCol[t] = tracerCol[t + 1] = tracerCol[t + 2] = 0;
        tracerCol[t + 3] = tracerCol[t + 4] = tracerCol[t + 5] = 0;
        continue;
      }

      // Integrate world-space motion (full double precision).
      b.px += b.vx * delta;
      b.py += b.vy * delta;
      b.pz += b.vz * delta;

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
        />
      </points>
    </group>
  );
}
