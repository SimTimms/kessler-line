import { getCargoContainer } from '../../../context/CargoContainerRegistry';
import { unregisterCollidable } from '../../../context/CollisionRegistry';
import { addCompletedMission, removeActiveMission } from '../../../context/MissionState';
import { pushAlert } from '../../../context/AlertsStore';
import { deployedSatelliteRef } from '../../../context/DeployedSatelliteState';
import { shipVelocity } from '../../../context/ShipState';
import type { ShipUndockedDetail } from '../../../hooks/shipPhysics/docking';

interface CompleteMissionProps {
  satelliteContainerId: string;
  completedRef: React.RefObject<boolean>;
}

export function completeMission({ satelliteContainerId, completedRef }: CompleteMissionProps) {
  const satellite = getCargoContainer(satelliteContainerId);

  if (!satellite || satellite.isConsumed()) return;

  completedRef.current = true;

  // Kill collision immediately — before CargoContainer's handler can re-register it
  unregisterCollidable(`${satelliteContainerId}`);

  // Capture release position and velocity for the deployed satellite.
  // Phase 1 (30 s) applies gravity so it tracks the same orbit as the ship.
  // Phase 2 locks into a non-physical circular orbit at the final position.
  const satPos = satellite.getSimPosition();
  const detail = (e as CustomEvent<ShipUndockedDetail>).detail;
  const releaseVel = detail?.partnerReleaseVelocity;
  deployedSatelliteRef.current = {
    releaseX: satPos.x,
    releaseZ: satPos.z,
    releaseVelX: releaseVel?.x ?? shipVelocity.x,
    releaseVelZ: releaseVel?.z ?? shipVelocity.z,
    yTarget: -30,
    deployed: true,
  };

  // Hide the cargo container and mark consumed — also prevents the CargoContainer
  // undock handler from re-enabling collision (it exits early when consumed).
  satellite.completeDropOff();

  pushAlert('Mission Complete: Mars satellite deployed.', 'blue');
  addCompletedMission('elias-voss-satellite-deployment');
  removeActiveMission('elias-voss-satellite-deployment');
  // fireEliasVossHail();
}
