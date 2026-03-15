import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { navTargetPosRef, navTargetIdRef } from '../context/NavTarget';
import { solarPlanetPositions } from '../context/SolarSystemMinimap';
import { SOLAR_SYSTEM_SCALE } from './SolarSystem';

interface RedPlanetLineProps {
  shipPositionRef: { current: THREE.Vector3 };
}

// Scratch vectors — avoid allocating on every frame
const _dir = new THREE.Vector3();
const _labelPos = new THREE.Vector3();

export default function RedPlanetLine({ shipPositionRef }: RedPlanetLineProps) {
  const line = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(6); // 2 points × 3 components
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineDashedMaterial({
      color: 'rgba(0, 255, 255, 0.5)',
      dashSize: 80,
      gapSize: 60,
      transparent: true,
      opacity: 0.3,
      depthTest: false,
      depthWrite: false,
    });
    const l = new THREE.Line(geo, mat);
    l.frustumCulled = false;
    return l;
  }, []);

  const labelGroupRef = useRef<THREE.Group>(null!);
  const textRef = useRef<HTMLDivElement>(null!);

  useFrame(() => {
    // Keep nav target in sync with moving planets
    const id = navTargetIdRef.current;
    const planetName = id.charAt(0).toUpperCase() + id.slice(1);
    const livePos = solarPlanetPositions[planetName];
    if (livePos)
      navTargetPosRef.current.set(
        livePos.x * SOLAR_SYSTEM_SCALE,
        0,
        livePos.z * SOLAR_SYSTEM_SCALE
      );

    const attr = line.geometry.attributes.position as THREE.BufferAttribute;
    const tgt = navTargetPosRef.current;
    attr.setXYZ(
      0,
      shipPositionRef.current.x,
      shipPositionRef.current.y,
      shipPositionRef.current.z
    );
    attr.setXYZ(1, tgt.x, tgt.y, tgt.z);
    attr.needsUpdate = true;
    line.computeLineDistances();

    // Place label 100 units ahead of the ship toward the target
    _dir.subVectors(tgt, shipPositionRef.current).normalize();
    _labelPos.copy(shipPositionRef.current).addScaledVector(_dir, 100);
    if (labelGroupRef.current) labelGroupRef.current.position.copy(_labelPos);

    // Mutate DOM directly — no re-render
    const dist = Math.round(shipPositionRef.current.distanceTo(tgt));
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
              color: 'rgba(0, 255, 255, 0.25)',
              fontFamily: 'monospace',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              textShadow: '0 0 8px rgba(0, 255, 255, 0.5)',
            }}
          />
        </Html>
      </group>
    </>
  );
}
