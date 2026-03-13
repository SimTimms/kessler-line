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
import { addMessage } from '../context/MessageStore';
import { solarPlanetPositions } from '../context/SolarSystemMinimap';
import { SOLAR_SYSTEM_SCALE } from './SolarSystem';

const CINEMATIC_AUTOPILOT_DURATION = 10;
const NO_FLY_ZONE_DISTANCE = 20000;
const RADIO_CHATTER_INTERVAL = 4.5;
const FAMILY_MESSAGE_DELAY = 14000; // ms — a beat after autopilot ends

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
  const chatterIndex = useRef(0);
  const noFlyTriggered = useRef(false);
  const neptuneWorld = useRef(new THREE.Vector3());

  useEffect(() => {
    cinematicAutopilotActive.current = true;
    cinematicThrustReverse.current = true;
    chatterIndex.current = 0;
    noFlyTriggered.current = false;

    radioChatterMessage.current = RADIO_CHATTER_LINES[0];

    const autopilotTimer = window.setTimeout(() => {
      cinematicThrustReverse.current = false;
      cinematicAutopilotActive.current = false;
    }, CINEMATIC_AUTOPILOT_DURATION * 1000);

    const chatterTimer = window.setInterval(() => {
      chatterIndex.current = (chatterIndex.current + 1) % RADIO_CHATTER_LINES.length;
      radioChatterMessage.current = RADIO_CHATTER_LINES[chatterIndex.current];
    }, RADIO_CHATTER_INTERVAL * 1000);

    const familyMessageTimer = window.setTimeout(() => {
      addMessage({
        id: 'family-earth-1',
        from: 'Home — Earth, Sector 9',
        subject: 'Still here',
        body: `Power's been stable for three weeks now. The feeds are patchy but we're getting through.\n\nOksana's growing fast. She asks about you.\n\nWe're okay. Come back when you can.\n\n— M`,
      });
    }, FAMILY_MESSAGE_DELAY);

    return () => {
      window.clearTimeout(autopilotTimer);
      window.clearInterval(chatterTimer);
      window.clearTimeout(familyMessageTimer);
      cinematicAutopilotActive.current = false;
      cinematicThrustReverse.current = false;
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

      addMessage({
        id: 'neptune-control-1',
        from: 'Neptune Control — Traffic Authority',
        subject: 'Approach Corridor Closed',
        body: `Vessel, you have entered a restricted approach corridor.\n\nNo-fly zone is active. All docking rights for the inner ring are suspended pending security review.\n\nReverse thrust immediately and hold at minimum 20,000 units from the planet surface. Failure to comply will be treated as a hostile approach.\n\nNEPTUNE CONTROL OUT.`,
      });
    }
  });

  return null;
}
