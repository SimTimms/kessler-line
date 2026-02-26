import { useThree, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { useEffect, useRef } from 'react';

export function BinocularCameraControls() {
  const { camera } = useThree();
  const cam = camera as PerspectiveCamera;

  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);

  const yaw = useRef(0);
  const pitch = useRef(0);

  const zoomVelocity = useRef(0);

  const worldUp = new Vector3(0, 1, 0);

  useEffect(() => {
    cam.position.set(0, 20, 5);
    cam.fov = 50;
    cam.updateProjectionMatrix();

    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      lastX.current = e.clientX;
      lastY.current = e.clientY;
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      const dx = e.clientX - lastX.current;
      const dy = e.clientY - lastY.current;

      lastX.current = e.clientX;
      lastY.current = e.clientY;

      yaw.current -= dx * 0.005;
      pitch.current -= dy * 0.005;

      // Clamp pitch to avoid flipping
      const limit = Math.PI / 2 - 0.1;
      pitch.current = Math.max(-limit, Math.min(limit, pitch.current));
    };

    const handleWheel = (e: WheelEvent) => {
      zoomVelocity.current += e.deltaY * 0.01;
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('wheel', handleWheel);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [cam]);

  useFrame(() => {
    // Smooth zoom
    zoomVelocity.current *= 0.9;
    cam.fov += zoomVelocity.current;
    cam.fov = Math.max(10, Math.min(50, cam.fov));
    cam.updateProjectionMatrix();

    // Apply global yaw
    const yawQuat = new Quaternion().setFromAxisAngle(worldUp, yaw.current);

    // Apply local pitch
    const pitchQuat = new Quaternion().setFromAxisAngle(
      new Vector3(1, 0, 0),
      pitch.current
    );

    // Combine rotations: yaw first (world), then pitch (local)
    cam.quaternion.copy(yawQuat).multiply(pitchQuat);

    // Roll stays locked to zero automatically
  });

  return null;
}
