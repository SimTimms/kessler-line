import { useRef, useMemo } from 'react';
import type React from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { navTargetIdRef, navTargetPosRef } from '../context/NavTarget';
import { shipQuaternion } from '../context/ShipState';
import {
  selectedTargetKey,
  selectedTargetName,
  selectedTargetPosition,
  selectedTargetType,
} from '../context/TargetSelection';
import { DOCKING_PORT_LOCAL_Z } from '../config/shipConfig';
import { navHudEnabledRef } from '../context/NavHud';
import { getMagneticTargets } from '../context/MagneticRegistry';
import { getDriveSignatures } from '../context/DriveSignatureRegistry';

// Scratch vectors — avoid allocating on every frame
const _dir = new THREE.Vector3();
const _labelPos = new THREE.Vector3();
const _tgtWorld = new THREE.Vector3();
const _shipWorld = new THREE.Vector3();
const _nose = new THREE.Vector3();
const _fwd = new THREE.Vector3(0, 0, 1);

const COLOR_DEFAULT = new THREE.Color('#9fdfff');
const COLOR_MAGNETIC = new THREE.Color('#ffaa00');
const TARGET_LINE_OPACITY = 0.34;

export default function TargetIndicatorLine({
  shipGroupRef,
}: {
  shipGroupRef: React.RefObject<THREE.Group>;
}) {
  const opacity = TARGET_LINE_OPACITY;
  const { line, mat } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(6); // 2 points × 3 components
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const m = new THREE.LineDashedMaterial({
      color: COLOR_DEFAULT,
      dashSize: 24,
      gapSize: 10,
      transparent: true,
      opacity: opacity,
      depthTest: false,
      depthWrite: false,
    });
    const l = new THREE.Line(geo, m);
    l.frustumCulled = false;
    return { line: l, mat: m };
  }, []);

  const labelGroupRef = useRef<THREE.Group>(null!);
  const textRef = useRef<HTMLDivElement>(null!);

  useFrame(() => {
    if (!navHudEnabledRef.current) {
      line.visible = false;
      if (labelGroupRef.current) labelGroupRef.current.visible = false;
      return;
    }
    if (!shipGroupRef.current) return;
    shipGroupRef.current.updateWorldMatrix(true, false);
    shipGroupRef.current.getWorldPosition(_shipWorld);

    // Show line only when an explicit target exists (selected contact or nav target id).
    const isMagnetic = selectedTargetType === 'magnetic';
    const hasSelectedPos = selectedTargetName !== null && selectedTargetPosition.lengthSq() > 0.01;
    const hasNavTarget = navTargetIdRef.current.trim().length > 0;
    if (!hasSelectedPos && !hasNavTarget) {
      line.visible = false;
      if (labelGroupRef.current) labelGroupRef.current.visible = false;
      return;
    }
    line.visible = true;
    if (labelGroupRef.current) labelGroupRef.current.visible = true;
    const tgt = _tgtWorld;
    if (hasSelectedPos && selectedTargetKey) {
      if (selectedTargetType === 'magnetic') {
        const liveMag = getMagneticTargets().find((m) => m.id === selectedTargetKey);
        if (liveMag) {
          liveMag.getPosition(tgt);
          selectedTargetPosition.copy(tgt);
        } else {
          tgt.copy(selectedTargetPosition);
        }
      } else if (selectedTargetType === 'ship') {
        const liveDrive = getDriveSignatures().find((d) => d.id === selectedTargetKey);
        if (liveDrive) {
          liveDrive.getPosition(tgt);
          selectedTargetPosition.copy(tgt);
        } else {
          tgt.copy(selectedTargetPosition);
        }
      } else {
        tgt.copy(selectedTargetPosition);
      }
    } else {
      tgt.copy(navTargetPosRef.current);
    }

    // Update line color
    mat.color.copy(isMagnetic && hasSelectedPos ? COLOR_MAGNETIC : COLOR_DEFAULT);

    // Anchor line object at ship world position so geometry stays in small
    // ship-relative coords — avoids float32 precision loss in computeLineDistances.
    line.position.copy(_shipWorld);

    const attr = line.geometry.attributes.position as THREE.BufferAttribute;
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
    if (textRef.current) {
      textRef.current.textContent = `${dist.toLocaleString()} u`;
      if (isMagnetic && hasSelectedPos) {
        textRef.current.style.color = '#ffaa00';
        textRef.current.style.textShadow = '0 0 8px rgba(255,170,0,0.5)';
      } else {
        textRef.current.style.color = 'rgba(255, 255, 255, 0.25)';
        textRef.current.style.textShadow = '0 0 8px rgba(255, 255, 255, 0.5)';
      }
    }
  });

  return (
    <>
      <primitive object={line} />
      <group ref={labelGroupRef}>
        <Html center>
          <div
            ref={textRef}
            style={{
              color: 'rgba(255, 255, 255, 0.25)',
              fontFamily: 'monospace',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              textShadow: '0 0 8px rgba(255, 255, 255, 0.5)',
              opacity: opacity * 10,
            }}
          />
        </Html>
      </group>
    </>
  );
}
