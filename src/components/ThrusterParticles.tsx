import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MAX_PARTICLES = 600;
const EMIT_RATE      = 60;   // particles per second per active thruster
const BASE_LIFETIME  = 1.8;  // seconds (jittered ±30%)
const BASE_SPEED     = 10;   // world units/second (jittered ±30%)

// All positions/directions are in ship-local space.
// Ship forward = local -Z, so local +Z is the rear.
// Tune localPos offsets to align with your model's nozzle geometry.
const EMITTERS = {
  forward:     { localPos: new THREE.Vector3(0, 0,  2.5), localDir: new THREE.Vector3(0, 0,  1) }, // S: rear exhaust
  reverse:     { localPos: new THREE.Vector3(0, 0, -2.5), localDir: new THREE.Vector3(0, 0, -1) }, // W: front exhaust
  left:        { localPos: new THREE.Vector3( 1.5, 0, 0), localDir: new THREE.Vector3( 1, 0,  0) }, // A: right-side exhaust (yaw)
  right:       { localPos: new THREE.Vector3(-1.5, 0, 0), localDir: new THREE.Vector3(-1, 0,  0) }, // D: left-side exhaust (yaw)
  strafeLeft:  { localPos: new THREE.Vector3( 2.0, 0,  1.0), localDir: new THREE.Vector3( 1, 0,  0) }, // Q: starboard exhaust → strafe port
  strafeRight: { localPos: new THREE.Vector3(-2.0, 0,  1.0), localDir: new THREE.Vector3(-1, 0,  0) }, // E: port exhaust → strafe starboard
} as const;

type ThrusterKey = keyof typeof EMITTERS;

// Module-level reusable vectors — avoid per-frame GC
const _worldPos = new THREE.Vector3();
const _worldDir = new THREE.Vector3();

type Particle = {
  active: boolean;
  age: number; maxAge: number;
  px: number; py: number; pz: number;
  vx: number; vy: number; vz: number;
};

interface ThrusterParticlesProps {
  shipGroupRef:     { current: THREE.Group };
  thrustForward:    { current: boolean };
  thrustReverse:    { current: boolean };
  thrustLeft:       { current: boolean };
  thrustRight:      { current: boolean };
  thrustStrafeLeft:  { current: boolean };
  thrustStrafeRight: { current: boolean };
}

export default function ThrusterParticles({
  shipGroupRef, thrustForward, thrustReverse, thrustLeft, thrustRight,
  thrustStrafeLeft, thrustStrafeRight,
}: ThrusterParticlesProps) {
  const geoRef = useRef<THREE.BufferGeometry>(null!);

  const positions = useMemo(() => new Float32Array(MAX_PARTICLES * 3), []);
  const colors    = useMemo(() => new Float32Array(MAX_PARTICLES * 3), []);

  const pool     = useRef<Particle[]>(
    Array.from({ length: MAX_PARTICLES }, () => ({
      active: false, age: 0, maxAge: 0,
      px: 0, py: 0, pz: 0,
      vx: 0, vy: 0, vz: 0,
    }))
  );
  const nextSlot  = useRef(0);
  const emitAccum = useRef({ forward: 0, reverse: 0, left: 0, right: 0, strafeLeft: 0, strafeRight: 0 });

  function spawnParticle(key: ThrusterKey) {
    const ship = shipGroupRef.current;
    const { localPos, localDir } = EMITTERS[key];

    _worldPos.copy(localPos).applyMatrix4(ship.matrixWorld);
    _worldDir.copy(localDir).transformDirection(ship.matrixWorld);

    // Cone spread
    _worldDir.x += (Math.random() - 0.5) * 0.35;
    _worldDir.y += (Math.random() - 0.5) * 0.35;
    _worldDir.z += (Math.random() - 0.5) * 0.35;
    _worldDir.normalize();

    const speed    = BASE_SPEED    * (0.7 + Math.random() * 0.6);
    const lifetime = BASE_LIFETIME * (0.7 + Math.random() * 0.6);

    const idx = nextSlot.current;
    nextSlot.current = (idx + 1) % MAX_PARTICLES;

    const p = pool.current[idx];
    p.active = true;
    p.age    = 0;
    p.maxAge = lifetime;
    p.px = _worldPos.x; p.py = _worldPos.y; p.pz = _worldPos.z;
    p.vx = _worldDir.x * speed;
    p.vy = _worldDir.y * speed;
    p.vz = _worldDir.z * speed;
  }

  useFrame((_, delta) => {
    const accum = emitAccum.current;
    const inputs: [ThrusterKey, { current: boolean }][] = [
      ['forward',     thrustForward],
      ['reverse',     thrustReverse],
      ['left',        thrustLeft],
      ['right',       thrustRight],
      ['strafeLeft',  thrustStrafeLeft],
      ['strafeRight', thrustStrafeRight],
    ];

    for (const [key, ref] of inputs) {
      if (ref.current) {
        accum[key] += EMIT_RATE * delta;
        const count = Math.floor(accum[key]);
        accum[key] -= count;
        for (let i = 0; i < count; i++) spawnParticle(key);
      } else {
        accum[key] = 0;
      }
    }

    // Update pool — inactive slots become black (transparent under additive blending)
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = pool.current[i];

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
      positions[i * 3]     = p.px;
      positions[i * 3 + 1] = p.py;
      positions[i * 3 + 2] = p.pz;

      // Color: white-yellow → orange-red → black (fades to transparent with additive blending)
      const t          = p.age / p.maxAge;
      const brightness = Math.pow(1 - t, 1.2);
      colors[i * 3]     = brightness;                               // r: stays bright
      colors[i * 3 + 1] = brightness * Math.max(0, 0.8 - t);       // g: fades mid
      colors[i * 3 + 2] = brightness * Math.max(0, 0.5 - t * 1.5); // b: fades fastest
    }

    if (!geoRef.current) return;
    const posAttr = geoRef.current.attributes.position as THREE.BufferAttribute;
    const colAttr = geoRef.current.attributes.color    as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.3}
        vertexColors
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
