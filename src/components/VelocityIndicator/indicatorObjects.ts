import * as THREE from 'three';
import {
  SHIP_DIRECTION_ORBIT_COLOR,
  SHIP_DIRECTION_VELOCITY_ARROW_SCALE,
  SHIP_DIRECTION_VELOCITY_COLOR,
} from '../../config/shipDirectionIndicatorConfig';
import {
  createShipDirectionLine,
  createShipDirectionRing,
  createShipDirectionTripleLine,
} from '../shipDirectionArrow';
import { syncShipDirectionScreenLabel } from '../ShipDirectionScreenLabel';
import { createApsisMarker } from './apsisMarkers';
import { APSIS_COLOR, ORBIT_DIR_RING_OPACITY, TRAJ_STEPS } from './constants';
import { createOrbitGuideLine, createOrbitLabel } from './orbitGuide';
import type { IndicatorLabels, ViewportSize } from './types';

/** Creates every Three.js object the indicator draws. Called once per mount. */
export function createIndicatorObjects() {
  const velocityArrow = createShipDirectionLine(SHIP_DIRECTION_VELOCITY_COLOR);
  velocityArrow.scale.setScalar(SHIP_DIRECTION_VELOCITY_ARROW_SCALE);

  const orbitDirArrow = createShipDirectionTripleLine(SHIP_DIRECTION_ORBIT_COLOR);
  orbitDirArrow.scale.setScalar(SHIP_DIRECTION_VELOCITY_ARROW_SCALE);
  const orbitDirRing = createShipDirectionRing(SHIP_DIRECTION_ORBIT_COLOR);
  (orbitDirRing.material as THREE.LineBasicMaterial).opacity = ORBIT_DIR_RING_OPACITY;

  const orbitGuide = createOrbitGuideLine();
  const orbitLabel = createOrbitLabel();

  return {
    // Velocity arrow
    velocityArrow,
    directionRing: createShipDirectionRing(SHIP_DIRECTION_VELOCITY_COLOR),

    // Orbit direction arrow
    orbitDirArrow,
    orbitDirRing,

    /** Ship-relative trajectory points from the worker. Not drawn — only read for Pe/Ap positions. */
    posArr: new Float32Array(TRAJ_STEPS * 3),

    // Orbit guide
    orbitLine: orbitGuide.line,
    orbitPosArr: orbitGuide.positions,
    orbitSprite: orbitLabel.sprite,
    orbitSpriteCtx: orbitLabel.ctx,

    // Pe / Ap markers
    periMarker: createApsisMarker(APSIS_COLOR),
    apoMarker: createApsisMarker(APSIS_COLOR),
  };
}

export type IndicatorObjects = ReturnType<typeof createIndicatorObjects>;

/** Hides every object and label, e.g. when the nav HUD is turned off. */
export function hideAllIndicators(
  objects: IndicatorObjects,
  labels: IndicatorLabels,
  camera: THREE.Camera,
  size: ViewportSize
) {
  objects.velocityArrow.visible = false;
  objects.directionRing.visible = false;
  objects.orbitDirArrow.visible = false;
  objects.orbitDirRing.visible = false;
  syncShipDirectionScreenLabel(null, labels.speedRootRef.current, camera, size, false);
  syncShipDirectionScreenLabel(null, labels.orbitReqRootRef.current, camera, size, false);
  objects.orbitLine.visible = false;
  objects.orbitSprite.visible = false;
  objects.periMarker.sprite.visible = false;
  objects.apoMarker.sprite.visible = false;
}
