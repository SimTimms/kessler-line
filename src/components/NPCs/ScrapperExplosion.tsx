import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrapperWorldPos } from '../../context/CinematicState';

const CLOUD1_COUNT = 600;
const CLOUD2_COUNT = 400;
const CLOUD1_DURATION = 3.5; // seconds
const CLOUD2_DURATION = 2.8;

function makeCloud(count: number) {
  const dirs = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    dirs[i * 3] = Math.sin(phi) * Math.cos(theta);
    dirs[i * 3 + 1] = Math.sin(phi) * Math.sin(theta);
    dirs[i * 3 + 2] = Math.cos(phi);
    speeds[i] = 40 + Math.random() * 100;
  }
  const positions = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return { dirs, speeds, geo };
}

export default function ScrapperExplosion() {
  const active1 = useRef(false);
  const time1 = useRef(0);
  const origin1 = useRef(new THREE.Vector3());
  const pts1Ref = useRef<THREE.Points>(null!);
  const mat1Ref = useRef<THREE.PointsMaterial>(null!);

  const active2 = useRef(false);
  const time2 = useRef(0);
  const origin2 = useRef(new THREE.Vector3());
  const pts2Ref = useRef<THREE.Points>(null!);
  const mat2Ref = useRef<THREE.PointsMaterial>(null!);

  const { dirs1, speeds1, geo1, dirs2, speeds2, geo2, texture } = useMemo(() => {
    const { dirs: dirs1, speeds: speeds1, geo: geo1 } = makeCloud(CLOUD1_COUNT);
    const { dirs: dirs2, speeds: speeds2, geo: geo2 } = makeCloud(CLOUD2_COUNT);

    // Blue-white radial gradient particle
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.35, 'rgba(180,210,255,0.5)');
    grad.addColorStop(1, 'rgba(80,130,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);

    return { dirs1, speeds1, geo1, dirs2, speeds2, geo2, texture };
  }, []);

  useEffect(() => {
    const onDestroyed = () => {
      origin1.current.copy(scrapperWorldPos);
      time1.current = 0;
      active1.current = true;
      if (pts1Ref.current) pts1Ref.current.visible = true;
    };
    const onSecondary = () => {
      // Offset the secondary blast slightly from centre
      origin2.current
        .copy(scrapperWorldPos)
        .addScaledVector(
          new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
          ).normalize(),
          80
        );
      time2.current = 0;
      active2.current = true;
      if (pts2Ref.current) pts2Ref.current.visible = true;
    };
    window.addEventListener('ScrapperDestroyed', onDestroyed);
    window.addEventListener('ScrapperSecondaryExplosion', onSecondary);
    return () => {
      window.removeEventListener('ScrapperDestroyed', onDestroyed);
      window.removeEventListener('ScrapperSecondaryExplosion', onSecondary);
    };
  }, []);

  useFrame((_, delta) => {
    // ── Cloud 1 ─────────────────────────────────────────────────────────────
    if (active1.current && pts1Ref.current) {
      time1.current += delta;
      const t = time1.current;
      if (t > CLOUD1_DURATION) {
        active1.current = false;
        pts1Ref.current.visible = false;
      } else {
        const pos = pts1Ref.current.geometry.attributes.position.array as Float32Array;
        const origin = origin1.current;
        const decay = Math.sqrt(t);
        for (let i = 0; i < CLOUD1_COUNT; i++) {
          pos[i * 3] = origin.x + dirs1[i * 3] * speeds1[i] * decay;
          pos[i * 3 + 1] = origin.y + dirs1[i * 3 + 1] * speeds1[i] * decay;
          pos[i * 3 + 2] = origin.z + dirs1[i * 3 + 2] * speeds1[i] * decay;
        }
        pts1Ref.current.geometry.attributes.position.needsUpdate = true;
        if (mat1Ref.current) {
          mat1Ref.current.opacity = Math.max(0, 1 - t / CLOUD1_DURATION) * 0.9;
        }
      }
    }

    // ── Cloud 2 ─────────────────────────────────────────────────────────────
    if (active2.current && pts2Ref.current) {
      time2.current += delta;
      const t = time2.current;
      if (t > CLOUD2_DURATION) {
        active2.current = false;
        pts2Ref.current.visible = false;
      } else {
        const pos = pts2Ref.current.geometry.attributes.position.array as Float32Array;
        const origin = origin2.current;
        const decay = Math.sqrt(t);
        for (let i = 0; i < CLOUD2_COUNT; i++) {
          pos[i * 3] = origin.x + dirs2[i * 3] * speeds2[i] * decay;
          pos[i * 3 + 1] = origin.y + dirs2[i * 3 + 1] * speeds2[i] * decay;
          pos[i * 3 + 2] = origin.z + dirs2[i * 3 + 2] * speeds2[i] * decay;
        }
        pts2Ref.current.geometry.attributes.position.needsUpdate = true;
        if (mat2Ref.current) {
          mat2Ref.current.opacity = Math.max(0, 1 - t / CLOUD2_DURATION) * 0.75;
        }
      }
    }
  });

  return (
    <>
      <points ref={pts1Ref} geometry={geo1} visible={false} frustumCulled={false}>
        <pointsMaterial
          ref={mat1Ref}
          size={20}
          map={texture}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
      <points ref={pts2Ref} geometry={geo2} visible={false} frustumCulled={false}>
        <pointsMaterial
          ref={mat2Ref}
          size={15}
          map={texture}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </>
  );
}
