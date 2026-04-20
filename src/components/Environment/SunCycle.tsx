import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameTime } from '../../context/TimeProvider';

export function SunCycle() {
  const { t } = useGameTime(); // <-- global normalized time (0–1)

  const sunRef = useRef<THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const directionalRef = useRef<THREE.DirectionalLight>(null);

  useFrame(() => {
    // Sun position
    const angle = t * Math.PI * 2;
    const radius = 20;

    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    if (sunRef.current) sunRef.current.position.set(x, y, -10);
    if (directionalRef.current) directionalRef.current.position.set(x, y, -10);

    // Smooth color interpolation using keyframes
    const keyframes = [
      {
        t: 0.0,
        sun: new THREE.Color(1.0, 0.6, 0.2),
        ambient: new THREE.Color(0.4, 0.4, 0.5),
      }, // sunrise
      {
        t: 0.25,
        sun: new THREE.Color(1.0, 1.0, 0.9),
        ambient: new THREE.Color(0.7, 0.75, 0.8),
      }, // midday
      {
        t: 0.5,
        sun: new THREE.Color(1.0, 0.4, 0.2),
        ambient: new THREE.Color(0.6, 0.6, 0.7),
      }, // sunset
      {
        t: 0.75,
        sun: new THREE.Color(0.2, 0.2, 0.4),
        ambient: new THREE.Color(0.1, 0.1, 0.2),
      }, // night
      {
        t: 1.0,
        sun: new THREE.Color(1.0, 0.6, 0.2),
        ambient: new THREE.Color(0.4, 0.4, 0.5),
      }, // loop
    ];

    function interpolate(frames: typeof keyframes, t: number) {
      for (let i = 0; i < frames.length - 1; i++) {
        const a = frames[i];
        const b = frames[i + 1];

        if (t >= a.t && t <= b.t) {
          const k = (t - a.t) / (b.t - a.t);
          return {
            sun: a.sun.clone().lerp(b.sun, k),
            ambient: a.ambient.clone().lerp(b.ambient, k),
          };
        }
      }
      return frames[0];
    }

    const { sun, ambient } = interpolate(keyframes, t);

    if (sunRef.current) {
      sunRef.current.material.color.copy(sun);
      sunRef.current.material.emissive.copy(sun);
      sunRef.current.material.emissiveIntensity = 1.5;
    }

    if (ambientRef.current) ambientRef.current.color.copy(ambient);
    if (directionalRef.current) directionalRef.current.color.copy(sun);
  });

  return (
    <>
      <mesh ref={sunRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial emissiveIntensity={1} />
      </mesh>

      <ambientLight ref={ambientRef} intensity={1} />
      <directionalLight ref={directionalRef} castShadow />
    </>
  );
}
