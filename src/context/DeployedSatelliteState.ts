/**
 * Module-level ref holding deployment data for the Elias Voss satellite mission.
 * Set when the satellite container is successfully released in stable Mars orbit.
 * Read by the DeployedSatellite component to animate descent and orbit lock.
 */
export const deployedSatelliteRef = {
  current: null as null | {
    /** XZ distance from Mars at release — orbit radius. */
    orbitRadius: number;
    /** rad/s, derived from ship tangential velocity / radius. */
    angularSpeed: number;
    /** atan2 of release position relative to Mars. */
    initialAngle: number;
    /** Target y offset relative to Mars. */
    yTarget: number;
    deployed: boolean;
  },
};
