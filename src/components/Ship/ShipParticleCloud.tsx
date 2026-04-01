import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shipPosRef } from '../../context/ShipPos';
import {
  getShipSpeedMps,
  SHIP_IMPACT_PULSE_MS,
  shipImpactPulseUntil,
  shipVelocity,
  shipQuaternion,
} from '../../context/ShipState';
import { playAsteroidImpact, setAsteroidHiss } from '../../sound/SoundManager';
import { solarPlanetPositions } from '../../context/SolarSystemMinimap';
import { PLANETS, SOLAR_SYSTEM_SCALE } from '../Planets/SolarSystem';

export interface ShipParticleCloudProps {
  count?: number;
  minRadius?: number;
  maxRadius?: number;
  color?: string;
  size?: number;
  opacity?: number;
  shipGroupRef?: { current: THREE.Group | null };
  enableInEarthField?: boolean;
  enableImpactSound?: boolean;
  impactSoundMinInterval?: number;
  impactSoundMaxInterval?: number;
  enableSpeedGate?: boolean;
  speedGateMin?: number;
  speedGateMax?: number;
  speedGateOverridesField?: boolean;
}

// ── Particle tuning constants ─────────────────────────────────────────────
const PARTICLE_LIFETIME_MIN = 1.05; // seconds
const PARTICLE_LIFETIME_MAX = 3.3; // seconds
const EARTH_FIELD_OUTER_SCALE = 5.2; // multiplier on earth.radius * SOLAR_SYSTEM_SCALE
const IMPACT_BOOST = 2.2; // extra brightness multiplier during hull impact pulse
const SPEED_BOOST_MAX = 10.5; // extra brightness multiplier at max speed gate
const SPAWN_JITTER_XZ = 3; // world-space random spawn offset on X/Z axes
const SPAWN_JITTER_Y = 1; // world-space random spawn offset on Y axis
const FALLBACK_SPAWN_RADIUS = 10; // spawn radius when no hull surface sample is available
const SPRAY_SPEED_MIN = 8; // units/s outward from hull surface
const SPRAY_SPEED_RANGE = 20; // added to SPRAY_SPEED_MIN via rng
const VELOCITY_JITTER = 0; // random lateral velocity added per axis
const IMPACT_SIZE_MULTIPLIER = 1.35; // point size scale during impact pulse
const NORMAL_OPACITY_SCALE = 0.85; // opacity scale when no impact is active
// ─────────────────────────────────────────────────────────────────────────

// Seeded pseudo-random (mulberry32)
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function ShipParticleCloud({
  count = 1,
  minRadius = 1,
  maxRadius = 10,
  color = '#ffffff',
  size = 0.1,
  opacity = 0.2,
  shipGroupRef,
  enableInEarthField = false,
  enableImpactSound = false,
  impactSoundMinInterval = 0.05,
  impactSoundMaxInterval = 0.12,
  enableSpeedGate = false,
  speedGateMin = 10,
  speedGateMax = 300,
  speedGateOverridesField = false,
}: ShipParticleCloudProps) {
  const positionsRef = useRef<Float32Array>(new Float32Array(count * 3));
  const pointsMeshRef = useRef<THREE.Points | null>(null);
  const materialRef = useRef<THREE.PointsMaterial | null>(null);
  const positionAttrRef = useRef<THREE.BufferAttribute | null>(null);
  const colorsRef = useRef<Float32Array>(new Float32Array(count * 3));
  const colorAttrRef = useRef<THREE.BufferAttribute | null>(null);

  // Hull surface positions in ship-local space (sampled once from mesh geometry)
  const localOffsetsRef = useRef<Float32Array>(new Float32Array(count * 3));
  const hasSurfaceSampleRef = useRef(false);

  // Per-particle lifetime system
  const spawnWorldPosRef = useRef<Float32Array>(new Float32Array(count * 3));
  const particleVelRef = useRef<Float32Array>(new Float32Array(count * 3));
  const particleAgeRef = useRef<Float32Array>(new Float32Array(count));
  const particleLifetimeRef = useRef<Float32Array>(new Float32Array(count));
  const spawnRngRef = useRef(mulberry32(94127));
  const soundRngRef = useRef(mulberry32(73091));
  const nextImpactRef = useRef(0);

  // Per-particle base colors
  const pulseColorsRef = useRef<Float32Array>(new Float32Array(count * 3));

  useMemo(() => {
    const rng = mulberry32(60017);
    const colors = pulseColorsRef.current;
    const lifetimes = particleLifetimeRef.current;
    const ages = particleAgeRef.current;

    for (let i = 0; i < count; i++) {
      const pick = rng();
      const base = i * 3;
      if (pick < 0.34) {
        colors[base] = 1.0;
        colors[base + 1] = 0.35;
        colors[base + 2] = 0.25;
      } else if (pick < 0.67) {
        colors[base] = 1.0;
        colors[base + 1] = 1.0;
        colors[base + 2] = 1.0;
      } else {
        colors[base] = 1.0;
        colors[base + 1] = 0.85;
        colors[base + 2] = 0.2;
      }
      // Staggered initial ages so they don't all respawn on frame 1
      const lt = PARTICLE_LIFETIME_MIN + rng() * (PARTICLE_LIFETIME_MAX - PARTICLE_LIFETIME_MIN);
      lifetimes[i] = lt;
      ages[i] = rng() * lt; // start at random point in lifetime
    }
    return true;
  }, [count]);

  const temp = useMemo(() => new THREE.Vector3(), []);
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const localPos = useMemo(() => new THREE.Vector3(), []);
  const earthWorldPos = useMemo(() => new THREE.Vector3(), []);
  const _invQuat = useMemo(() => new THREE.Quaternion(), []);
  const _localVelDir = useMemo(() => new THREE.Vector3(), []);
  const earth = useMemo(() => PLANETS.find((planet) => planet.name === 'Earth'), []);
  const fieldOuter = (earth?.radius ?? 92) * SOLAR_SYSTEM_SCALE * EARTH_FIELD_OUTER_SCALE;

  const flashTexture = useMemo(() => {
    const sizePx = 64;
    const canvas = document.createElement('canvas');
    canvas.width = sizePx;
    canvas.height = sizePx;
    const ctx = canvas.getContext('2d')!;
    const c = sizePx / 2;
    const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.6, 'rgba(255,160,80,0.65)');
    gradient.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, sizePx, sizePx);
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Unused props kept for API compatibility
  void minRadius;
  void maxRadius;

  const sampleShipSurface = () => {
    const group = shipGroupRef?.current;
    if (!group) return false;

    const meshes: THREE.Mesh[] = [];
    group.updateMatrixWorld(true);
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) meshes.push(child);
    });

    if (!meshes.length) return false;

    const rng = mulberry32(81277);
    const offsets = localOffsetsRef.current;

    for (let i = 0; i < count; i++) {
      const mesh = meshes[Math.floor(rng() * meshes.length)];
      const geometry = mesh.geometry as THREE.BufferGeometry;
      const positions = geometry.attributes.position as THREE.BufferAttribute;
      const index = Math.floor(rng() * positions.count);
      temp.fromBufferAttribute(positions, index);
      worldPos.copy(temp).applyMatrix4(mesh.matrixWorld);
      localPos.copy(worldPos);
      group.worldToLocal(localPos);
      const base = i * 3;
      offsets[base] = localPos.x;
      offsets[base + 1] = localPos.y;
      offsets[base + 2] = localPos.z;
    }

    return true;
  };

  useFrame(({ clock }, delta) => {
    const shipPos = shipPosRef.current;

    // Anchor mesh at ship world position so buffer values stay small (ship-relative)
    // — avoids float32 precision loss at large solar-system coordinates.
    if (pointsMeshRef.current) {
      pointsMeshRef.current.position.copy(shipPos);
    }
    const positions = positionsRef.current;
    const colors = colorsRef.current;
    const baseColors = pulseColorsRef.current;
    const t = clock.getElapsedTime();

    const nowMs = performance.now();
    const impactRemaining = shipImpactPulseUntil.current - nowMs;
    const impactActive = impactRemaining > 0;
    const impactAlpha = impactActive ? Math.min(1, impactRemaining / SHIP_IMPACT_PULSE_MS) : 0;
    const impactBoost = 1 + impactAlpha * IMPACT_BOOST;

    const currentSpeed = getShipSpeedMps();
    const speedGateActive = enableSpeedGate && currentSpeed >= speedGateMin;
    const speedT = enableSpeedGate
      ? Math.min(1, Math.max(0, (currentSpeed - speedGateMin) / (speedGateMax - speedGateMin)))
      : 0;
    const speedBoost = 1 + speedT * SPEED_BOOST_MAX;

    if (!impactActive && enableInEarthField && !(speedGateOverridesField && speedGateActive)) {
      const earthPos = solarPlanetPositions.Earth;
      if (earthPos) {
        earthWorldPos.set(earthPos.x * SOLAR_SYSTEM_SCALE, 0, earthPos.z * SOLAR_SYSTEM_SCALE);
        const dist = earthWorldPos.distanceTo(shipPos);
        if (dist > fieldOuter) {
          if (enableImpactSound) setAsteroidHiss(false);
          for (let i = 0; i < count; i++) {
            const base = i * 3;
            colors[base] = 0;
            colors[base + 1] = 0;
            colors[base + 2] = 0;
          }
          if (colorAttrRef.current) colorAttrRef.current.needsUpdate = true;
          return;
        }
        if (enableImpactSound) setAsteroidHiss(true);
      }
    }

    if (enableImpactSound) {
      if (t >= nextImpactRef.current) {
        playAsteroidImpact();
        const srng = soundRngRef.current;
        const interval =
          impactSoundMinInterval + srng() * (impactSoundMaxInterval - impactSoundMinInterval);
        nextImpactRef.current = t + interval;
      }
    }

    if (shipGroupRef?.current && !hasSurfaceSampleRef.current) {
      hasSurfaceSampleRef.current = sampleShipSurface();
    }

    if (!impactActive && enableSpeedGate && !speedGateActive && !enableInEarthField) {
      for (let i = 0; i < count; i++) {
        const base = i * 3;
        colors[base] = 0;
        colors[base + 1] = 0;
        colors[base + 2] = 0;
      }
      if (colorAttrRef.current) colorAttrRef.current.needsUpdate = true;
      return;
    }

    // Velocity direction in ship-local space for directional culling
    let velDirValid = false;
    if (!impactActive && shipVelocity.lengthSq() > 0.01) {
      _invQuat.copy(shipQuaternion).invert();
      _localVelDir.copy(shipVelocity).applyQuaternion(_invQuat);
      velDirValid = true;
    }

    const spawnPos = spawnWorldPosRef.current;
    const vels = particleVelRef.current;
    const ages = particleAgeRef.current;
    const lifetimes = particleLifetimeRef.current;
    const localOffsets = localOffsetsRef.current;
    const rng = spawnRngRef.current;
    const group = shipGroupRef?.current ?? null;

    for (let i = 0; i < count; i++) {
      const base = i * 3;

      ages[i] += delta;

      // Respawn particle when its lifetime expires
      if (ages[i] >= lifetimes[i]) {
        lifetimes[i] =
          PARTICLE_LIFETIME_MIN + rng() * (PARTICLE_LIFETIME_MAX - PARTICLE_LIFETIME_MIN);
        ages[i] = 0;

        // World-space spawn position from local hull offset at current ship transform
        if (group && hasSurfaceSampleRef.current) {
          temp.set(localOffsets[base], localOffsets[base + 1], localOffsets[base + 2]);
          temp.applyQuaternion(shipQuaternion).add(shipPos);
          spawnPos[base] =
            -Math.random() * SPAWN_JITTER_XZ + temp.x + Math.random() * SPAWN_JITTER_XZ;
          spawnPos[base + 1] =
            -Math.random() * SPAWN_JITTER_Y + temp.y + Math.random() * SPAWN_JITTER_Y;
          spawnPos[base + 2] =
            -Math.random() * SPAWN_JITTER_XZ + temp.z + Math.random() * SPAWN_JITTER_XZ;
        } else {
          spawnPos[base] = shipPos.x + (rng() - 0.5) * FALLBACK_SPAWN_RADIUS;
          spawnPos[base + 1] = shipPos.y + (rng() - 0.5) * FALLBACK_SPAWN_RADIUS;
          spawnPos[base + 2] = shipPos.z + (rng() - 0.5) * FALLBACK_SPAWN_RADIUS;
        }

        // Velocity: spray in the reverse direction of ship travel (debris/wake effect).
        // Fall back to outward hull normal when ship is stationary.
        const ox = localOffsets[base];
        const oy = localOffsets[base + 1];
        const oz = localOffsets[base + 2];
        const shipSpeed = shipVelocity.length();
        if (shipSpeed > 0.001) {
          temp.copy(shipVelocity).normalize().negate();
        } else {
          const len = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1;
          temp.set(ox / len, oy / len, oz / len).applyQuaternion(shipQuaternion);
        }
        const spraySpeed = SPRAY_SPEED_MIN + rng() * SPRAY_SPEED_RANGE; // units/s
        vels[base] = temp.x * spraySpeed + (rng() - 0.5) * VELOCITY_JITTER;
        vels[base + 1] = temp.y * spraySpeed + (rng() - 0.5) * VELOCITY_JITTER;
        vels[base + 2] = temp.z * spraySpeed + (rng() - 0.5) * VELOCITY_JITTER;
      }

      // Ship-relative position: world spawn + drift − ship anchor
      // Keeping values near zero avoids float32 precision jitter at large coordinates.
      const age = ages[i];
      positions[base] = spawnPos[base] + vels[base] * age - shipPos.x;
      positions[base + 1] = spawnPos[base + 1] + vels[base + 1] * age - shipPos.y;
      positions[base + 2] = spawnPos[base + 2] + vels[base + 2] * age - shipPos.z;

      // Fade: bright at spawn, dark at end of lifetime
      const lifeT = age / lifetimes[i];
      const fade = Math.max(0, 1 - lifeT * lifeT);

      // Directional culling: only particles on the impact-facing side are active
      let dirFactor = 1;
      if (!impactActive && velDirValid) {
        const ox = localOffsets[base];
        const oy = localOffsets[base + 1];
        const oz = localOffsets[base + 2];
        const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
        if (len > 0.001) {
          const dot = (ox * _localVelDir.x + oy * _localVelDir.y + oz * _localVelDir.z) / len;
          const d = Math.max(0, dot);
          dirFactor = d * d;
        }
      }

      const intensity = fade * impactBoost * speedBoost * dirFactor;
      colors[base] = baseColors[base] * intensity;
      colors[base + 1] = baseColors[base + 1] * intensity;
      colors[base + 2] = baseColors[base + 2] * intensity;
    }

    if (materialRef.current) {
      materialRef.current.size = size * (impactActive ? IMPACT_SIZE_MULTIPLIER : 1);
      materialRef.current.opacity = opacity * (impactActive ? 1 : NORMAL_OPACITY_SCALE);
    }

    if (positionAttrRef.current) positionAttrRef.current.needsUpdate = true;
    if (colorAttrRef.current) colorAttrRef.current.needsUpdate = true;
  });

  return (
    <points frustumCulled={false} ref={pointsMeshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positionsRef.current, 3]}
          ref={(attr) => {
            positionAttrRef.current = attr as THREE.BufferAttribute | null;
          }}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colorsRef.current, 3]}
          ref={(attr) => {
            colorAttrRef.current = attr as THREE.BufferAttribute | null;
          }}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={opacity}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
        vertexColors
        blending={THREE.AdditiveBlending}
        alphaMap={flashTexture}
      />
    </points>
  );
}
