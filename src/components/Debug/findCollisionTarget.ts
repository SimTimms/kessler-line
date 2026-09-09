import { getCollidables, type CollidableEntry } from '../../context/CollisionRegistry';
import { SHIP_COLLISION_ID } from '../../context/ShipState';

/**
 * Selects a collision target using priority-based fallback:
 * preferred target → ship → first valid collidable.
 */
export function findCollisionTarget(
  preferredTargetId: string | undefined
): CollidableEntry | null {
  const collidables = getCollidables();
  if (preferredTargetId) {
    const preferred = collidables.find((entry) => entry.id === preferredTargetId);
    if (preferred) return preferred;
  }
  const shipTarget = collidables.find((entry) => entry.id === SHIP_COLLISION_ID);
  if (shipTarget) return shipTarget;
  return (
    collidables.find(
      (entry) =>
        !entry.id.startsWith('debug-collision-test-') &&
        !entry.id.startsWith('docking-bay-') &&
        entry.physicalCollision !== false
    ) ?? null
  );
}
