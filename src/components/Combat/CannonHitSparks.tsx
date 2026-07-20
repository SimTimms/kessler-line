import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shipPosRef } from '../../context/ShipPos';
import {
  CANNON_HIT_COLOR,
  CANNON_HIT_DRAG,
  CANNON_HIT_LIFETIME,
  CANNON_HIT_MAX_PARTICLES,
  CANNON_HIT_PARTICLES_PER_BURST,
  CANNON_HIT_SIZE,
  CANNON_HIT_SPEED_MAX,
  CANNON_HIT_SPEED_MIN,
  CANNON_HIT_SPREAD,
  EVENT_CANNON_BULLET_HIT,
} from '../../config/combatConfig';

type Spark = {
  active: boolean;
  age: number;
  maxAge: number;
  px: number;
  py: number;
  pz: number;
  vx: number;
  vy: number;
  vz: number;
};

type HitDetail = {
  point: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  velocity?: { x: number; y: number; z: number };
};

const _anchor = new THREE.Vector3();
const _color = new THREE.Color();
const _normal = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _bitangent = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _tmp = new THREE.Vector3();

function makePool(count: number): Spark[] {
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
  }));
}

function randomConeDirection(normal: THREE.Vector3, spread: number, out: THREE.Vector3): THREE.Vector3 {
  // Build a stable tangent frame around the surface normal.
  if (Math.abs(normal.y) < 0.9) _tmp.set(0, 1, 0);
  else _tmp.set(1, 0, 0);
  _tangent.crossVectors(normal, _tmp).normalize();
  _bitangent.crossVectors(normal, _tangent).normalize();

  const yaw = Math.random() * Math.PI * 2;
  const pitch = Math.random() * spread;
  const sp = Math.sin(pitch);
  out
    .copy(normal)
    .multiplyScalar(Math.cos(pitch))
    .addScaledVector(_tangent, Math.cos(yaw) * sp)
    .addScaledVector(_bitangent, Math.sin(yaw) * sp)
    .normalize();
  return out;
}

/**
 * Short additive spark bursts on cannon impacts.
 * Listens for {@link EVENT_CANNON_BULLET_HIT}; no physics bodies.
 */
export default function CannonHitSparks() {
  const anchorRef = useRef<THREE.Group>(null!);
  const geoRef = useRef<THREE.BufferGeometry>(null!);
  const pool = useRef(makePool(CANNON_HIT_MAX_PARTICLES));
  const slot = useRef(0);

  const positions = useMemo(() => new Float32Array(CANNON_HIT_MAX_PARTICLES * 3), []);
  const colors = useMemo(() => new Float32Array(CANNON_HIT_MAX_PARTICLES * 3), []);

  const sprite = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(16, 16, 0.5, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.75)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }, []);

  useEffect(() => {
    const onHit = (event: Event) => {
      const detail = (event as CustomEvent<HitDetail>).detail;
      if (!detail?.point || !detail.normal) return;

      _normal.set(detail.normal.x, detail.normal.y, detail.normal.z);
      if (_normal.lengthSq() < 1e-8) _normal.set(0, 1, 0);
      else _normal.normalize();

      for (let i = 0; i < CANNON_HIT_PARTICLES_PER_BURST; i++) {
        const idx = slot.current;
        slot.current = (idx + 1) % CANNON_HIT_MAX_PARTICLES;
        const s = pool.current[idx]!;

        randomConeDirection(_normal, CANNON_HIT_SPREAD, _dir);
        const speed =
          CANNON_HIT_SPEED_MIN + Math.random() * (CANNON_HIT_SPEED_MAX - CANNON_HIT_SPEED_MIN);

        // Nudge slightly off the surface so sparks aren't buried in the mesh.
        s.active = true;
        s.age = 0;
        s.maxAge = CANNON_HIT_LIFETIME * (0.7 + Math.random() * 0.5);
        s.px = detail.point.x + _normal.x * 0.4;
        s.py = detail.point.y + _normal.y * 0.4;
        s.pz = detail.point.z + _normal.z * 0.4;
        s.vx = _dir.x * speed;
        s.vy = _dir.y * speed;
        s.vz = _dir.z * speed;
      }
    };

    window.addEventListener(EVENT_CANNON_BULLET_HIT, onHit);
    return () => window.removeEventListener(EVENT_CANNON_BULLET_HIT, onHit);
  }, []);

  useFrame((_, delta) => {
    if (!anchorRef.current || !geoRef.current) return;

    _anchor.copy(shipPosRef.current);
    anchorRef.current.position.copy(_anchor);
    _color.set(CANNON_HIT_COLOR);
    const drag = Math.max(0, 1 - CANNON_HIT_DRAG * delta);

    for (let i = 0; i < CANNON_HIT_MAX_PARTICLES; i++) {
      const s = pool.current[i]!;
      const p = i * 3;

      if (!s.active) {
        positions[p] = positions[p + 1] = positions[p + 2] = 0;
        colors[p] = colors[p + 1] = colors[p + 2] = 0;
        continue;
      }

      s.age += delta;
      if (s.age >= s.maxAge) {
        s.active = false;
        s.px = s.py = s.pz = 0;
        s.vx = s.vy = s.vz = 0;
        positions[p] = positions[p + 1] = positions[p + 2] = 0;
        colors[p] = colors[p + 1] = colors[p + 2] = 0;
        continue;
      }

      s.vx *= drag;
      s.vy *= drag;
      s.vz *= drag;
      s.px += s.vx * delta;
      s.py += s.vy * delta;
      s.pz += s.vz * delta;

      positions[p] = s.px - _anchor.x;
      positions[p + 1] = s.py - _anchor.y;
      positions[p + 2] = s.pz - _anchor.z;

      const lifeT = s.age / s.maxAge;
      const fade = lifeT < 0.25 ? 1 : 1 - (lifeT - 0.25) / 0.75;
      colors[p] = _color.r * fade;
      colors[p + 1] = _color.g * fade;
      colors[p + 2] = _color.b * fade;
    }

    (geoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geoRef.current.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <group ref={anchorRef}>
      <points frustumCulled={false}>
        <bufferGeometry ref={geoRef}>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={CANNON_HIT_SIZE}
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
