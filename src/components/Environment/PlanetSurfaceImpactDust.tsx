import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  PLANET_DUST_BASE_SPEED,
  PLANET_DUST_DURATION_S,
  PLANET_DUST_PARTICLE_COUNT,
  PLANET_DUST_PARTICLE_SIZE,
  PLANET_DUST_SPEED_VARIANCE,
} from '../../config/planetImpactConfig';

export interface PlanetSurfaceImpactDetail {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  planetId: string;
  impactSpeed: number;
}

const _tangentA = new THREE.Vector3();
const _tangentB = new THREE.Vector3();
const _dir = new THREE.Vector3();

function buildDustTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(210, 195, 170, 0.85)');
  grad.addColorStop(0.45, 'rgba(160, 145, 125, 0.45)');
  grad.addColorStop(1, 'rgba(120, 110, 100, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function makeHemisphereDirections(count: number, normal: THREE.Vector3, out: Float32Array) {
  _tangentA.set(0, 1, 0);
  if (Math.abs(normal.y) > 0.92) _tangentA.set(1, 0, 0);
  _tangentB.crossVectors(normal, _tangentA).normalize();
  _tangentA.crossVectors(_tangentB, normal).normalize();

  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(1 - v * 0.65);
    _dir
      .copy(normal)
      .multiplyScalar(Math.cos(phi))
      .addScaledVector(_tangentA, Math.sin(phi) * Math.cos(theta))
      .addScaledVector(_tangentB, Math.sin(phi) * Math.sin(theta))
      .normalize();
    out[i * 3] = _dir.x;
    out[i * 3 + 1] = _dir.y;
    out[i * 3 + 2] = _dir.z;
  }
}

/** Dust plume burst at a planet surface impact point (world space). */
export default function PlanetSurfaceImpactDust() {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const activeRef = useRef(false);
  const timeRef = useRef(0);
  const originRef = useRef(new THREE.Vector3());
  const speedsRef = useRef<Float32Array | null>(null);
  const dirsRef = useRef<Float32Array | null>(null);

  const { geometry, texture } = useMemo(() => {
    const positions = new Float32Array(PLANET_DUST_PARTICLE_COUNT * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return { geometry: geo, texture: buildDustTexture() };
  }, []);

  useEffect(() => {
    const onImpact = (event: Event) => {
      const detail = (event as CustomEvent<PlanetSurfaceImpactDetail>).detail;
      if (!detail?.position || !detail?.normal) return;

      originRef.current.copy(detail.position);
      const dirs = new Float32Array(PLANET_DUST_PARTICLE_COUNT * 3);
      makeHemisphereDirections(PLANET_DUST_PARTICLE_COUNT, detail.normal.clone().normalize(), dirs);
      dirsRef.current = dirs;

      const speeds = new Float32Array(PLANET_DUST_PARTICLE_COUNT);
      const speedBoost = THREE.MathUtils.clamp(detail.impactSpeed * 0.35, 0, 80);
      for (let i = 0; i < PLANET_DUST_PARTICLE_COUNT; i++) {
        speeds[i] =
          PLANET_DUST_BASE_SPEED +
          speedBoost +
          Math.random() * PLANET_DUST_SPEED_VARIANCE;
      }
      speedsRef.current = speeds;

      timeRef.current = 0;
      activeRef.current = true;
      if (pointsRef.current) pointsRef.current.visible = true;
    };

    window.addEventListener('PlanetSurfaceImpact', onImpact);
    return () => window.removeEventListener('PlanetSurfaceImpact', onImpact);
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame((_, delta) => {
    if (!activeRef.current || !pointsRef.current || !dirsRef.current || !speedsRef.current) return;

    timeRef.current += delta;
    const t = timeRef.current;
    if (t > PLANET_DUST_DURATION_S) {
      activeRef.current = false;
      pointsRef.current.visible = false;
      return;
    }

    const posAttr = pointsRef.current.geometry.attributes.position;
    const positions = posAttr.array as Float32Array;
    const origin = originRef.current;
    const dirs = dirsRef.current;
    const speeds = speedsRef.current;
    const spread = Math.sqrt(t) * (1 + t * 0.15);

    for (let i = 0; i < PLANET_DUST_PARTICLE_COUNT; i++) {
      const s = speeds[i] * spread;
      positions[i * 3] = origin.x + dirs[i * 3] * s;
      positions[i * 3 + 1] = origin.y + dirs[i * 3 + 1] * s - t * t * 12;
      positions[i * 3 + 2] = origin.z + dirs[i * 3 + 2] * s;
    }
    posAttr.needsUpdate = true;

    const fade = Math.max(0, 1 - t / PLANET_DUST_DURATION_S);
    if (materialRef.current) {
      materialRef.current.opacity = fade * 0.9;
      materialRef.current.size = PLANET_DUST_PARTICLE_SIZE * (0.65 + fade * 0.5);
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry} visible={false} frustumCulled={false}>
      <pointsMaterial
        ref={materialRef}
        map={texture}
        transparent
        opacity={0.85}
        depthWrite={false}
        size={PLANET_DUST_PARTICLE_SIZE}
        sizeAttenuation
        blending={THREE.NormalBlending}
      />
    </points>
  );
}
