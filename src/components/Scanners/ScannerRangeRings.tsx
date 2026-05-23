import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shipPosRef } from '../../context/ShipPos';
import {
  SCANNER_RANGE_RING_DEFS,
  SCANNER_RANGE_RING_SEGMENTS,
  type ScannerRangeRingDef,
} from '../../config/scanRanges';

function createUnitCircleGeometry(segments: number): THREE.BufferGeometry {
  const positions = new Float32Array(segments * 3);
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    positions[i * 3] = Math.cos(angle);
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = Math.sin(angle);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geometry;
}

function ScannerRangeRing({ def, geometry }: { def: ScannerRangeRingDef; geometry: THREE.BufferGeometry }) {
  const lineRef = useRef<THREE.LineLoop>(null);

  useFrame(() => {
    const line = lineRef.current;
    if (!line) return;

    const active = def.onRef.current && def.rangeRef.current > 0;
    line.visible = active;
    if (!active) return;

    const range = def.rangeRef.current;
    line.position.y = def.yOffset;
    line.scale.set(range, 1, range);
  });

  return (
    <lineLoop ref={lineRef} visible={false} frustumCulled={false} renderOrder={10}>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial
        color={def.color}
        transparent
        opacity={def.opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineLoop>
  );
}

/**
 * Horizontal range rings centered on the ship, one per active scanner type.
 * Radius tracks each scanner's power level via the shared range refs.
 */
export default function ScannerRangeRings() {
  const rootRef = useRef<THREE.Group>(null);
  const geometry = useMemo(
    () => createUnitCircleGeometry(SCANNER_RANGE_RING_SEGMENTS),
    [],
  );

  useFrame(() => {
    if (rootRef.current) rootRef.current.position.copy(shipPosRef.current);
  });

  return (
    <group ref={rootRef}>
      {SCANNER_RANGE_RING_DEFS.map((def) => (
        <ScannerRangeRing key={def.id} def={def} geometry={geometry} />
      ))}
    </group>
  );
}
