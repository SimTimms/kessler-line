import { useLayoutEffect, useMemo, useRef } from 'react';
import type React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { hasNavTarget, navTargetIdRef, navTargetPosRef } from '../context/NavTarget';
import {
  selectedTargetKey,
  selectedTargetName,
  selectedTargetPosition,
  selectedTargetType,
  selectedTargetVelocity,
} from '../context/TargetSelection';
import { navHudEnabledRef } from '../context/NavHud';
import { shipVelocity } from '../context/ShipState';
import { minimapOverlayActiveRef } from '../context/MinimapUi';
import { getMagneticTargets } from '../context/MagneticRegistry';
import { getDriveSignatures } from '../context/DriveSignatureRegistry';
import { getCollidables, type CollidableEntry } from '../context/CollisionRegistry';
import { getRadioBroadcasts } from '../context/RadioBroadcastRegistry';
import { getClosingSpeed } from '../utils/relativeVelocity';
import { gravityBodies } from '../context/GravityRegistry';
import { MOON_BODY_ID } from '../config/moonConfig';
import { FUEL_STATION_DEF } from '../config/worldConfig';
import {
  SHIP_DIRECTION_MAGNETIC_COLOR,
  SHIP_DIRECTION_TARGET_COLOR,
  SHIP_DIRECTION_VELOCITY_ARROW_SCALE,
} from '../config/shipDirectionIndicatorConfig';
import { formatDist } from './Huds/NavHUD/navHudFormatters';
import {
  createShipDirectionSplitLine,
  placeShipDirectionArrow,
  setShipDirectionArrowColor,
} from './shipDirectionArrow';
import {
  SHIP_DIRECTION_INDICATOR_FRAME_PRIORITY,
  syncShipDirectionScreenLabel,
  useShipDirectionScreenLabelRoot,
} from './ShipDirectionScreenLabel';

const TUTORIAL_NAV_DAEDALUS_ID = 'tutorial-daedalus';
const TUTORIAL_NAV_LUNA_ID = 'tutorial-luna';
const TUTORIAL_DOCKING_BAY_COLLIDER_ID = 'docking-bay-tutorial-space-station';

/** Find collidable by ID, also trying docking-bay- prefix (radio broadcast ID → collidable). */
function findCollidable(id: string): CollidableEntry | undefined {
  const all = getCollidables();
  return all.find((c) => c.id === id) ?? all.find((c) => c.id === `docking-bay-${id}`);
}

function resolveTargetLabel(): string {
  if (selectedTargetName) return selectedTargetName;
  const id = navTargetIdRef.current.trim();
  if (!id) return '';
  if (id === TUTORIAL_NAV_DAEDALUS_ID) return 'Daedalus';
  if (id === TUTORIAL_NAV_LUNA_ID) return 'Luna';
  if (id === FUEL_STATION_DEF.id) return FUEL_STATION_DEF.label;
  return id.replace(/-/g, ' ');
}

const _tgtWorld = new THREE.Vector3();
const _shipWorld = new THREE.Vector3();
const _toTgt = new THREE.Vector3();
const _targetVel = new THREE.Vector3();
const _colorDefault = new THREE.Color(SHIP_DIRECTION_TARGET_COLOR);
const _colorMagnetic = new THREE.Color(SHIP_DIRECTION_MAGNETIC_COLOR);

/** Local +Z offset past the arrow tip — label projects from this anchor. */
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
    const a = createShipDirectionSplitLine(SHIP_DIRECTION_TARGET_COLOR);
    a.scale.setScalar(SHIP_DIRECTION_VELOCITY_ARROW_SCALE);
    return a;
  }, []);

  const labelAnchorRef = useRef<THREE.Group>(null!);
  const screenLabelRef = useShipDirectionScreenLabelRoot();
  const nameRef = useRef<HTMLDivElement | null>(null);
  const metricsRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const root = screenLabelRef.current;
    if (!root) return;

    root.replaceChildren();
    const col = document.createElement('div');
    col.style.cssText =
      'display:flex;flex-direction:column;align-items:center;gap:2px;font-family:monospace;pointer-events:none;opacity:0.92;text-align:center;';

    const name = document.createElement('div');
    name.style.cssText =
      'font-size:9px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;white-space:nowrap;color:#9fdfff;text-shadow:0 0 8px rgba(159,223,255,0.55);';

    const metrics = document.createElement('div');
    metrics.style.cssText =
      'font-size:9px;letter-spacing:0.02em;white-space:nowrap;color:#9fdfff;text-shadow:0 0 8px rgba(159,223,255,0.55);';

    col.append(name, metrics);
    root.append(col);
    nameRef.current = name;
    metricsRef.current = metrics;

    return () => {
      nameRef.current = null;
      metricsRef.current = null;
      root.replaceChildren();
    };
  }, [screenLabelRef]);

  useFrame(({ camera, size }) => {
    if (!navHudEnabledRef.current) {
      arrow.visible = false;
      syncShipDirectionScreenLabel(null, screenLabelRef.current, camera, size, false);
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
      syncShipDirectionScreenLabel(null, screenLabelRef.current, camera, size, false);
      return;
    }

    const targetLabel = resolveTargetLabel();

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
        const liveCollidable = findCollidable(selectedTargetKey!);
        if (liveCollidable) {
          liveCollidable.getWorldPosition(tgt);
          selectedTargetPosition.copy(tgt);
          navTargetPosRef.current.copy(tgt);
        } else {
          // Fall back to radio broadcast live position
          const broadcast = getRadioBroadcasts().find((e) => e.id === selectedTargetKey);
          if (broadcast) {
            broadcast.getPosition(tgt);
            selectedTargetPosition.copy(tgt);
            navTargetPosRef.current.copy(tgt);
          } else {
            tgt.copy(selectedTargetPosition);
          }
        }
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
        const liveCollidable = findCollidable(nid);
        if (liveCollidable) {
          liveCollidable.getWorldPosition(tgt);
          navTargetPosRef.current.copy(tgt);
        } else {
          // Fall back to radio broadcast live position
          const broadcast = getRadioBroadcasts().find((e) => e.id === nid);
          if (broadcast) {
            broadcast.getPosition(tgt);
            navTargetPosRef.current.copy(tgt);
          } else {
            tgt.copy(navTargetPosRef.current);
          }
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
      syncShipDirectionScreenLabel(null, screenLabelRef.current, camera, size, false);
      return;
    }

    arrow.updateWorldMatrix(true, true);

    _toTgt.subVectors(tgt, _shipWorld);
    const distWorld = _toTgt.length();

    const showLabel = Boolean(targetLabel) && !minimapOverlayActiveRef.current;
    syncShipDirectionScreenLabel(
      labelAnchorRef.current,
      screenLabelRef.current,
      camera,
      size,
      showLabel
    );

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

    // ── Look up live target velocity ────────────────────────────────────
    _targetVel.set(0, 0, 0);
    if (hasSelectedPos && selectedTargetKey) {
      if (selectedTargetType === 'magnetic') {
        const liveMag = getMagneticTargets().find((m) => m.id === selectedTargetKey);
        if (liveMag?.getVelocity) liveMag.getVelocity(_targetVel);
      } else if (selectedTargetType === 'ship') {
        const liveDrive = getDriveSignatures().find((d) => d.id === selectedTargetKey);
        if (liveDrive?.getVelocity) liveDrive.getVelocity(_targetVel);
      } else {
        const liveCollidable = findCollidable(selectedTargetKey);
        if (liveCollidable?.getWorldVelocity) liveCollidable.getWorldVelocity(_targetVel);
      }
    } else {
      const nid = navTargetIdRef.current;
      const liveCollidable = findCollidable(nid);
      if (liveCollidable?.getWorldVelocity) liveCollidable.getWorldVelocity(_targetVel);
    }
    // Keep selectedTargetVelocity in sync so navHudDisplayUpdater gets fresh data.
    selectedTargetVelocity.copy(_targetVel);

    if (scanHudShowsReadout) {
      if (metricsRef.current) metricsRef.current.style.display = 'none';
    } else {
      const targetId = selectedTargetKey ?? navTargetIdRef.current;
      const relVel = getClosingSpeed(targetId, shipVelocity, _targetVel, _toTgt, distWorld);
      const relVelStr = `${relVel >= 0 ? '+' : ''}${relVel.toFixed(1)} m/s`;
      if (metricsRef.current) {
        metricsRef.current.style.display = '';
        metricsRef.current.textContent = `${formatDist(distWorld)} | ${relVelStr}`;
        metricsRef.current.style.color = nameColor;
        metricsRef.current.style.textShadow = nameShadow;
      }
    }
  }, SHIP_DIRECTION_INDICATOR_FRAME_PRIORITY);

  return (
    <primitive object={arrow}>
      <group ref={labelAnchorRef} position={[0, 0, TARGET_LABEL_LOCAL_Z]} />
    </primitive>
  );
}
