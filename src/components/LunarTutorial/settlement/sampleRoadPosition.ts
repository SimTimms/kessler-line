import * as THREE from 'three';
import { slerpSurface, surfaceNormalAt } from './settlementSphere';

const _normal = new THREE.Vector3();

/** Position a vehicle along a road geodesic, slightly above the surface. */
export function sampleRoadPosition(
  start: THREE.Vector3,
  end: THREE.Vector3,
  frac: number,
  moonRadius: number,
  surfaceLift: number,
  hoverLift: number,
  out: THREE.Vector3
): THREE.Vector3 {
  slerpSurface(start, end, frac, moonRadius, surfaceLift, out);
  surfaceNormalAt(out, _normal);
  return out.addScaledVector(_normal, hoverLift);
}
