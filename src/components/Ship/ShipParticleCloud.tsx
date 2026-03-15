import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shipPosRef } from '../../context/ShipPos';
import {
  getShipSpeedMps,
  SHIP_IMPACT_PULSE_MS,
  shipImpactPulseUntil,
} from '../../context/ShipState';
import { playAsteroidImpact, setAsteroidHiss } from '../../sound/SoundManager';
import { solarPlanetPositions } from '../../context/SolarSystemMinimap';
import { PLANETS, SOLAR_SYSTEM_SCALE } from '../SolarSystem';

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
  speedGateOverridesField?: boolean;
}

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
  count = 220,
  minRadius = 15,
  maxRadius = 50,
  color = '#ffffff',
  size = 0.5,
  opacity = 0.9,
  shipGroupRef,
  enableInEarthField = false,
  enableImpactSound = false,
  impactSoundMinInterval = 0.05,
  impactSoundMaxInterval = 0.12,
  enableSpeedGate = false,
  speedGateMin = 50,
  speedGateOverridesField = false,
}: ShipParticleCloudProps) {
  const positionsRef = useRef<Float32Array>(new Float32Array(count * 3));
  const materialRef = useRef<THREE.PointsMaterial | null>(null);
  const positionAttrRef = useRef<THREE.BufferAttribute | null>(null);
  const colorsRef = useRef<Float32Array>(new Float32Array(count * 3));
  const colorAttrRef = useRef<THREE.BufferAttribute | null>(null);
  const localOffsetsRef = useRef<Float32Array>(new Float32Array(count * 3));
  const hasSurfaceSampleRef = useRef(false);
  const pulsePhasesRef = useRef<Float32Array>(new Float32Array(count));
  const pulseRatesRef = useRef<Float32Array>(new Float32Array(count));
  const pulseColorsRef = useRef<Float32Array>(new Float32Array(count * 3));
  const nextImpactRef = useRef(0);
  const rngRef = useRef(mulberry32(73091));

  const fallbackOffsets = useMemo(() => {
    const rng = mulberry32(51731);
    const offsets = new Float32Array(count * 3);
    const span = maxRadius - minRadius;

    for (let i = 0; i < count; i++) {
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      const radius = minRadius + rng() * span;
      const sinPhi = Math.sin(phi);
      const base = i * 3;
      offsets[base + 0] = Math.cos(theta) * sinPhi * radius;
      offsets[base + 1] = Math.cos(phi) * radius;
      offsets[base + 2] = Math.sin(theta) * sinPhi * radius;
    }

    return offsets;
  }, [count, minRadius, maxRadius]);

  useMemo(() => {
    const rng = mulberry32(60017);
    const phases = pulsePhasesRef.current;
    const rates = pulseRatesRef.current;
    const colors = pulseColorsRef.current;

    for (let i = 0; i < count; i++) {
      phases[i] = rng() * Math.PI * 2;
      rates[i] = 6 + rng() * 10;

      const pick = rng();
      const base = i * 3;
      if (pick < 0.34) {
        colors[base + 0] = 1.0;
        colors[base + 1] = 0.35;
        colors[base + 2] = 0.25;
      } else if (pick < 0.67) {
        colors[base + 0] = 1.0;
        colors[base + 1] = 1.0;
        colors[base + 2] = 1.0;
      } else {
        colors[base + 0] = 1.0;
        colors[base + 1] = 0.85;
        colors[base + 2] = 0.2;
      }
    }

    return true;
  }, [count]);

  const temp = useMemo(() => new THREE.Vector3(), []);
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const localPos = useMemo(() => new THREE.Vector3(), []);
  const earthWorldPos = useMemo(() => new THREE.Vector3(), []);
  const earth = useMemo(() => PLANETS.find((planet) => planet.name === 'Earth'), []);
  const fieldOuter = (earth?.radius ?? 92) * SOLAR_SYSTEM_SCALE * 5.2;
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
      offsets[base + 0] = localPos.x;
      offsets[base + 1] = localPos.y;
      offsets[base + 2] = localPos.z;
    }

    return true;
  };

  useFrame(({ clock }) => {
    const shipPos = shipPosRef.current;
    const positions = positionsRef.current;
    const colors = colorsRef.current;
    const phases = pulsePhasesRef.current;
    const rates = pulseRatesRef.current;
    const baseColors = pulseColorsRef.current;
    const t = clock.getElapsedTime();

    const nowMs = performance.now();
    const impactRemaining = shipImpactPulseUntil.current - nowMs;
    const impactActive = impactRemaining > 0;
    const impactAlpha = impactActive ? Math.min(1, impactRemaining / SHIP_IMPACT_PULSE_MS) : 0;
    const impactBoost = 1 + impactAlpha * 2.2;

    const speedGateActive = enableSpeedGate && getShipSpeedMps() >= speedGateMin;

    if (!impactActive && enableInEarthField && !(speedGateOverridesField && speedGateActive)) {
      const earthPos = solarPlanetPositions.Earth;
      if (earthPos) {
        earthWorldPos.set(earthPos.x * SOLAR_SYSTEM_SCALE, 0, earthPos.z * SOLAR_SYSTEM_SCALE);
        const dist = earthWorldPos.distanceTo(shipPos);
        if (dist > fieldOuter) {
          if (enableImpactSound) setAsteroidHiss(false);
          for (let i = 0; i < count; i++) {
            const base = i * 3;
            colors[base + 0] = 0;
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
      const now = t;
      if (now >= nextImpactRef.current) {
        playAsteroidImpact();
        const rng = rngRef.current;
        const interval =
          impactSoundMinInterval + rng() * (impactSoundMaxInterval - impactSoundMinInterval);
        nextImpactRef.current = now + interval;
      }
    }

    let usedSurface = false;

    if (shipGroupRef?.current) {
      if (!hasSurfaceSampleRef.current) {
        hasSurfaceSampleRef.current = sampleShipSurface();
      }

      if (hasSurfaceSampleRef.current) {
        const group = shipGroupRef.current;
        if (group) {
          group.updateMatrixWorld();
          const offsets = localOffsetsRef.current;
          for (let i = 0; i < count; i++) {
            const base = i * 3;
            temp.set(offsets[base + 0], offsets[base + 1], offsets[base + 2]);
            temp.applyMatrix4(group.matrixWorld);
            positions[base + 0] = temp.x;
            positions[base + 1] = temp.y;
            positions[base + 2] = temp.z;
          }
          usedSurface = true;
        }
      }
    }

    if (!usedSurface) {
      for (let i = 0; i < count; i++) {
        const base = i * 3;
        positions[base + 0] = shipPos.x + fallbackOffsets[base + 0];
        positions[base + 1] = shipPos.y + fallbackOffsets[base + 1];
        positions[base + 2] = shipPos.z + fallbackOffsets[base + 2];
      }
    }

    if (!impactActive && enableSpeedGate && !speedGateActive && !enableInEarthField) {
      for (let i = 0; i < count; i++) {
        const base = i * 3;
        colors[base + 0] = 0;
        colors[base + 1] = 0;
        colors[base + 2] = 0;
      }
      if (colorAttrRef.current) colorAttrRef.current.needsUpdate = true;
      return;
    }

    for (let i = 0; i < count; i++) {
      const base = i * 3;
      const pulse = Math.max(0, Math.sin(t * rates[i] + phases[i]));
      const intensity = pulse * pulse;
      colors[base + 0] = baseColors[base + 0] * intensity * impactBoost;
      colors[base + 1] = baseColors[base + 1] * intensity * impactBoost;
      colors[base + 2] = baseColors[base + 2] * intensity * impactBoost;
    }

    if (materialRef.current) {
      materialRef.current.size = size * (impactActive ? 1.35 : 1);
      materialRef.current.opacity = opacity * (impactActive ? 1 : 0.85);
    }

    if (positionAttrRef.current) positionAttrRef.current.needsUpdate = true;
    if (colorAttrRef.current) colorAttrRef.current.needsUpdate = true;
  });

  return (
    <points frustumCulled={false}>
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
        map={flashTexture}
        alphaTest={0.05}
      />
    </points>
  );
}
