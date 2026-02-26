import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DragRotateProps {
  target: React.MutableRefObject<THREE.Group | null>;
  speed?: number;
}

export function DragRotate({ target, speed = 0.005 }: DragRotateProps) {
  const isDragging = useRef(false);
  const lastX = useRef(0);

  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      isDragging.current = true;
      lastX.current = e.clientX;
    };

    const handleUp = () => {
      isDragging.current = false;
    };

    const handleMove = (e: MouseEvent) => {
      if (!isDragging.current || !target.current) return;

      const deltaX = e.clientX - lastX.current;
      lastX.current = e.clientX;

      target.current.rotation.y -= deltaX * speed;
    };

    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('mousemove', handleMove);

    return () => {
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('mousemove', handleMove);
    };
  }, [speed, target]);

  useFrame(() => {
    // nothing needed here unless you want smoothing
  });

  return null;
}
