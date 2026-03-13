import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cinematicThrustReverse } from '../context/ShipState';
import {
  cinematicAutopilotActive,
  neptuneNoFlyZoneActive,
  neptuneNoFlyZoneMessage,
  shipInstructionMessage,
  radioChatterMessage,
} from '../context/CinematicState';
import { solarPlanetPositions } from '../context/SolarSystemMinimap';
import { SOLAR_SYSTEM_SCALE } from './SolarSystem';

const CINEMATIC_AUTOPILOT_DURATION = 10;
const NO_FLY_ZONE_DISTANCE = 42000;
const RADIO_CHATTER_INTERVAL = 4.5;

const RADIO_CHATTER_LINES = [
  'BEACON: Cargo manifests synced. Neptune depot ETA stable.',
  'FREIGHTER-12: Offloading isotopes at the fuel depot, no delays expected.',
  'NEPTUNE TRAFFIC: Docking queues are heavy. Hold short of the outer ring.',
  'BEACON: Depot confirms refuel window in 20 minutes. Stand by.',
  'FREIGHTER-12: Requesting clearance for cargo drop. Awaiting response.',
];

interface CinematicControllerProps {
  shipPositionRef: { current: THREE.Vector3 };
}

export default function CinematicController({ shipPositionRef }: CinematicControllerProps) {
  const didInit = useRef(false);
  const chatterIndex = useRef(0);
  const noFlyTriggered = useRef(false);
  const neptuneWorld = useRef(new THREE.Vector3());

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    cinematicAutopilotActive.current = true;
    cinematicThrustReverse.current = true;

    radioChatterMessage.current = RADIO_CHATTER_LINES[0];

    const autopilotTimer = window.setTimeout(() => {
      cinematicThrustReverse.current = false;
      cinematicAutopilotActive.current = false;
    }, CINEMATIC_AUTOPILOT_DURATION * 1000);

    const chatterTimer = window.setInterval(() => {
      chatterIndex.current = (chatterIndex.current + 1) % RADIO_CHATTER_LINES.length;
      radioChatterMessage.current = RADIO_CHATTER_LINES[chatterIndex.current];
    }, RADIO_CHATTER_INTERVAL * 1000);

    return () => {
      window.clearTimeout(autopilotTimer);
      window.clearInterval(chatterTimer);
    };
  }, []);

  useFrame(() => {
    const planetPos = solarPlanetPositions.Neptune;
    if (!planetPos) return;

    neptuneWorld.current.set(planetPos.x * SOLAR_SYSTEM_SCALE, 0, planetPos.z * SOLAR_SYSTEM_SCALE);
    const distance = neptuneWorld.current.distanceTo(shipPositionRef.current);

    if (!noFlyTriggered.current && distance <= NO_FLY_ZONE_DISTANCE) {
      noFlyTriggered.current = true;
      neptuneNoFlyZoneActive.current = true;
      neptuneNoFlyZoneMessage.current = 'NEPTUNE NO-FLY ZONE';
      shipInstructionMessage.current = 'AUTOPILOT: RETRO-BURN IMMEDIATELY';
      radioChatterMessage.current = 'NEPTUNE CONTROL: Docking rights revoked. Clear the zone.';
    }
  });

  return null;
}
