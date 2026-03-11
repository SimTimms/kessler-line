import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Scratch vectors — avoid allocating on every frame
const _offset = new THREE.Vector3();
const _target = new THREE.Vector3();
const _attachOffset = new THREE.Vector3(0, 14, -40);

interface OrbitCameraProps {
  followTarget?: { current: THREE.Vector3 };
  attachTo?: { current: THREE.Object3D | null };
}

export function OrbitCamera({ followTarget, attachTo }: OrbitCameraProps) {
  const { camera, gl, scene } = useThree();

  const isPointerDown = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const spherical = useRef(new THREE.Spherical(50, Math.PI / 4, 0));
  const didInitSpherical = useRef(false);

  useEffect(() => {
    const parent = attachTo?.current;
    if (!parent) return;
    parent.add(camera);
    return () => {
      scene.add(camera);
    };
  }, [attachTo, camera, scene]);

  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      isPointerDown.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPointerDown.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };

      spherical.current.theta -= dx * 0.005;
      spherical.current.phi -= dy * 0.005;
      spherical.current.phi = THREE.MathUtils.clamp(spherical.current.phi, 0.05, Math.PI - 0.05);
    };

    const onPointerUp = () => {
      isPointerDown.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      spherical.current.radius *= 1 + e.deltaY * 0.001;
      spherical.current.radius = THREE.MathUtils.clamp(spherical.current.radius, 2, 10500);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [camera, gl]);

  useFrame(() => {
    if (!didInitSpherical.current) {
      spherical.current.setFromVector3(_attachOffset);
      didInitSpherical.current = true;
    }
    if (attachTo?.current) {
      _offset.setFromSpherical(spherical.current);
      camera.position.copy(_offset);
      camera.lookAt(attachTo.current.getWorldPosition(_target));
      return;
    }

    _offset.setFromSpherical(spherical.current);
    const target = attachTo?.current
      ? attachTo.current.getWorldPosition(_target)
      : followTarget
        ? followTarget.current
        : _target.set(0, 0, 0);
    camera.position.copy(target).add(_offset);
    camera.lookAt(target);
  }, 1);

  return null;
}
