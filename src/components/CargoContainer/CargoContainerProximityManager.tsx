import { useFrame } from '@react-three/fiber';
import { forEachCargoContainer } from '../../context/CargoContainerRegistry';
import { shipPosRef } from '../../context/ShipPos';
import { navTargetIdRef } from '../../context/NavTarget';
import { CONTAINER_DOCKING_BAY_ACTIVATION_RANGE } from '../../config/containerConfig';

const RANGE_SQ =
  CONTAINER_DOCKING_BAY_ACTIVATION_RANGE * CONTAINER_DOCKING_BAY_ACTIVATION_RANGE;

/**
 * Single useFrame that handles proximity detection for every registered
 * CargoContainer. Replaces N individual per-container subscriptions with one
 * tight loop, eliminating R3F subscription overhead proportional to container
 * count (up to 32+ in the narrative scene).
 *
 * Mount once inside any scene that uses CargoContainer (e.g. via
 * SharedInteractionSceneTools).
 */
export default function CargoContainerProximityManager() {
  useFrame(() => {
    const ship = shipPosRef.current;
    const navTarget = navTargetIdRef.current;

    forEachCargoContainer((handle) => {
      if (handle.isConsumed()) return;
      // If this crate is currently docked/towed by the player, hide its helper
      // so guidance can return to other pads/stations/minimap targets.
      if (handle.isTowed()) {
        handle.setDockingBayProximity(false);
        return;
      }
      const pos = handle.getSimPosition();
      const dx = ship.x - pos.x;
      const dz = ship.z - pos.z;
      handle.setDockingBayProximity(dx * dx + dz * dz < RANGE_SQ || navTarget === handle.id);
    });
  });

  return null;
}
