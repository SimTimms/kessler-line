import { getCargoContainer } from '../../../context/CargoContainerRegistry';
import { unregisterCollidable } from '../../../context/CollisionRegistry';
import { orbitStatusRef } from '../../../context/ShipState';
import { addCompletedMission, removeActiveMission } from '../../../context/MissionState';
import { addMessage } from '../../../context/MessageStore';
import { pushAlert } from '../../../context/AlertsStore';
import { fireNarrativeHail } from '../../../narrative/narrativeHail';
import { useRef, useEffect } from 'react';
import { NARRATIVE_DONINGTON_STATION_ID } from '../../../scenes/NarrativeConfig/narrativeSceneConfig';
import { deployedSatelliteRef } from '../../../context/DeployedSatelliteState';
import { shipVelocity } from '../../../context/ShipState';
import { useFrame } from '@react-three/fiber';
import type { ShipUndockedDetail } from '../../../hooks/shipPhysics/docking';

/** Any closed orbit around Mars (periapsis above surface) counts as stable enough. */
function isStableMarsOrbitForDeployment(): boolean {
  const status = orbitStatusRef.current;
  return status.bodyId === 'Mars' && status.isOrbiting === true;
}

function fireEliasVossHail() {
  fireNarrativeHail({
    contactId: 'elias-voss-satellite-confirmed',
    dialogueTreeId: 'elias-voss-satellite-hail',
    shipName: 'Donington Station',
    captainName: 'Elias Voss',
    dockHistory: {
      dockId: NARRATIVE_DONINGTON_STATION_ID,
      contactId: 'elias-voss',
    },
  });
}

export function NarrativeSatelliteMissionController({
  satelliteContainerId,
}: {
  satelliteContainerId: string;
}) {
  const missionArmedRef = useRef(false);
  const releaseHintShownRef = useRef(false);
  const completedRef = useRef(false);
  const wasTowedRef = useRef(false);

  useEffect(() => {
    const onUndocked = (e: Event) => {
      if (completedRef.current || !missionArmedRef.current || !wasTowedRef.current) return;
      if (!isStableMarsOrbitForDeployment()) return;

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
      fireEliasVossHail();
    };

    window.addEventListener('ShipUndocked', onUndocked);
    return () => window.removeEventListener('ShipUndocked', onUndocked);
  }, [satelliteContainerId]);

  useFrame(() => {
    if (completedRef.current) return;

    const satellite = getCargoContainer(satelliteContainerId);
    if (!satellite || satellite.isConsumed()) return;

    const isTowed = satellite.isTowed();
    if (isTowed && !missionArmedRef.current) {
      missionArmedRef.current = true;
      pushAlert(
        'Mission Updated: tow the satellite to stable Mars orbit, then release it.',
        'yellow'
      );
      addMessage({
        id: 'narrative-satellite-mission-brief',
        from: 'Comms Officer Elias Voss',
        subject: 'Deployment Briefing',
        body: 'Satellite package acquired. Move to stable Mars orbit and undock the Orbital Survey Satellite container to deploy.',
        platform: 'REACH',
      });
    }

    if (
      isTowed &&
      missionArmedRef.current &&
      !releaseHintShownRef.current &&
      isStableMarsOrbitForDeployment()
    ) {
      releaseHintShownRef.current = true;
      pushAlert('Stable Mars orbit confirmed. Undock now to deploy satellite.', 'blue');
    }

    // Failed deployment — released outside stable orbit.
    // (Successful deployment is handled by the ShipUndocked listener above.)
    if (wasTowedRef.current && !isTowed && missionArmedRef.current) {
      releaseHintShownRef.current = false;
      pushAlert('Deployment failed: release the container only in stable Mars orbit.', 'red');
    }

    wasTowedRef.current = isTowed;
  });

  return null;
}
