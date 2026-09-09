import { unregisterCollidable } from '../../context/CollisionRegistry';

/**
 * Unregisters all projectiles from the collision registry and empties the array.
 */
export function clearProjectiles(projectiles: { id: string }[]): void {
  for (const projectile of projectiles) {
    unregisterCollidable(projectile.id);
  }
  projectiles.length = 0;
}
