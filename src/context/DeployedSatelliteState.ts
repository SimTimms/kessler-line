/**
 * Module-level ref holding deployment data for the Elias Voss satellite mission.
 * Set when the satellite container is successfully released in stable Mars orbit.
 * Read by the DeployedSatellite component to run a two-phase animation:
 *   Phase 1 — physics (gravity + velocity) for PHYSICS_DURATION seconds
 *   Phase 2 — non-physical circular orbit locked at the final position
 */
export const deployedSatelliteRef = {
  current: null as null | {
    /** World X position at release. */
    releaseX: number;
    /** World Z position at release. */
    releaseZ: number;
    /** World velocity X at release (pre-impulse ship velocity). */
    releaseVelX: number;
    /** World velocity Z at release (pre-impulse ship velocity). */
    releaseVelZ: number;
    /** Target y offset relative to Mars after descent. */
    yTarget: number;
    deployed: boolean;
  },
};
