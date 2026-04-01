import { useRef, useMemo } from 'react';
import type React from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { navTargetPosRef } from '../context/NavTarget';
import { shipQuaternion } from '../context/ShipState';
import { DOCKING_PORT_LOCAL_Z } from '../config/shipConfig';

// Scratch vectors — avoid allocating on every frame
const _dir = new THREE.Vector3();
const _labelPos = new THREE.Vector3();
const _shipWorld = new THREE.Vector3();
const _nose = new THREE.Vector3();
const _fwd = new THREE.Vector3(0, 0, 1);

export default function TargetIndicatorLine({
  shipGroupRef,
}: {
  shipGroupRef: React.RefObject<THREE.Group>;
}) {
  const line = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(6); // 2 points × 3 components
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineDashedMaterial({
      color: 'rgba(0, 255, 255, 0.5)',
      dashSize: 80,
      gapSize: 60,
      transparent: true,
      opacity: 0.003,
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
    if (!shipGroupRef.current) return;
    shipGroupRef.current.updateWorldMatrix(true, false);
    shipGroupRef.current.getWorldPosition(_shipWorld);

    // Anchor line object at ship world position so geometry stays in small
    // ship-relative coords — avoids float32 precision loss in computeLineDistances.
    line.position.copy(_shipWorld);

    const attr = line.geometry.attributes.position as THREE.BufferAttribute;
    const tgt = navTargetPosRef.current;
    // Start the line from the ship's nose tip rather than its center
    _nose.copy(_fwd).multiplyScalar(DOCKING_PORT_LOCAL_Z).applyQuaternion(shipQuaternion);
    attr.setXYZ(0, _nose.x, _nose.y, _nose.z);
    attr.setXYZ(1, tgt.x - _shipWorld.x, tgt.y - _shipWorld.y, tgt.z - _shipWorld.z);
    attr.needsUpdate = true;
    line.computeLineDistances();

    // Place label 100 units ahead of the ship toward the target (world space)
    _dir.subVectors(tgt, _shipWorld).normalize();
    _labelPos.copy(_shipWorld).addScaledVector(_dir, 100);
    if (labelGroupRef.current) labelGroupRef.current.position.copy(_labelPos);

    // Mutate DOM directly — no re-render
    const dist = Math.round(_shipWorld.distanceTo(tgt));
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
