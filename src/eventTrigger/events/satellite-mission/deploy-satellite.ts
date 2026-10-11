import { getCargoContainer } from '../../../context/CargoContainerRegistry';
import { orbitStatusRef } from '../../../context/ShipState';
import { addMessage } from '../../../context/MessageStore';
import { pushAlert } from '../../../context/AlertsStore';
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { completeMission } from './completeMission';
import { satelliteMission, ELIAS_VOSS_DIALOGUE } from '../../../config/npcs/elias-voss';
import type { DockDialogueTree } from '../../../types/dialogueTypes';

function isStableMarsOrbitForDeployment(): boolean {
  const status = orbitStatusRef.current;
  return status.bodyId === 'Mars' && status.isOrbiting === true;
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
    ELIAS_VOSS_DIALOGUE.missionId?.push(satelliteMission.missionId);
    ELIAS_VOSS_DIALOGUE.dialogue = satelliteMission.missionDialogue as DockDialogueTree;
  }, []);

  useEffect(() => {
    const onUndocked = (e: Event) => {
      if (completedRef.current || !missionArmedRef.current || !wasTowedRef.current) return;
      if (!isStableMarsOrbitForDeployment()) return;
      completeMission({ satelliteContainerId, completedRef });
    };
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

    if (wasTowedRef.current && !isTowed && missionArmedRef.current) {
      releaseHintShownRef.current = false;
      pushAlert('Deployment failed: release the container only in stable Mars orbit.', 'red');
    }

    wasTowedRef.current = isTowed;
  });

  return null;
}
