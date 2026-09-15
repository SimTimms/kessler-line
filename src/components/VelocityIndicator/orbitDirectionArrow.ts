import type * as THREE from 'three';
import type { GravityBody } from '../../context/GravityRegistry';
import { minimapOverlayActiveRef } from '../../context/MinimapUi';
import { circularSpeed } from '../../maths/gravity';
import { shipVelocity } from '../Ship/Spaceship';
import { placeShipDirectionArrow } from '../shipDirectionArrow';
import { syncShipDirectionScreenLabel } from '../ShipDirectionScreenLabel';
import { SCREEN_LABEL_OFFSET_Y_PX } from './constants';
import type { IndicatorObjects } from './indicatorObjects';
import type { IndicatorLabels, ViewportSize } from './types';

/**
 * Points the orbit arrow in the direction of a circular orbit around `body`
 * (perpendicular to the body→ship line), flipped to match the way the ship is
 * already moving, and labels it with the circular speed at the ship's distance.
 */
export function updateOrbitDirectionArrow(
  objects: IndicatorObjects,
  body: GravityBody,
  shipPos: THREE.Vector3,
  shipWorld: THREE.Vector3,
  labels: IndicatorLabels,
  camera: THREE.Camera,
  size: ViewportSize
) {
  // Unit vector from the body to the ship
  const dx = shipPos.x - body.position.x;
  const dz = shipPos.z - body.position.z;
  const distance = Math.sqrt(dx * dx + dz * dz) || 1;
  const radialX = dx / distance;
  const radialZ = dz / distance;

  // Rotate 90° to get the orbit direction, then flip it to match the ship's travel
  const tangentX = -radialZ;
  const tangentZ = radialX;
  const relativeVelX = shipVelocity.x - body.velocity.x;
  const relativeVelZ = shipVelocity.z - body.velocity.z;
  const travelSign = relativeVelX * tangentX + relativeVelZ * tangentZ >= 0 ? 1 : -1;

  const { orbitDirArrow, orbitDirRing } = objects;
  orbitDirRing.visible = true;
  orbitDirRing.position.copy(shipWorld);

  const placed = placeShipDirectionArrow(
    orbitDirArrow,
    shipWorld.x,
    shipWorld.y,
    shipWorld.z,
    tangentX * travelSign,
    tangentZ * travelSign
  );
  // The label anchor is a child of the arrow, so its matrix must be current before projecting.
  if (placed) orbitDirArrow.updateWorldMatrix(true, true);

  const showLabel = placed && !minimapOverlayActiveRef.current;
  syncShipDirectionScreenLabel(
    labels.orbitReqAnchorRef.current,
    labels.orbitReqRootRef.current,
    camera,
    size,
    showLabel,
    SCREEN_LABEL_OFFSET_Y_PX
  );

  const labelText = labels.orbitReqTextRef.current;
  if (labelText && showLabel) {
    labelText.textContent = `${circularSpeed(body.mu, Math.max(distance, 1)).toFixed(1)} m/s`;
  }
}

/** Hides the orbit arrow, its ring and its label. */
export function hideOrbitDirectionArrow(
  objects: IndicatorObjects,
  labels: IndicatorLabels,
  camera: THREE.Camera,
  size: ViewportSize
) {
  objects.orbitDirArrow.visible = false;
  objects.orbitDirRing.visible = false;
  syncShipDirectionScreenLabel(null, labels.orbitReqRootRef.current, camera, size, false);
}
