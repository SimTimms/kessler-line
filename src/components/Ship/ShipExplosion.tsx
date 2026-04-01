import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shipVelocity } from '../../context/ShipState';
import { shipPosRef } from '../../context/ShipPos';

const VAPOR_COUNT = 280;
const VAPOR_DURATION = 1.4; // seconds

export default function ShipExplosion({
  shipGroupRef,
}: {
  shipGroupRef?: { current: THREE.Group | null };
}) {
  const activeRef = useRef(false);
  const timeRef = useRef(0);
  const explodeOriginRef = useRef(new THREE.Vector3());
  const explodeVelocityRef = useRef(new THREE.Vector3());
  const vaporRef = useRef<THREE.Points>(null!);
  const vaporMaterialRef = useRef<THREE.PointsMaterial>(null!);

  const { vaporGeometry, vaporDirs, vaporSpeeds, vaporTexture } = useMemo(() => {
    const makeDirs = (count: number) => {
      const d = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        d[i * 3] = Math.sin(phi) * Math.cos(theta);
        d[i * 3 + 1] = Math.sin(phi) * Math.sin(theta);
        d[i * 3 + 2] = Math.cos(phi);
      }
      return d;
    };

    const makeGeometry = (count: number) => {
      const positions = new Float32Array(count * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      return geo;
    };

    const vaporSpeeds = new Float32Array(VAPOR_COUNT);
    for (let i = 0; i < VAPOR_COUNT; i++) {
      vaporSpeeds[i] = 4 + Math.random() * 18;
    }

    const vaporCanvas = document.createElement('canvas');
    vaporCanvas.width = 64;
    vaporCanvas.height = 64;
    const vctx = vaporCanvas.getContext('2d')!;
    const grad = vctx.createRadialGradient(32, 32, 4, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    vctx.fillStyle = grad;
    vctx.fillRect(0, 0, 64, 64);
    const vaporTexture = new THREE.CanvasTexture(vaporCanvas);

    return {
      vaporGeometry: makeGeometry(VAPOR_COUNT),
      vaporDirs: makeDirs(VAPOR_COUNT),
      vaporSpeeds,
      vaporTexture,
    };
  }, []);

  useEffect(() => {
    const onDestroyed = () => {
      explodeVelocityRef.current.copy(shipVelocity);
      if (shipGroupRef?.current) {
        shipGroupRef.current.getWorldPosition(explodeOriginRef.current);
      } else {
        explodeOriginRef.current.copy(shipPosRef.current);
      }
      timeRef.current = 0;
      activeRef.current = true;
      if (vaporRef.current) vaporRef.current.visible = true;
    };

    window.addEventListener('ShipDestroyed', onDestroyed);
    return () => window.removeEventListener('ShipDestroyed', onDestroyed);
  }, [shipGroupRef]);

  useFrame((_, delta) => {
    if (!activeRef.current) return;
    timeRef.current += delta;
    const t = timeRef.current;

    if (t > VAPOR_DURATION) {
      activeRef.current = false;
      if (vaporRef.current) vaporRef.current.visible = false;
      return;
    }

    if (!vaporRef.current) return;
    vaporRef.current.visible = true;

    const vaporPos = vaporRef.current.geometry.attributes.position.array as Float32Array;
    const origin = explodeOriginRef.current;
    const drift = explodeVelocityRef.current;
    const decay = Math.sqrt(t);

    for (let i = 0; i < VAPOR_COUNT; i++) {
      vaporPos[i * 3] = origin.x + drift.x * t + vaporDirs[i * 3] * vaporSpeeds[i] * decay * 0.55;
      vaporPos[i * 3 + 1] =
        origin.y + drift.y * t + vaporDirs[i * 3 + 1] * vaporSpeeds[i] * decay * 0.55;
      vaporPos[i * 3 + 2] =
        origin.z + drift.z * t + vaporDirs[i * 3 + 2] * vaporSpeeds[i] * decay * 0.55;
    }

    vaporRef.current.geometry.attributes.position.needsUpdate = true;

    const fade = Math.max(0, 1 - t / VAPOR_DURATION);
    if (vaporMaterialRef.current) vaporMaterialRef.current.opacity = fade * 0.75;
  });

  return (
    <>
      <points ref={vaporRef} geometry={vaporGeometry} visible={false} frustumCulled={false}>
        <pointsMaterial
          ref={vaporMaterialRef}
          size={3.5}
          map={vaporTexture}
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.NormalBlending}
          sizeAttenuation
        />
      </points>
    </>
  );
}
