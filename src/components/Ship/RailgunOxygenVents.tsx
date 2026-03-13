import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MAX_PARTICLES = 240;
const PARTICLES_PER_HIT = 24;
const LIFETIME = 1.2;
const SPEED = 6;
const PARTICLE_SIZE = 0.8;

interface RailgunOxygenVentsProps {
  shipGroupRef: { current: THREE.Group | null };
}

type VentParticle = {
  age: number;
  life: number;
};

export default function RailgunOxygenVents({ shipGroupRef }: RailgunOxygenVentsProps) {
  const pointsRef = useRef<THREE.Points>(null!);
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  const positions = useRef(new Float32Array(MAX_PARTICLES * 3));
  const velocities = useRef(new Float32Array(MAX_PARTICLES * 3));
  const alphas = useRef(new Float32Array(MAX_PARTICLES));
  const particles = useRef<VentParticle[]>(
    Array.from({ length: MAX_PARTICLES }, () => ({ age: 0, life: 0 }))
  );
  const writeIndex = useRef(0);

  const texture = useMemo(() => {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const c = size / 2;
    const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }, []);

  useEffect(() => {
    const group = shipGroupRef.current;
    const points = pointsRef.current;
    if (group && points) group.add(points);

    const onDamagePoints = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          points: Array<{ x: number; y: number; z: number; nx: number; ny: number; nz: number }>;
        }>
      ).detail;
      if (!detail?.points?.length) return;

      const group = shipGroupRef.current;
      if (!group) return;

      const posArr = positions.current;
      const velArr = velocities.current;

      for (const point of detail.points) {
        const worldPos = new THREE.Vector3(point.x, point.y, point.z);
        const worldNormal = new THREE.Vector3(point.nx, point.ny, point.nz).normalize();
        const localPos = worldPos.clone();
        group.worldToLocal(localPos);
        const localNormal = worldNormal.clone();
        const invQuat = group.getWorldQuaternion(new THREE.Quaternion()).invert();
        localNormal.applyQuaternion(invQuat);

        for (let i = 0; i < PARTICLES_PER_HIT; i++) {
          const idx = writeIndex.current;
          writeIndex.current = (idx + 1) % MAX_PARTICLES;

          const base = idx * 3;
          const jitter = 0.3;
          posArr[base + 0] = localPos.x + (Math.random() - 0.5) * jitter;
          posArr[base + 1] = localPos.y + (Math.random() - 0.5) * jitter;
          posArr[base + 2] = localPos.z + (Math.random() - 0.5) * jitter;

          const spread = 0.6;
          const dir = new THREE.Vector3(
            localNormal.x + (Math.random() - 0.5) * spread,
            localNormal.y + (Math.random() - 0.5) * spread,
            localNormal.z + (Math.random() - 0.5) * spread
          ).normalize();
          const speed = SPEED * (0.6 + Math.random() * 0.6);
          velArr[base + 0] = dir.x * speed;
          velArr[base + 1] = dir.y * speed;
          velArr[base + 2] = dir.z * speed;

          particles.current[idx].age = 0;
          particles.current[idx].life = LIFETIME * (0.7 + Math.random() * 0.6);
          alphas.current[idx] = 1;
        }
      }

      const geo = pointsRef.current.geometry as THREE.BufferGeometry;
      (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (geo.attributes.alpha as THREE.BufferAttribute).needsUpdate = true;
    };

    window.addEventListener('RailgunDamagePoints', onDamagePoints);
    return () => {
      window.removeEventListener('RailgunDamagePoints', onDamagePoints);
      if (group && points && points.parent === group) group.remove(points);
    };
  }, [shipGroupRef]);

  useFrame((_, delta) => {
    const posArr = positions.current;
    const velArr = velocities.current;
    const parts = particles.current;
    const alphaArr = alphas.current;

    let active = false;
    let alphaDirty = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = parts[i];
      if (p.age >= p.life) continue;
      p.age += delta;
      if (p.age >= p.life) {
        alphaArr[i] = 0;
        alphaDirty = true;
        continue;
      }
      active = true;
      const t = p.age / p.life;
      alphaArr[i] = 1 - t;
      alphaDirty = true;
      const base = i * 3;
      posArr[base + 0] += velArr[base + 0] * delta;
      posArr[base + 1] += velArr[base + 1] * delta;
      posArr[base + 2] += velArr[base + 2] * delta;
    }

    if (active || alphaDirty) {
      const geo = pointsRef.current.geometry as THREE.BufferGeometry;
      if (active) (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (geo.attributes.alpha as THREE.BufferAttribute).needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions.current, 3]} />
        <bufferAttribute attach="attributes-alpha" args={[alphas.current, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{ pointTexture: { value: texture }, size: { value: PARTICLE_SIZE } }}
        vertexShader={[
          'attribute float alpha;',
          'uniform float size;',
          'varying float vAlpha;',
          'void main() {',
          '  vAlpha = alpha;',
          '  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);',
          '  float lifeScale = 0.1 + 0.9 * vAlpha;',
          '  gl_PointSize = size * lifeScale * (300.0 / -mvPosition.z);',
          '  gl_Position = projectionMatrix * mvPosition;',
          '}',
        ].join('\n')}
        fragmentShader={[
          'uniform sampler2D pointTexture;',
          'varying float vAlpha;',
          'void main() {',
          '  vec4 tex = texture2D(pointTexture, gl_PointCoord);',
          '  gl_FragColor = vec4(1.0, 1.0, 1.0, tex.a * vAlpha);',
          '}',
        ].join('\n')}
      />
    </points>
  );
}
