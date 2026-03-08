import { useRef, useMemo } from 'react';
import { useFrame, useThree, createPortal } from '@react-three/fiber';
import * as THREE from 'three';

export function SunBackground() {
  const SUN_WORLD_RADIUS = 600 * 10.3;
  const BG_SUN_DIST = 500; // fixed render distance in the background scene

  const { gl, camera } = useThree();
  const bgScene = useMemo(() => new THREE.Scene(), []);
  const bgCamera = useMemo(() => new THREE.PerspectiveCamera(60, 1, 1, BG_SUN_DIST * 3), []);
  const meshRef = useRef<THREE.Mesh>(null!);
  const toSun = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!meshRef.current) return;
    const mainCam = camera as THREE.PerspectiveCamera;

    // Sync bg camera to main camera orientation + FOV
    bgCamera.quaternion.copy(mainCam.quaternion);
    bgCamera.fov = mainCam.fov;
    bgCamera.aspect = mainCam.aspect;
    bgCamera.updateProjectionMatrix();

    // Place bg Sun in the direction of the real Sun (world origin)
    toSun.set(0, 0, 0).sub(camera.position).normalize();
    meshRef.current.position.copy(toSun).multiplyScalar(BG_SUN_DIST);

    // Scale to match the real Sun's angular size at the current distance
    const dist = camera.position.length();
    meshRef.current.scale.setScalar(
      (BG_SUN_DIST * SUN_WORLD_RADIUS) / Math.max(dist, SUN_WORLD_RADIUS)
    );

    // Render bg before the main pass: clear everything, draw the bg Sun, then
    // clear only depth so the main scene renders in front with correct occlusion
    gl.autoClear = false;
    gl.clear();
    gl.render(bgScene, bgCamera);
    gl.clearDepth();
  }, -1);

  // Restore autoClear after the main R3F render
  useFrame(() => {
    gl.autoClear = true;
  }, 1);

  return createPortal(
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="#FFFDF0" toneMapped={false} />
    </mesh>,
    bgScene
  );
}
