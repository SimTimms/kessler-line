import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { thrustMultiplier } from './Spaceship';
import {
  cinematicThrustForward,
  cinematicThrustReverse,
  MAIN_ENGINE_LOCAL_POS,
  mainEngineDisabled,
  mobileThrustForward,
  mobileThrustReverse,
  mobileThrustLeft,
  mobileThrustRight,
  mobileThrustStrafeLeft,
  mobileThrustStrafeRight,
  shipVelocity,
} from '../../context/ShipState';
import { autopilotThrustForward, autopilotThrustReverse } from '../../context/AutopilotState';

const EMIT_RATE = 900; // particles per second per emitter
const BASE_LIFETIME = 0.1; // seconds — short, intense burn (jittered ±30%)
const BASE_SPEED = 100; // world units/second (jittered ±30%)
const TAPER_STRENGTH = 12; // how aggressively particles converge toward axis as they age

// ── Main engine emitters (two front nozzles — reverse thrust) ────────────
// Spaced apart on the X axis; tune offsets to match model nozzle positions.
const MAIN_MAX = 2200;
const MAIN_EMITTERS = {
  reverseA: {
    localPos: MAIN_ENGINE_LOCAL_POS.reverseA,
    localDir: new THREE.Vector3(0, 0, -1),
  },
  reverseB: {
    localPos: MAIN_ENGINE_LOCAL_POS.reverseB,
    localDir: new THREE.Vector3(0, 0, -1),
  },
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
  ox: number;
  oy: number;
  oz: number; // spawn origin (world space)
  dx: number;
  dy: number;
  dz: number; // emit axis direction (world space, pre-jitter)
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
    ox: 0,
    oy: 0,
    oz: 0,
    dx: 0,
    dy: 0,
    dz: 1,
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
  /** Override velocity for non-player ships (e.g. AI ships). Defaults to player shipVelocity. */
  shipVelocityRef?: { current: THREE.Vector3 };
}

export default function ThrusterParticles({
  shipGroupRef,
  thrustForward,
  thrustReverse,
  thrustLeft,
  thrustRight,
  thrustStrafeLeft,
  thrustStrafeRight,
  shipVelocityRef,
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

  const spriteTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.65)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }, []);

  function spawnInto(
    emitters: typeof MAIN_EMITTERS | typeof RCS_EMITTERS,
    key: MainKey | RcsKey,
    pool: Particle[],
    maxCount: number,
    slotRef: { current: number },
    multiplier: number,
    speedScale: number,
    inheritVelocity?: THREE.Vector3
  ) {
    const ship = shipGroupRef.current;
    const { localPos, localDir } = (
      emitters as Record<string, { localPos: THREE.Vector3; localDir: THREE.Vector3 }>
    )[key];

    _worldPos.copy(localPos).applyMatrix4(ship.matrixWorld);
    _worldDir.copy(localDir).transformDirection(ship.matrixWorld);

    // Save pre-jitter axis direction for taper convergence
    const axDx = _worldDir.x,
      axDy = _worldDir.y,
      axDz = _worldDir.z;

    _worldDir.x += (Math.random() - 0.5) * 0.07;
    _worldDir.y += (Math.random() - 0.5) * 0.07;
    _worldDir.z += (Math.random() - 0.5) * 0.07;
    _worldDir.normalize();

    const speed = BASE_SPEED * multiplier * speedScale * (0.7 + Math.random() * 0.6);
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
    p.ox = _worldPos.x;
    p.oy = _worldPos.y;
    p.oz = _worldPos.z;
    p.dx = axDx;
    p.dy = axDy;
    p.dz = axDz;
    const baseVx = _worldDir.x * speed;
    const baseVy = _worldDir.y * speed;
    const baseVz = _worldDir.z * speed;
    if (inheritVelocity) {
      p.vx = baseVx + inheritVelocity.x;
      p.vy = baseVy + inheritVelocity.y;
      p.vz = baseVz + inheritVelocity.z;
    } else {
      p.vx = baseVx;
      p.vy = baseVy;
      p.vz = baseVz;
    }
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

      // Converge toward emit axis as particle ages — radial pull proportional to age
      const taper = p.age / p.maxAge;
      const relX = p.px - p.ox,
        relY = p.py - p.oy,
        relZ = p.pz - p.oz;
      const axDot = relX * p.dx + relY * p.dy + relZ * p.dz;
      const radX = relX - p.dx * axDot;
      const radY = relY - p.dy * axDot;
      const radZ = relZ - p.dz * axDot;
      const pull = TAPER_STRENGTH * taper * delta;
      p.px -= radX * pull;
      p.py -= radY * pull;
      p.pz -= radZ * pull;

      positions[i * 3] = p.px;
      positions[i * 3 + 1] = p.py;
      positions[i * 3 + 2] = p.pz;

      // Color: white-hot at birth → light blue → purple in the last 35%
      const t = taper;
      const brightness = Math.pow(1 - t, 0.7);
      let r = brightness * Math.max(0, 1 - t * 2.5);
      let g = brightness * Math.max(0.45, 1 - t * 0.9);
      let b = brightness;
      if (t > 0.65) {
        const u = (t - 0.65) / 0.35;
        r = THREE.MathUtils.lerp(r, brightness * 0.7, u);
        g = THREE.MathUtils.lerp(g, brightness * 0.1, u);
        b = THREE.MathUtils.lerp(b, brightness, u);
      }
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    if (!geoRef.current) return;
    (geoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geoRef.current.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  useFrame((_, delta) => {
    const m = thrustMultiplier.current;
    const vel = shipVelocityRef ? shipVelocityRef.current : shipVelocity;
    const speed = vel.length();
    const speedScale = THREE.MathUtils.clamp(1 / (1 + speed / 120), 0.35, 1);
    const emitBoost = THREE.MathUtils.clamp(1 + speed / 200, 1, 3);
    const emitRate = EMIT_RATE * Math.sqrt(m) * emitBoost;

    // Main engines — both nozzles fire together on reverse thrust
    const reverseActive =
      thrustReverse.current ||
      mobileThrustReverse.current ||
      cinematicThrustReverse.current ||
      autopilotThrustReverse.current;

    if (reverseActive) {
      for (const key of ['reverseA', 'reverseB'] as MainKey[]) {
        if (mainEngineDisabled[key].current) continue;
        mainAccum.current[key] += emitRate * delta;
        const count = Math.floor(mainAccum.current[key]);
        mainAccum.current[key] -= count;
        for (let i = 0; i < count; i++)
          spawnInto(MAIN_EMITTERS, key, mainPool.current, MAIN_MAX, mainSlot, m, speedScale, vel);
      }
    } else {
      mainAccum.current.reverseA = mainAccum.current.reverseB = 0;
    }

    // RCS thrusters — combine keyboard + mobile inputs
    const combined = (a: { current: boolean }, b: { current: boolean }, c?: { current: boolean }) =>
      ({ current: a.current || b.current || c?.current }) as { current: boolean };
    const rcsInputs: [RcsKey, { current: boolean }][] = [
      [
        'forward',
        {
          current:
            thrustForward.current ||
            mobileThrustForward.current ||
            cinematicThrustForward.current ||
            autopilotThrustForward.current,
        },
      ],
      ['left', combined(thrustLeft, mobileThrustLeft)],
      ['right', combined(thrustRight, mobileThrustRight)],
      ['strafeLeft', combined(thrustStrafeLeft, mobileThrustStrafeLeft)],
      ['strafeRight', combined(thrustStrafeRight, mobileThrustStrafeRight)],
    ];
    for (const [key, ref] of rcsInputs) {
      if (ref.current) {
        rcsAccum.current[key] += emitRate * delta;
        const count = Math.floor(rcsAccum.current[key]);
        rcsAccum.current[key] -= count;
        for (let i = 0; i < count; i++)
          spawnInto(RCS_EMITTERS, key, rcsPool.current, RCS_MAX, rcsSlot, m, speedScale, vel);
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
    map: spriteTexture,
    alphaMap: spriteTexture,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true,
  } as const;

  return (
    <>
      {/* Main engines — two larger nozzles */}
      <points frustumCulled={false} position={[0, -2, 0]}>
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
