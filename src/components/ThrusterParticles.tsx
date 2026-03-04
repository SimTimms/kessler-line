import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { thrustMultiplier } from './Spaceship';
import {
  mobileThrustForward,
  mobileThrustReverse,
  mobileThrustLeft,
  mobileThrustRight,
  mobileThrustStrafeLeft,
  mobileThrustStrafeRight,
} from '../context/ShipState';

const EMIT_RATE = 900; // particles per second per emitter
const BASE_LIFETIME = 0.15; // seconds — short, intense burn (jittered ±30%)
const BASE_SPEED = 102; // world units/second (jittered ±30%)

// ── Main engine emitters (two front nozzles — reverse thrust) ────────────
// Spaced apart on the X axis; tune offsets to match model nozzle positions.
const MAIN_MAX = 250;
const MAIN_EMITTERS = {
  reverseA: {
    localPos: new THREE.Vector3(-2.5, 2.5, -9.5),
    localDir: new THREE.Vector3(0, 0, -1),
  },
  reverseB: { localPos: new THREE.Vector3(2.5, 2.5, -9.5), localDir: new THREE.Vector3(0, 0, -1) },
} as const;
type MainKey = keyof typeof MAIN_EMITTERS;

// ── RCS emitters (maneuvering thrusters) ─────────────────────────────────
const RCS_MAX = 200;
const RCS_EMITTERS = {
  forward: { localPos: new THREE.Vector3(0, -2, 9.5), localDir: new THREE.Vector3(0, 0, 1) },
  left: { localPos: new THREE.Vector3(1.5, 0, 0), localDir: new THREE.Vector3(1, 0, 0) },
  right: { localPos: new THREE.Vector3(-1.5, 0, 0), localDir: new THREE.Vector3(-1, 0, 0) },
  strafeLeft: { localPos: new THREE.Vector3(2.0, 0, 1.0), localDir: new THREE.Vector3(1, 0, 0) },
  strafeRight: { localPos: new THREE.Vector3(-2.0, 0, 1.0), localDir: new THREE.Vector3(-1, 0, 0) },
} as const;
type RcsKey = keyof typeof RCS_EMITTERS;

// Module-level reusable vectors — avoid per-frame GC
const _worldPos = new THREE.Vector3();
const _worldDir = new THREE.Vector3();

type Particle = {
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

function makePool(count: number): Particle[] {
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

interface ThrusterParticlesProps {
  shipGroupRef: { current: THREE.Group };
  thrustForward: { current: boolean };
  thrustReverse: { current: boolean };
  thrustLeft: { current: boolean };
  thrustRight: { current: boolean };
  thrustStrafeLeft: { current: boolean };
  thrustStrafeRight: { current: boolean };
}

export default function ThrusterParticles({
  shipGroupRef,
  thrustForward,
  thrustReverse,
  thrustLeft,
  thrustRight,
  thrustStrafeLeft,
  thrustStrafeRight,
}: ThrusterParticlesProps) {
  // ── Material refs (for per-frame size updates) ───────────────────────────
  const mainMatRef = useRef<THREE.PointsMaterial>(null!);
  const rcsMatRef = useRef<THREE.PointsMaterial>(null!);

  // ── Main engine buffers ──────────────────────────────────────────────────
  const mainGeoRef = useRef<THREE.BufferGeometry>(null!);
  const mainPos = useMemo(() => new Float32Array(MAIN_MAX * 3), []);
  const mainCol = useMemo(() => new Float32Array(MAIN_MAX * 3), []);
  const mainPool = useRef<Particle[]>(makePool(MAIN_MAX));
  const mainSlot = useRef(0);
  const mainAccum = useRef<Record<MainKey, number>>({ reverseA: 0, reverseB: 0 });

  // ── RCS buffers ──────────────────────────────────────────────────────────
  const rcsGeoRef = useRef<THREE.BufferGeometry>(null!);
  const rcsPos = useMemo(() => new Float32Array(RCS_MAX * 3), []);
  const rcsCol = useMemo(() => new Float32Array(RCS_MAX * 3), []);
  const rcsPool = useRef<Particle[]>(makePool(RCS_MAX));
  const rcsSlot = useRef(0);
  const rcsAccum = useRef<Record<RcsKey, number>>({
    forward: 0,
    left: 0,
    right: 0,
    strafeLeft: 0,
    strafeRight: 0,
  });

  function spawnInto(
    emitters: typeof MAIN_EMITTERS | typeof RCS_EMITTERS,
    key: MainKey | RcsKey,
    pool: Particle[],
    maxCount: number,
    slotRef: { current: number },
    multiplier: number
  ) {
    const ship = shipGroupRef.current;
    const { localPos, localDir } = (
      emitters as Record<string, { localPos: THREE.Vector3; localDir: THREE.Vector3 }>
    )[key];

    _worldPos.copy(localPos).applyMatrix4(ship.matrixWorld);
    _worldDir.copy(localDir).transformDirection(ship.matrixWorld);

    _worldDir.x += (Math.random() - 0.5) * 0.07;
    _worldDir.y += (Math.random() - 0.5) * 0.07;
    _worldDir.z += (Math.random() - 0.5) * 0.07;
    _worldDir.normalize();

    const speed = BASE_SPEED * multiplier * (0.7 + Math.random() * 0.6);
    const lifetime = BASE_LIFETIME * Math.sqrt(multiplier) * (0.7 + Math.random() * 0.6);

    const idx = slotRef.current;
    slotRef.current = (idx + 1) % maxCount;

    const p = pool[idx];
    p.active = true;
    p.age = 0;
    p.maxAge = lifetime;
    p.px = _worldPos.x;
    p.py = _worldPos.y;
    p.pz = _worldPos.z;
    p.vx = _worldDir.x * speed;
    p.vy = _worldDir.y * speed;
    p.vz = _worldDir.z * speed;
  }

  function tickPool(
    pool: Particle[],
    maxCount: number,
    positions: Float32Array,
    colors: Float32Array,
    delta: number,
    geoRef: { current: THREE.BufferGeometry }
  ) {
    for (let i = 0; i < maxCount; i++) {
      const p = pool[i];

      if (!p.active) {
        colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = 0;
        positions[i * 3] = positions[i * 3 + 1] = positions[i * 3 + 2] = 0;
        continue;
      }

      p.age += delta;
      if (p.age >= p.maxAge) {
        p.active = false;
        colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = 0;
        positions[i * 3] = positions[i * 3 + 1] = positions[i * 3 + 2] = 0;
        continue;
      }

      p.px += p.vx * delta;
      p.py += p.vy * delta;
      p.pz += p.vz * delta;
      positions[i * 3] = p.px;
      positions[i * 3 + 1] = p.py;
      positions[i * 3 + 2] = p.pz;

      // Color: white-hot at birth → light blue → fades to black
      const t = p.age / p.maxAge;
      const brightness = Math.pow(1 - t, 0.7);
      colors[i * 3] = brightness * Math.max(0, 1 - t * 2.5); // r: fades first
      colors[i * 3 + 1] = brightness * Math.max(0.45, 1 - t * 0.9); // g: stays high → light blue
      colors[i * 3 + 2] = brightness; // b: stays longest
    }

    if (!geoRef.current) return;
    (geoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geoRef.current.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  useFrame((_, delta) => {
    const m = thrustMultiplier.current;
    const emitRate = EMIT_RATE * Math.sqrt(m);

    // Main engines — both nozzles fire together on reverse thrust
    if (thrustReverse.current || mobileThrustReverse.current) {
      for (const key of ['reverseA', 'reverseB'] as MainKey[]) {
        mainAccum.current[key] += emitRate * delta;
        const count = Math.floor(mainAccum.current[key]);
        mainAccum.current[key] -= count;
        for (let i = 0; i < count; i++)
          spawnInto(MAIN_EMITTERS, key, mainPool.current, MAIN_MAX, mainSlot, m);
      }
    } else {
      mainAccum.current.reverseA = mainAccum.current.reverseB = 0;
    }

    // RCS thrusters — combine keyboard + mobile inputs
    const combined = (a: { current: boolean }, b: { current: boolean }) =>
      ({ current: a.current || b.current }) as { current: boolean };
    const rcsInputs: [RcsKey, { current: boolean }][] = [
      ['forward',     combined(thrustForward,    mobileThrustForward)],
      ['left',        combined(thrustLeft,        mobileThrustLeft)],
      ['right',       combined(thrustRight,       mobileThrustRight)],
      ['strafeLeft',  combined(thrustStrafeLeft,  mobileThrustStrafeLeft)],
      ['strafeRight', combined(thrustStrafeRight, mobileThrustStrafeRight)],
    ];
    for (const [key, ref] of rcsInputs) {
      if (ref.current) {
        rcsAccum.current[key] += emitRate * delta;
        const count = Math.floor(rcsAccum.current[key]);
        rcsAccum.current[key] -= count;
        for (let i = 0; i < count; i++)
          spawnInto(RCS_EMITTERS, key, rcsPool.current, RCS_MAX, rcsSlot, m);
      } else {
        rcsAccum.current[key] = 0;
      }
    }

    // Scale point size with sqrt(multiplier) so particles visually swell at high thrust
    if (mainMatRef.current) mainMatRef.current.size = 1.4 * Math.sqrt(m);
    if (rcsMatRef.current) rcsMatRef.current.size = 0.18 * Math.sqrt(m);

    tickPool(mainPool.current, MAIN_MAX, mainPos, mainCol, delta, mainGeoRef);
    tickPool(rcsPool.current, RCS_MAX, rcsPos, rcsCol, delta, rcsGeoRef);
  });

  const sharedMatProps = {
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true,
  } as const;

  return (
    <>
      {/* Main engines — two larger nozzles */}
      <points frustumCulled={false}>
        <bufferGeometry ref={mainGeoRef}>
          <bufferAttribute attach="attributes-position" args={[mainPos, 3]} />
          <bufferAttribute attach="attributes-color" args={[mainCol, 3]} />
        </bufferGeometry>
        <pointsMaterial ref={mainMatRef} size={1.4} {...sharedMatProps} />
      </points>

      {/* RCS maneuvering thrusters — smaller */}
      <points frustumCulled={false}>
        <bufferGeometry ref={rcsGeoRef}>
          <bufferAttribute attach="attributes-position" args={[rcsPos, 3]} />
          <bufferAttribute attach="attributes-color" args={[rcsCol, 3]} />
        </bufferGeometry>
        <pointsMaterial ref={rcsMatRef} size={0.18} {...sharedMatProps} />
      </points>
    </>
  );
}
