import * as THREE from 'three';
import { SHIP_DIRECTION_RING_OPACITY } from '../../config/shipDirectionIndicatorConfig';
import { shipVelocity } from '../Ship/Spaceship';
import { placeShipDirectionArrow } from '../shipDirectionArrow';
import { syncShipDirectionScreenLabel } from '../ShipDirectionScreenLabel';
import { SCREEN_LABEL_OFFSET_Y_PX } from './constants';
import type { IndicatorObjects } from './indicatorObjects';
import type { IndicatorLabels, ViewportSize } from './types';

/**
 * Centres the ring on the ship and points the arrow along the ship's velocity.
 * The speed label is always hidden.
 */
export function updateVelocityArrow(
  objects: IndicatorObjects,
  shipWorld: THREE.Vector3,
  labels: IndicatorLabels,
  camera: THREE.Camera,
  size: ViewportSize
) {
  const { directionRing, velocityArrow } = objects;

  directionRing.visible = true;
  directionRing.position.copy(shipWorld);
  (directionRing.material as THREE.LineBasicMaterial).opacity = SHIP_DIRECTION_RING_OPACITY;

  const placed = placeShipDirectionArrow(
    velocityArrow,
    shipWorld.x,
    shipWorld.y,
    shipWorld.z,
    shipVelocity.x,
    shipVelocity.z
  );
  // The label anchor is a child of the arrow, so its matrix must be current before projecting.
  if (placed) velocityArrow.updateWorldMatrix(true, true);

  syncShipDirectionScreenLabel(
    labels.speedAnchorRef.current,
    labels.speedRootRef.current,
    camera,
    size,
    false,
    SCREEN_LABEL_OFFSET_Y_PX
  );
}
