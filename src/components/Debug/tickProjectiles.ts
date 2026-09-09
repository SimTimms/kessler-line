import { unregisterCollidable, getCollidables } from '../../context/CollisionRegistry';
import type { CollidableEntry } from '../../context/CollisionRegistry';
import { collideProjectile } from './collideProjectile';
import type { TestProjectile } from './spawnProjectile';

const PROJECTILE_LIFETIME_SEC = 4;

/**
 * Advances all projectiles by one frame: ages them, removes expired ones,
 * integrates position, and resolves collisions against targets.
 * Compacts the array in place so expired projectiles are pruned.
 */
export function tickProjectiles(
  projectiles: TestProjectile[],
  deltaSec: number,
  preferredTargetId: string | undefined,
  findTarget: () => CollidableEntry | null
): void {
  let write = 0;
  for (let i = 0; i < projectiles.length; i++) {
    const projectile = projectiles[i];
    projectile.ageSec += deltaSec;

    //remove expired projectiles
    if (projectile.ageSec > PROJECTILE_LIFETIME_SEC) {
      unregisterCollidable(projectile.id);
      continue;
    }

    projectile.position.addScaledVector(projectile.velocity, deltaSec);
    const target =
      getCollidables().find((entry) => entry.id === projectile.targetId) ?? findTarget();
    if (target) {
      collideProjectile(projectile, target, preferredTargetId);
    }
    //use write instead of i to avoid copying expired projectiles
    projectiles[write++] = projectile;
  }
  projectiles.length = write;
}
