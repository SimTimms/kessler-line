import { useMemo, useRef } from 'react';
import type React from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { navTargetIdRef, navTargetPosRef } from '../context/NavTarget';
import { shipQuaternion, shipVelocity } from '../context/ShipState';
import {
  selectedTargetKey,
  selectedTargetName,
  selectedTargetPosition,
  selectedTargetType,
  selectedTargetVelocity,
} from '../context/TargetSelection';
import { DOCKING_PORT_LOCAL_Z } from '../config/shipConfig';
import { navHudEnabledRef } from '../context/NavHud';
import { getMagneticTargets } from '../context/MagneticRegistry';
import { getDriveSignatures } from '../context/DriveSignatureRegistry';
import { getCollidables } from '../context/CollisionRegistry';
import { gravityBodies } from '../context/GravityRegistry';
import { MOON_BODY_ID } from '../config/moonConfig';

const TUTORIAL_NAV_DAEDALUS_ID = 'tutorial-daedalus';
const TUTORIAL_NAV_LUNA_ID = 'tutorial-luna';
const TUTORIAL_DOCKING_BAY_COLLIDER_ID = 'docking-bay-tutorial-space-station';

// Scratch vectors — avoid allocating on every frame
const _tgtWorld = new THREE.Vector3();
const _shipWorld = new THREE.Vector3();
const _nose = new THREE.Vector3();
const _fwd = new THREE.Vector3(0, 0, 1);
const _targetVel = new THREE.Vector3();
const _toTgt = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _labelPos = new THREE.Vector3();

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
  const distRef = useRef<HTMLDivElement>(null!);
  const relVelRef = useRef<HTMLDivElement>(null!);

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

    // Magnetic / drive scan HUD already shows distance + rel speed on the screen-space bracket.
    const scanHudShowsReadout =
      hasSelectedPos && (selectedTargetType === 'magnetic' || selectedTargetType === 'ship');
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
      const nid = navTargetIdRef.current;
      if (nid === TUTORIAL_NAV_DAEDALUS_ID) {
        const bay = getCollidables().find((c) => c.id === TUTORIAL_DOCKING_BAY_COLLIDER_ID);
        if (bay) {
          bay.getWorldPosition(tgt);
          navTargetPosRef.current.copy(tgt);
        } else {
          tgt.copy(navTargetPosRef.current);
        }
      } else if (nid === TUTORIAL_NAV_LUNA_ID) {
        const moonBody = gravityBodies.get(MOON_BODY_ID);
        if (moonBody) {
          tgt.copy(moonBody.position);
          navTargetPosRef.current.copy(tgt);
        } else {
          tgt.copy(navTargetPosRef.current);
        }
      } else {
        tgt.copy(navTargetPosRef.current);
      }
    }

    // Target velocity for floating line label (nav targets, non-scan contacts).
    _targetVel.set(0, 0, 0);
    if (!scanHudShowsReadout) {
      if (hasSelectedPos && selectedTargetKey) {
        if (selectedTargetType === 'magnetic') {
          const liveMag = getMagneticTargets().find((m) => m.id === selectedTargetKey);
          if (liveMag?.getVelocity) liveMag.getVelocity(_targetVel);
          else _targetVel.copy(selectedTargetVelocity);
        } else if (selectedTargetType === 'ship') {
          const liveDrive = getDriveSignatures().find((d) => d.id === selectedTargetKey);
          if (liveDrive?.getVelocity) liveDrive.getVelocity(_targetVel);
          else _targetVel.copy(selectedTargetVelocity);
        } else {
          _targetVel.copy(selectedTargetVelocity);
        }
      } else if (hasNavTarget) {
        const nid = navTargetIdRef.current;
        if (nid === TUTORIAL_NAV_DAEDALUS_ID) {
          const bay = getCollidables().find((c) => c.id === TUTORIAL_DOCKING_BAY_COLLIDER_ID);
          if (bay?.getWorldVelocity) bay.getWorldVelocity(_targetVel);
        }
      }
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

    if (scanHudShowsReadout) {
      if (labelGroupRef.current) labelGroupRef.current.visible = false;
    } else {
      if (labelGroupRef.current) labelGroupRef.current.visible = true;
      _toTgt.subVectors(tgt, _shipWorld);
      const distWorld = _toTgt.length();
      let relVelStr = '—';
      if (distWorld > 1e-5) {
        const inv = 1 / distWorld;
        const relVel =
          ((shipVelocity.x - _targetVel.x) * _toTgt.x +
            (shipVelocity.y - _targetVel.y) * _toTgt.y +
            (shipVelocity.z - _targetVel.z) * _toTgt.z) *
          inv;
        relVelStr = `${relVel >= 0 ? '+' : ''}${relVel.toFixed(1)} m/s`;
        _dir.copy(_toTgt).multiplyScalar(inv);
      } else {
        _dir.set(0, 0, -1);
      }
      _labelPos.copy(_shipWorld).addScaledVector(_dir, 100);

      if (labelGroupRef.current) labelGroupRef.current.position.copy(_labelPos);

      const distRounded = Math.round(distWorld);
      const magneticStyle = isMagnetic && hasSelectedPos;
      const color = magneticStyle ? '#ffaa00' : 'rgba(255, 255, 255, 0.25)';
      const shadow = magneticStyle
        ? '0 0 8px rgba(255,170,0,0.5)'
        : '0 0 8px rgba(255, 255, 255, 0.5)';
      if (distRef.current) {
        distRef.current.textContent = `${distRounded.toLocaleString()} u`;
        distRef.current.style.color = color;
        distRef.current.style.textShadow = shadow;
      }
      if (relVelRef.current) {
        relVelRef.current.textContent = relVelStr;
        relVelRef.current.style.color = color;
        relVelRef.current.style.textShadow = shadow;
      }
    }
  });

  return (
    <>
      <primitive object={line} />
      <group ref={labelGroupRef} visible={false}>
        <Html center>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              fontFamily: 'monospace',
              pointerEvents: 'none',
              opacity: opacity * 10,
              textAlign: 'center',
            }}
          >
            <div
              ref={distRef}
              style={{
                fontSize: '12px',
                whiteSpace: 'nowrap',
                color: 'rgba(255, 255, 255, 0.25)',
                textShadow: '0 0 8px rgba(255, 255, 255, 0.5)',
              }}
            />
            <div
              ref={relVelRef}
              style={{
                fontSize: '10px',
                whiteSpace: 'nowrap',
                letterSpacing: '0.02em',
                color: 'rgba(255, 255, 255, 0.22)',
                textShadow: '0 0 8px rgba(255, 255, 255, 0.45)',
              }}
            />
          </div>
        </Html>
      </group>
    </>
  );
}
