import type * as THREE from 'three';
import { minimapShipPosition } from '../../../context/MinimapShipPosition';
import { shipPosRef } from '../../../context/ShipPos';
import {
  floatingOriginActiveRef,
  floatingOriginOffsetRef,
} from '../../../context/FloatingOrigin';

/** HUD/camera follow world position (required when the ship group has a moving parent). */
export function syncShipWorldRefs(group: THREE.Group, publishToPlayerRefs: boolean) {
  if (!publishToPlayerRefs) return;
  group.getWorldPosition(minimapShipPosition);
  shipPosRef.current.copy(minimapShipPosition);
  // FloatingOrigin rebases the scene graph; getWorldPosition is render-space. Keep
  // shipPosRef in simulation space for gravity, comms range, and FO focus.
  if (floatingOriginActiveRef.current) {
    shipPosRef.current.sub(floatingOriginOffsetRef.current);
  }
}
