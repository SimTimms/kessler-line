import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cinematicThrustReverse } from '../context/ShipState';
import {
  cinematicAutopilotActive,
  neptuneNoFlyZoneActive,
  neptuneNoFlyZoneMessage,
  shipInstructionMessage,
  chatterState,
  setCascadePhase,
} from '../context/CinematicState';
import { addMessage } from '../context/MessageStore';
import { solarPlanetPositions } from '../context/SolarSystemMinimap';
import { SOLAR_SYSTEM_SCALE } from './SolarSystem';
import {
  RADIO_CHATTER_LINES,
  RADIO_CHATTER_CASCADE_LINES,
  MSG_FAMILY_EARTH,
  MSG_NEPTUNE_CONTROL,
  MSG_EMPLOYER_RECALL,
} from '../narrative';

const CINEMATIC_AUTOPILOT_DURATION = 10;
const NO_FLY_ZONE_DISTANCE = 20000;
const FAMILY_MESSAGE_DELAY = 14000; // ms — a beat after autopilot ends
const EMPLOYER_RECALL_DELAY = 8000; // ms after Neptune no-fly triggers

interface CinematicControllerProps {
  shipPositionRef: { current: THREE.Vector3 };
}

export default function CinematicController({ shipPositionRef }: CinematicControllerProps) {
  const noFlyTriggered = useRef(false);
  const neptuneWorld = useRef(new THREE.Vector3());
  const employerRecallTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    cinematicAutopilotActive.current = true;
    cinematicThrustReverse.current = true;
    chatterState.lines = RADIO_CHATTER_LINES;
    chatterState.index = 0;
    noFlyTriggered.current = false;

    const autopilotTimer = window.setTimeout(() => {
      cinematicThrustReverse.current = false;
      cinematicAutopilotActive.current = false;
    }, CINEMATIC_AUTOPILOT_DURATION * 1000);

    const familyMessageTimer = window.setTimeout(() => {
      addMessage(MSG_FAMILY_EARTH);
    }, FAMILY_MESSAGE_DELAY);

    return () => {
      window.clearTimeout(autopilotTimer);
      window.clearTimeout(familyMessageTimer);
      if (employerRecallTimer.current) window.clearTimeout(employerRecallTimer.current);
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
      setCascadePhase('during');
      chatterState.lines = RADIO_CHATTER_CASCADE_LINES;
      chatterState.index = 0;
      addMessage(MSG_NEPTUNE_CONTROL);

      employerRecallTimer.current = window.setTimeout(() => {
        addMessage(MSG_EMPLOYER_RECALL);
      }, EMPLOYER_RECALL_DELAY);
    }
  });

  return null;
}
