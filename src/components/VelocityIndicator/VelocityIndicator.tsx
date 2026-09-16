import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { navHudEnabledRef } from '../../context/NavHud';
import { shipPosRef } from '../../context/ShipPos';
import {
  SHIP_DIRECTION_INDICATOR_FRAME_PRIORITY,
  useShipDirectionScreenLabelRoot,
} from '../ShipDirectionScreenLabel';
import { updateApsisMarkers } from './apsisMarkers';
import {
  ORBIT_REQ_LABEL_LOCAL_Z,
  ORBIT_REQ_LABEL_STYLE,
  SPEED_LABEL_LOCAL_Z,
  SPEED_LABEL_STYLE,
} from './constants';
import { createIndicatorObjects, hideAllIndicators } from './indicatorObjects';
import { hideOrbitDirectionArrow, updateOrbitDirectionArrow } from './orbitDirectionArrow';
import { getIdealOrbitRadius, positionOrbitGuide, setOrbitGuideVisible } from './orbitGuide';
import { trajectoryCache } from './trajectoryCache';
import { isTrajectoryRequestDue, requestShipTrajectory } from './trajectoryRequest';
import type { IndicatorLabels } from './types';
import { useScreenLabelElement } from './useScreenLabelElement';
import { updateVelocityArrow } from './velocityArrow';

const _shipWorld = new THREE.Vector3();

export default function VelocityIndicator({
  shipGroupRef,
}: {
  shipGroupRef: RefObject<THREE.Group>;
}) {
  const speedAnchorRef = useRef<THREE.Group>(null!);
  const speedRootRef = useShipDirectionScreenLabelRoot();
  const orbitReqAnchorRef = useRef<THREE.Group>(null!);
  const orbitReqRootRef = useShipDirectionScreenLabelRoot();

  useScreenLabelElement(speedRootRef, SPEED_LABEL_STYLE);
  const orbitReqTextRef = useScreenLabelElement(orbitReqRootRef, ORBIT_REQ_LABEL_STYLE);

  const labels: IndicatorLabels = {
    speedAnchorRef,
    speedRootRef,
    orbitReqAnchorRef,
    orbitReqRootRef,
    orbitReqTextRef,
  };

  const objects = useMemo(() => createIndicatorObjects(), []);

  useFrame(({ camera, size }) => {
    if (!navHudEnabledRef.current) {
      hideAllIndicators(objects, labels, camera, size);
      return;
    }

    const shipGroup = shipGroupRef.current;
    if (!shipGroup) return;
    // Update the ship group's world matrix as it's updated every frame with physics
    // recalculate the ship's world position to get the latest position
    shipGroup.getWorldPosition(_shipWorld);
    const ship = shipPosRef.current;

    // 1. Velocity arrow
    updateVelocityArrow(objects, _shipWorld, labels, camera, size);

    // 2. Every few frames, ask the worker for a new trajectory (fills trajectoryCache)
    if (isTrajectoryRequestDue()) requestShipTrajectory(objects);

    // 3. Pe/Ap markers from the cached trajectory
    updateApsisMarkers(objects, ship.x, ship.z, camera, size.height);

    // 4. Orbit guide and orbit direction arrow — only when orbiting a body
    const body = trajectoryCache.primaryBody;
    setOrbitGuideVisible(objects, body !== null);

    if (!body || getIdealOrbitRadius(body) <= body.surfaceRadius) {
      hideOrbitDirectionArrow(objects, labels, camera, size);
      return;
    }

    if (trajectoryCache.primaryIsPlanet) {
      updateOrbitDirectionArrow(objects, body, ship, _shipWorld, labels, camera, size);
    } else {
      hideOrbitDirectionArrow(objects, labels, camera, size);
    }

    positionOrbitGuide(objects, body);
  }, SHIP_DIRECTION_INDICATOR_FRAME_PRIORITY);

  return (
    <>
      <primitive object={objects.directionRing} />
      <primitive object={objects.velocityArrow}>
        <group ref={speedAnchorRef} position={[0, 0, SPEED_LABEL_LOCAL_Z]} />
      </primitive>
      <primitive object={objects.orbitDirRing} />
      <primitive object={objects.orbitDirArrow}>
        <group ref={orbitReqAnchorRef} position={[0, 0, ORBIT_REQ_LABEL_LOCAL_Z]} />
      </primitive>
      <primitive object={objects.orbitLine} />
      <primitive object={objects.orbitSprite} />
      <primitive object={objects.periMarker.sprite} />
      <primitive object={objects.apoMarker.sprite} />
    </>
  );
}
