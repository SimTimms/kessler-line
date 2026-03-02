import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { EARTH_DEF } from '../config/worldConfig';

interface RedPlanetLineProps {
  shipPositionRef: { current: THREE.Vector3 };
}

const planetPos = new THREE.Vector3(...EARTH_DEF.position);
// Scratch vectors — avoid allocating on every frame
const _dir = new THREE.Vector3();
const _labelPos = new THREE.Vector3();

export default function RedPlanetLine({ shipPositionRef }: RedPlanetLineProps) {
  const line = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(6); // 2 points × 3 components
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineDashedMaterial({
      color: '#ff4422',
      dashSize: 80,
      gapSize: 60,
      transparent: true,
      opacity: 0.6,
    });
    return new THREE.Line(geo, mat);
  }, []);

  const labelGroupRef = useRef<THREE.Group>(null!);
  const textRef = useRef<HTMLDivElement>(null!);

  useFrame(() => {
    const attr = line.geometry.attributes.position as THREE.BufferAttribute;
    attr.setXYZ(0, shipPositionRef.current.x, shipPositionRef.current.y, shipPositionRef.current.z);
    attr.setXYZ(1, planetPos.x, planetPos.y, planetPos.z);
    attr.needsUpdate = true;
    line.computeLineDistances();

    // Place label 100 units ahead of the ship toward the planet
    _dir.subVectors(planetPos, shipPositionRef.current).normalize();
    _labelPos.copy(shipPositionRef.current).addScaledVector(_dir, 100);
    if (labelGroupRef.current) labelGroupRef.current.position.copy(_labelPos);

    // Mutate DOM directly — no re-render
    const dist = Math.round(shipPositionRef.current.distanceTo(planetPos));
    if (textRef.current) textRef.current.textContent = `${dist.toLocaleString()} u`;
  });

  return (
    <>
      <primitive object={line} />
      <group ref={labelGroupRef}>
        <Html center>
          <div
            ref={textRef}
            style={{
              color: '#ff4422',
              fontFamily: 'monospace',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              textShadow: '0 0 8px #ff4422',
            }}
          />
        </Html>
      </group>
    </>
  );
}
