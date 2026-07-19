import { useMemo, useRef } from 'react';
import type React from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { hasNavTarget, navTargetIdRef, navTargetPosRef } from '../context/NavTarget';
import { shipVelocity } from '../context/ShipState';
import {
  selectedTargetKey,
  selectedTargetName,
  selectedTargetPosition,
  selectedTargetType,
  selectedTargetVelocity,
} from '../context/TargetSelection';
import { navHudEnabledRef } from '../context/NavHud';
import { minimapOverlayActiveRef } from '../context/MinimapUi';
import { getMagneticTargets } from '../context/MagneticRegistry';
import { getDriveSignatures } from '../context/DriveSignatureRegistry';
import { getCollidables } from '../context/CollisionRegistry';
import { gravityBodies } from '../context/GravityRegistry';
import { MOON_BODY_ID } from '../config/moonConfig';
import { FUEL_STATION_DEF } from '../config/worldConfig';
import {
  SHIP_DIRECTION_MAGNETIC_COLOR,
  SHIP_DIRECTION_TARGET_COLOR,
  SHIP_DIRECTION_VELOCITY_ARROW_SCALE,
} from '../config/shipDirectionIndicatorConfig';
import { formatCompactDistance } from '../utils/formatCompactDistance';
import {
  createShipDirectionArrow,
  placeShipDirectionArrow,
  setShipDirectionArrowColor,
} from './shipDirectionArrow';

const TUTORIAL_NAV_DAEDALUS_ID = 'tutorial-daedalus';
const TUTORIAL_NAV_LUNA_ID = 'tutorial-luna';
const TUTORIAL_DOCKING_BAY_COLLIDER_ID = 'docking-bay-tutorial-space-station';

function resolveTargetLabel(): string {
  if (selectedTargetName) return selectedTargetName;
  const id = navTargetIdRef.current.trim();
  if (!id) return '';
  if (id === TUTORIAL_NAV_DAEDALUS_ID) return 'Daedalus';
  if (id === TUTORIAL_NAV_LUNA_ID) return 'Luna';
  if (id === FUEL_STATION_DEF.id) return FUEL_STATION_DEF.label;
  return id.replace(/-/g, ' ');
}

// Scratch vectors — avoid allocating on every frame
const _tgtWorld = new THREE.Vector3();
const _shipWorld = new THREE.Vector3();
const _targetVel = new THREE.Vector3();
const _toTgt = new THREE.Vector3();
const _colorDefault = new THREE.Color(SHIP_DIRECTION_TARGET_COLOR);
const _colorMagnetic = new THREE.Color(SHIP_DIRECTION_MAGNETIC_COLOR);

/** Local +Z offset past the arrow tip — keeps Html in ship-relative space. */
const TARGET_LABEL_LOCAL_Z = 22;

/**
 * Circumference arrow around the ship pointing at the active nav / selected target.
 * The full ship→target line lives on the minimap.
 */
export default function TargetIndicatorLine({
  shipGroupRef,
}: {
  shipGroupRef: React.RefObject<THREE.Group>;
}) {
  const arrow = useMemo(() => {
    const a = createShipDirectionArrow(SHIP_DIRECTION_TARGET_COLOR);
    a.scale.setScalar(SHIP_DIRECTION_VELOCITY_ARROW_SCALE);
    return a;
  }, []);

  const labelGroupRef = useRef<THREE.Group>(null!);
  const nameRef = useRef<HTMLDivElement>(null!);
  const metricsRef = useRef<HTMLDivElement>(null!);

  useFrame(() => {
    if (!navHudEnabledRef.current) {
      arrow.visible = false;
      if (labelGroupRef.current) labelGroupRef.current.visible = false;
      return;
    }
    if (!shipGroupRef.current) return;
    shipGroupRef.current.updateWorldMatrix(true, false);
    shipGroupRef.current.getWorldPosition(_shipWorld);

    const isMagnetic = selectedTargetType === 'magnetic';
    const hasSelectedPos = selectedTargetName !== null && selectedTargetPosition.lengthSq() > 0.01;
    const hasNavTargetId = hasNavTarget();
    if (!hasSelectedPos && !hasNavTargetId) {
      arrow.visible = false;
      if (labelGroupRef.current) labelGroupRef.current.visible = false;
      return;
    }

    const targetLabel = resolveTargetLabel();

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
      } else if (hasNavTargetId) {
        const nid = navTargetIdRef.current;
        if (nid === TUTORIAL_NAV_DAEDALUS_ID) {
          const bay = getCollidables().find((c) => c.id === TUTORIAL_DOCKING_BAY_COLLIDER_ID);
          if (bay?.getWorldVelocity) bay.getWorldVelocity(_targetVel);
        }
      }
    }

    setShipDirectionArrowColor(
      arrow,
      isMagnetic && hasSelectedPos ? _colorMagnetic : _colorDefault
    );

    const placed = placeShipDirectionArrow(
      arrow,
      _shipWorld.x,
      _shipWorld.y,
      _shipWorld.z,
      tgt.x - _shipWorld.x,
      tgt.z - _shipWorld.z
    );
    if (!placed) {
      if (labelGroupRef.current) labelGroupRef.current.visible = false;
      return;
    }

    _toTgt.subVectors(tgt, _shipWorld);
    const distWorld = _toTgt.length();

    // Label is a child of the arrow (local +Z) so Html stays near the indicator.
    // Hide while fullscreen/dock map overlays the scene (Html would stack on top).
    if (labelGroupRef.current) {
      labelGroupRef.current.visible =
        Boolean(targetLabel) && !minimapOverlayActiveRef.current;
    }

    const magneticStyle = isMagnetic && hasSelectedPos;
    const nameColor = magneticStyle ? SHIP_DIRECTION_MAGNETIC_COLOR : SHIP_DIRECTION_TARGET_COLOR;
    const nameShadow = magneticStyle
      ? '0 0 8px rgba(255,170,0,0.55)'
      : '0 0 8px rgba(159,223,255,0.55)';
    if (nameRef.current) {
      nameRef.current.textContent = targetLabel;
      nameRef.current.style.color = nameColor;
      nameRef.current.style.textShadow = nameShadow;
    }

    // Distance | closing speed — hidden when scan HUD already shows those readouts.
    if (scanHudShowsReadout) {
      if (metricsRef.current) metricsRef.current.style.display = 'none';
    } else {
      let relVelStr = '—';
      if (distWorld > 1e-5) {
        const inv = 1 / distWorld;
        const relVel =
          ((shipVelocity.x - _targetVel.x) * _toTgt.x +
            (shipVelocity.y - _targetVel.y) * _toTgt.y +
            (shipVelocity.z - _targetVel.z) * _toTgt.z) *
          inv;
        relVelStr = `${relVel >= 0 ? '+' : ''}${relVel.toFixed(1)} m/s`;
      }
      if (metricsRef.current) {
        metricsRef.current.style.display = '';
        metricsRef.current.textContent = `${formatCompactDistance(distWorld, { unitSuffix: 'm' })} | ${relVelStr}`;
        metricsRef.current.style.color = nameColor;
        metricsRef.current.style.textShadow = nameShadow;
      }
    }
  });

  return (
    <primitive object={arrow}>
      <group ref={labelGroupRef} position={[0, 0, TARGET_LABEL_LOCAL_Z]} visible={false}>
        <Html center>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              fontFamily: 'monospace',
              pointerEvents: 'none',
              opacity: 0.92,
              textAlign: 'center',
            }}
          >
            <div
              ref={nameRef}
              style={{
                fontSize: '9px', // 75% of previous 12px
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                color: SHIP_DIRECTION_TARGET_COLOR,
                textShadow: '0 0 8px rgba(159,223,255,0.55)',
              }}
            />
            <div
              ref={metricsRef}
              style={{
                fontSize: '9px',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                color: SHIP_DIRECTION_TARGET_COLOR,
                textShadow: '0 0 8px rgba(159,223,255,0.55)',
              }}
            />
          </div>
        </Html>
      </group>
    </primitive>
  );
}
