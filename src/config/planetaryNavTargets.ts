import * as THREE from 'three';
import { gravityBodies } from '../context/GravityRegistry';
import { PLANETS } from '../components/Planets/SolarSystem';

export interface PlanetaryNavTarget {
  id: string;
  label: string;
  getPosition: (out: THREE.Vector3) => THREE.Vector3;
  getVelocity?: (out: THREE.Vector3) => THREE.Vector3;
}

const _origin = new THREE.Vector3();

/** Live position from a gravity-registry body (`planetName` on {@link OrbitingPlanet}). */
export function gravityBodyNavTarget(
  bodyId: string,
  label: string = bodyId,
  navId: string = bodyId,
): PlanetaryNavTarget {
  return {
    id: navId,
    label,
    getPosition: (out) => {
      const body = gravityBodies.get(bodyId);
      return body ? out.copy(body.position) : out.copy(_origin);
    },
    getVelocity: (out) => {
      const body = gravityBodies.get(bodyId);
      return body ? out.copy(body.velocity) : out.set(0, 0, 0);
    },
  };
}

/** World position from a ref updated elsewhere (e.g. tutorial sun orbit). */
export function positionRefNavTarget(
  id: string,
  label: string,
  positionRef: { current: THREE.Vector3 },
): PlanetaryNavTarget {
  return {
    id,
    label,
    getPosition: (out) => out.copy(positionRef.current),
  };
}

/** Build persistent nav targets for arbitrary major bodies in a scene. */
export function planetaryNavTargetsFromBodies(
  bodies: ReadonlyArray<{ bodyId: string; label?: string; id?: string }>,
): PlanetaryNavTarget[] {
  return bodies.map(({ bodyId, label, id }) =>
    gravityBodyNavTarget(bodyId, label ?? bodyId, id ?? bodyId),
  );
}

/** Full solar system — every planet rendered by {@link SolarSystem}. */
export const SANDBOX_PLANETARY_NAV_TARGETS: PlanetaryNavTarget[] = PLANETS.map((p) =>
  gravityBodyNavTarget(p.name),
);
