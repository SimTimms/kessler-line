import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 200;
const DURATION = 4.0; // seconds

export default function ShipExplosion({
  shipPositionRef,
}: {
  shipPositionRef: { current: THREE.Vector3 };
}) {
  const activeRef = useRef(false);
  const timeRef = useRef(0);
  const explodeOriginRef = useRef(new THREE.Vector3());
  const pointsRef = useRef<THREE.Points>(null!);
  const materialRef = useRef<THREE.PointsMaterial>(null!);

  const { geometry, dirs, speeds } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colorData = new Float32Array(PARTICLE_COUNT * 3);
    const d = new Float32Array(PARTICLE_COUNT * 3);
    const s = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Uniform random direction on sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      d[i * 3]     = Math.sin(phi) * Math.cos(theta);
      d[i * 3 + 1] = Math.sin(phi) * Math.sin(theta);
      d[i * 3 + 2] = Math.cos(phi);
      // Random speed: fast sparks and slow debris
      s[i] = 8 + Math.random() * 100;

      // Color mix: white sparks, yellow, orange, red
      const r = Math.random();
      if (r < 0.2) {
        colorData[i * 3] = 1; colorData[i * 3 + 1] = 1; colorData[i * 3 + 2] = 1; // white
      } else if (r < 0.5) {
        colorData[i * 3] = 1; colorData[i * 3 + 1] = 0.85; colorData[i * 3 + 2] = 0.1; // yellow
      } else if (r < 0.78) {
        colorData[i * 3] = 1; colorData[i * 3 + 1] = 0.4; colorData[i * 3 + 2] = 0; // orange
      } else {
        colorData[i * 3] = 1; colorData[i * 3 + 1] = 0.08; colorData[i * 3 + 2] = 0; // red
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colorData, 3));
    return { geometry: geo, dirs: d, speeds: s };
  }, []);

  useEffect(() => {
    const onDestroyed = () => {
      explodeOriginRef.current.copy(shipPositionRef.current);
      timeRef.current = 0;
      activeRef.current = true;
    };
    window.addEventListener('ShipDestroyed', onDestroyed);
    return () => window.removeEventListener('ShipDestroyed', onDestroyed);
  }, [shipPositionRef]);

  useFrame((_, delta) => {
    if (!activeRef.current) return;
    timeRef.current += delta;
    const t = timeRef.current;

    if (t > DURATION) {
      activeRef.current = false;
      if (pointsRef.current) pointsRef.current.visible = false;
      return;
    }

    if (!pointsRef.current) return;
    pointsRef.current.visible = true;

    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const origin = explodeOriginRef.current;
    // sqrt(t) gives natural deceleration: fast initial burst that slows over time
    const decay = Math.sqrt(t);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3]     = origin.x + dirs[i * 3]     * speeds[i] * decay;
      pos[i * 3 + 1] = origin.y + dirs[i * 3 + 1] * speeds[i] * decay;
      pos[i * 3 + 2] = origin.z + dirs[i * 3 + 2] * speeds[i] * decay;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    if (materialRef.current) {
      materialRef.current.opacity = Math.max(0, 1 - t / DURATION);
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry} visible={false} frustumCulled={false}>
      <pointsMaterial
        ref={materialRef}
        size={3.5}
        vertexColors
        transparent
        opacity={1}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
