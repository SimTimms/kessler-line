import SpaceParticles from './SpaceParticles';
import { useMemo } from 'react';
import { useFrame, useThree, createPortal } from '@react-three/fiber';
import * as THREE from 'three';

export function ParticleLayer({
  shipPositionRef,
}: {
  shipPositionRef: { current: THREE.Vector3 };
}) {
  const { gl, camera } = useThree();
  const particleScene = useMemo(() => new THREE.Scene(), []);

  useFrame(() => {
    const prev = gl.autoClear;
    gl.autoClear = false;
    gl.render(particleScene, camera);
    gl.autoClear = prev;
  }, 2);

  return createPortal(<SpaceParticles shipPositionRef={shipPositionRef} />, particleScene);
}
