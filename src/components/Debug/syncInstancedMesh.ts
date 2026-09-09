import * as THREE from 'three';
import type { TestProjectile } from './spawnProjectile';

const _dummy = new THREE.Object3D();

/**
 * Copies projectile positions into an InstancedMesh's instance matrices
 * so the GPU renders each projectile at its current location.
 */
export function syncInstancedMesh(
  mesh: THREE.InstancedMesh,
  projectiles: TestProjectile[],
  maxCount: number,
): void {
  const visibleCount = Math.min(projectiles.length, maxCount);
  mesh.count = visibleCount;
  for (let i = 0; i < visibleCount; i++) {
    _dummy.position.copy(projectiles[i].position);
    _dummy.quaternion.identity();
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}
