import SpaceParticles from './SpaceParticles';
import { useMemo } from 'react';
import { useFrame, useThree, createPortal } from '@react-three/fiber';
import * as THREE from 'three';

export function ParticleLayer() {
  const { gl, camera } = useThree();
  const particleScene = useMemo(() => new THREE.Scene(), []);

  useFrame(() => {
    const prev = gl.autoClear;
    gl.autoClear = false;
    gl.render(particleScene, camera);
    gl.autoClear = prev;
  }, 2);

  return createPortal(<SpaceParticles />, particleScene);
}
