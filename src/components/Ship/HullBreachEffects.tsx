import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  HULL_BREACH_START_THRESHOLD,
  HULL_CRITICAL_ALARM_VOLUME,
  HULL_CRITICAL_THRESHOLD,
} from '../../config/damageConfig';
import { SHIP_BOX_HALF_EXTENTS } from '../../config/shipConfig';
import { pushAlert } from '../../context/AlertsStore';
import { hullIntegrity, shipDestroyed } from '../../context/ShipState';
import { setHullBreachHissSound, setHullCriticalAlarmSound } from '../../sound/SoundManager';

const LEAK_PARTICLE_POOL = 720;
const SPARK_PARTICLE_POOL = 240;
const LEAK_SPEED_MIN = 0.8;
const LEAK_SPEED_MAX = 4.6;
const SPARK_SPEED_MIN = 5.5;
const SPARK_SPEED_MAX = 12;

const _spawnPos = new THREE.Vector3();
const _spawnDir = new THREE.Vector3();
const _jitterVec = new THREE.Vector3();

type Particle = {
  active: boolean;
  age: number;
  life: number;
  px: number;
  py: number;
  pz: number;
  vx: number;
  vy: number;
  vz: number;
};

interface HullBreachEffectsProps {
  shipGroupRef: { current: THREE.Group | null };
}

function randomHullSurfacePoint(position: THREE.Vector3, normal: THREE.Vector3): void {
  const hx = SHIP_BOX_HALF_EXTENTS[0] * 0.9;
  const hy = SHIP_BOX_HALF_EXTENTS[1] * 0.9;
  const hz = SHIP_BOX_HALF_EXTENTS[2] * 0.9;
  const face = Math.floor(Math.random() * 6);
  const jitter = 0.35;

  switch (face) {
    case 0:
      position.set(hx, (Math.random() * 2 - 1) * hy, (Math.random() * 2 - 1) * hz);
      normal.set(1, 0, 0);
      break;
    case 1:
      position.set(-hx, (Math.random() * 2 - 1) * hy, (Math.random() * 2 - 1) * hz);
      normal.set(-1, 0, 0);
      break;
    case 2:
      position.set((Math.random() * 2 - 1) * hx, hy, (Math.random() * 2 - 1) * hz);
      normal.set(0, 1, 0);
      break;
    case 3:
      position.set((Math.random() * 2 - 1) * hx, -hy, (Math.random() * 2 - 1) * hz);
      normal.set(0, -1, 0);
      break;
    case 4:
      position.set((Math.random() * 2 - 1) * hx, (Math.random() * 2 - 1) * hy, hz);
      normal.set(0, 0, 1);
      break;
    default:
      position.set((Math.random() * 2 - 1) * hx, (Math.random() * 2 - 1) * hy, -hz);
      normal.set(0, 0, -1);
      break;
  }

  position.x += (Math.random() * 2 - 1) * jitter;
  position.y += (Math.random() * 2 - 1) * jitter;
  position.z += (Math.random() * 2 - 1) * jitter;
}

function updateParticleBuffer(
  pool: Particle[],
  positions: Float32Array,
  colors: Float32Array,
  delta: number,
  decayPower: number,
  tint: readonly [number, number, number]
): void {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    const base = i * 3;
    if (!p.active) {
      positions[base] = positions[base + 1] = positions[base + 2] = 0;
      colors[base] = colors[base + 1] = colors[base + 2] = 0;
      continue;
    }

    p.age += delta;
    if (p.age >= p.life) {
      p.active = false;
      positions[base] = positions[base + 1] = positions[base + 2] = 0;
      colors[base] = colors[base + 1] = colors[base + 2] = 0;
      continue;
    }

    p.px += p.vx * delta;
    p.py += p.vy * delta;
    p.pz += p.vz * delta;

    positions[base] = p.px;
    positions[base + 1] = p.py;
    positions[base + 2] = p.pz;

    const lifeT = p.age / p.life;
    const brightness = Math.pow(1 - lifeT, decayPower);
    colors[base] = tint[0] * brightness;
    colors[base + 1] = tint[1] * brightness;
    colors[base + 2] = tint[2] * brightness;
  }
}

export default function HullBreachEffects({ shipGroupRef }: HullBreachEffectsProps) {
  const leakGeoRef = useRef<THREE.BufferGeometry>(null!);
  const sparkGeoRef = useRef<THREE.BufferGeometry>(null!);
  const parentRef = useRef<THREE.Group>(null!);

  const leakPositions = useMemo(() => new Float32Array(LEAK_PARTICLE_POOL * 3), []);
  const leakColors = useMemo(() => new Float32Array(LEAK_PARTICLE_POOL * 3), []);
  const sparkPositions = useMemo(() => new Float32Array(SPARK_PARTICLE_POOL * 3), []);
  const sparkColors = useMemo(() => new Float32Array(SPARK_PARTICLE_POOL * 3), []);

  const leakPool = useRef<Particle[]>(
    Array.from({ length: LEAK_PARTICLE_POOL }, () => ({
      active: false,
      age: 0,
      life: 0,
      px: 0,
      py: 0,
      pz: 0,
      vx: 0,
      vy: 0,
      vz: 0,
    }))
  );
  const sparkPool = useRef<Particle[]>(
    Array.from({ length: SPARK_PARTICLE_POOL }, () => ({
      active: false,
      age: 0,
      life: 0,
      px: 0,
      py: 0,
      pz: 0,
      vx: 0,
      vy: 0,
      vz: 0,
    }))
  );

  const leakWriteIndex = useRef(0);
  const sparkWriteIndex = useRef(0);
  const leakSpawnAccum = useRef(0);
  const sparkTimer = useRef(1.4);
  const wasBreachWarning = useRef(false);
  const wasCritical = useRef(false);

  useEffect(() => {
    const ship = shipGroupRef.current;
    const parent = parentRef.current;
    if (ship && parent && parent.parent !== ship) ship.add(parent);
    return () => {
      setHullBreachHissSound(false);
      setHullCriticalAlarmSound(false);
      if (ship && parent && parent.parent === ship) ship.remove(parent);
    };
  }, [shipGroupRef]);

  useFrame((_, delta) => {
    const destroyed = shipDestroyed.current;
    const hull = hullIntegrity;
    const warning = !destroyed && hull <= HULL_BREACH_START_THRESHOLD;
    const critical = !destroyed && hull <= HULL_CRITICAL_THRESHOLD;

    if (warning && !wasBreachWarning.current) pushAlert('HULL BREACH DETECTED', 'yellow');
    if (!warning && wasBreachWarning.current) pushAlert('HULL BREACH STABILIZED', 'blue');
    if (critical && !wasCritical.current) pushAlert('CRITICAL HULL INTEGRITY', 'red');
    if (!critical && wasCritical.current) pushAlert('CRITICAL HULL ALARM CLEARED', 'blue');

    if (warning !== wasBreachWarning.current) {
      setHullBreachHissSound(warning);
    }

    wasBreachWarning.current = warning;
    wasCritical.current = critical;
    setHullCriticalAlarmSound(critical, HULL_CRITICAL_ALARM_VOLUME);

    if (!warning) {
      leakSpawnAccum.current = 0;
      sparkTimer.current = 1.2;
    } else {
      const severity = THREE.MathUtils.clamp(
        (HULL_BREACH_START_THRESHOLD - hull) / HULL_BREACH_START_THRESHOLD,
        0,
        1
      );
      const leakRatePerSecond = THREE.MathUtils.lerp(5, 70, severity);
      leakSpawnAccum.current += leakRatePerSecond * delta;
      let leakSpawnCount = Math.floor(leakSpawnAccum.current);
      leakSpawnAccum.current -= leakSpawnCount;

      while (leakSpawnCount-- > 0) {
        randomHullSurfacePoint(_spawnPos, _spawnDir);
        _jitterVec.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        _spawnDir.addScaledVector(_jitterVec, 0.65).normalize();

        const speed = THREE.MathUtils.lerp(LEAK_SPEED_MIN, LEAK_SPEED_MAX, severity) * (0.7 + Math.random());
        const idx = leakWriteIndex.current;
        leakWriteIndex.current = (idx + 1) % LEAK_PARTICLE_POOL;
        const p = leakPool.current[idx];
        p.active = true;
        p.age = 0;
        p.life = 0.8 + Math.random() * 1.1;
        p.px = _spawnPos.x;
        p.py = _spawnPos.y;
        p.pz = _spawnPos.z;
        p.vx = _spawnDir.x * speed;
        p.vy = _spawnDir.y * speed;
        p.vz = _spawnDir.z * speed;
      }

      sparkTimer.current -= delta;
      const sparkSeverity = THREE.MathUtils.clamp(
        (HULL_BREACH_START_THRESHOLD - hull) /
          Math.max(1, HULL_BREACH_START_THRESHOLD - HULL_CRITICAL_THRESHOLD),
        0,
        1
      );
      if (sparkSeverity > 0.04 && sparkTimer.current <= 0) {
        const burstCount = Math.floor(THREE.MathUtils.lerp(3, 14, sparkSeverity));
        for (let i = 0; i < burstCount; i++) {
          randomHullSurfacePoint(_spawnPos, _spawnDir);
          _jitterVec.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
          _spawnDir.addScaledVector(_jitterVec, 1).normalize();

          const speed =
            THREE.MathUtils.lerp(SPARK_SPEED_MIN, SPARK_SPEED_MAX, sparkSeverity) *
            (0.65 + Math.random() * 0.85);
          const idx = sparkWriteIndex.current;
          sparkWriteIndex.current = (idx + 1) % SPARK_PARTICLE_POOL;
          const p = sparkPool.current[idx];
          p.active = true;
          p.age = 0;
          p.life = 0.18 + Math.random() * 0.38;
          p.px = _spawnPos.x;
          p.py = _spawnPos.y;
          p.pz = _spawnPos.z;
          p.vx = _spawnDir.x * speed;
          p.vy = _spawnDir.y * speed;
          p.vz = _spawnDir.z * speed;
        }

        sparkTimer.current = THREE.MathUtils.lerp(2.3, 0.3, sparkSeverity) * (0.85 + Math.random() * 0.4);
      }
    }

    updateParticleBuffer(leakPool.current, leakPositions, leakColors, delta, 1.25, [0.7, 0.92, 1.0]);
    updateParticleBuffer(sparkPool.current, sparkPositions, sparkColors, delta, 0.7, [0.28, 0.66, 1.0]);

    (leakGeoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (leakGeoRef.current.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (sparkGeoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (sparkGeoRef.current.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <group ref={parentRef}>
      <points frustumCulled={false}>
        <bufferGeometry ref={leakGeoRef}>
          <bufferAttribute attach="attributes-position" args={[leakPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[leakColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.32}
          vertexColors
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
          sizeAttenuation
        />
      </points>
      <points frustumCulled={false}>
        <bufferGeometry ref={sparkGeoRef}>
          <bufferAttribute attach="attributes-position" args={[sparkPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[sparkColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.62}
          vertexColors
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
