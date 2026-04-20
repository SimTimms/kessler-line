import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cinematicThrustReverse } from '../../context/ShipState';
import {
  cinematicAutopilotActive,
  neptuneNoFlyZoneActive,
  shipInstructionMessage,
  chatterState,
  setCascadePhase,
} from '../../context/CinematicState';
import { useContainerRendezvousTutorial } from '../../tutorials/container-rendezvous-tutorial';
import { addMessage } from '../../context/MessageStore';
import { solarPlanetPositions } from '../../context/SolarSystemMinimap';
import { SOLAR_SYSTEM_SCALE } from '../Planets/SolarSystem';
import { NO_FLY_ZONE_DISTANCE, EMPLOYER_RECALL_DELAY } from '../../config/neptuneConfig';
import { shipPosRef } from '../../context/ShipPos';
import { RADIO_CHATTER_LINES, RADIO_CHATTER_CASCADE_LINES } from '../../narrative';
import {
  MSG_DISPATCH_INTRO,
  MSG_FAMILY_EARTH,
  MSG_NEPTUNE_CONTROL,
  MSG_EMPLOYER_RECALL,
  treeToInboxMessage,
} from '../../narrative/npcDialogues';

const CINEMATIC_AUTOPILOT_DURATION = 10;
const FAMILY_MESSAGE_DELAY = 4000; // ms — a beat after autopilot ends
const CASCADE_TRIGGER_DELAY = 30000; // ms — cascade begins 30s after game start

export default function CinematicController() {
  const noFlyTriggered = useRef(false);
  const neptuneWorld = useRef(new THREE.Vector3());
  const employerRecallTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Container rendezvous timeline/hints live in tutorials/.
  useContainerRendezvousTutorial({ enabled: true });

  useEffect(() => {
    cinematicAutopilotActive.current = false;
    cinematicThrustReverse.current = false;
    chatterState.lines = RADIO_CHATTER_LINES;
    chatterState.index = 0;
    noFlyTriggered.current = false;

    const autopilotTimer = window.setTimeout(() => {
      cinematicThrustReverse.current = false;
      cinematicAutopilotActive.current = false;
    }, CINEMATIC_AUTOPILOT_DURATION * 1000);

    const dispatchIntroTimer = window.setTimeout(() => {
      addMessage(treeToInboxMessage(MSG_DISPATCH_INTRO), 'outer-lanes-dispatch');
    }, 3000);

    const familyMessageTimer = window.setTimeout(() => {
      addMessage(treeToInboxMessage(MSG_FAMILY_EARTH), 'family-earth');
    }, FAMILY_MESSAGE_DELAY);

    const cascadeTimer = window.setTimeout(() => {
      if (!noFlyTriggered.current) {
        setCascadePhase('during');
        chatterState.lines = RADIO_CHATTER_CASCADE_LINES;
        chatterState.index = 0;
      }
    }, CASCADE_TRIGGER_DELAY);

    return () => {
      window.clearTimeout(autopilotTimer);
      window.clearTimeout(dispatchIntroTimer);
      window.clearTimeout(familyMessageTimer);
      window.clearTimeout(cascadeTimer);
      if (employerRecallTimer.current) window.clearTimeout(employerRecallTimer.current);
      cinematicAutopilotActive.current = false;
      cinematicThrustReverse.current = false;
    };
  }, []);

  useFrame(() => {
    // ── Neptune no-fly zone ───────────────────────────────────────────────────
    const planetPos = solarPlanetPositions.Neptune;
    if (!planetPos) return;

    neptuneWorld.current.set(planetPos.x * SOLAR_SYSTEM_SCALE, 0, planetPos.z * SOLAR_SYSTEM_SCALE);
    const distance = neptuneWorld.current.distanceTo(shipPosRef.current);

    if (!noFlyTriggered.current && distance <= NO_FLY_ZONE_DISTANCE) {
      noFlyTriggered.current = true;
      neptuneNoFlyZoneActive.current = true;
      shipInstructionMessage.current = '';
      setCascadePhase('during');
      chatterState.lines = RADIO_CHATTER_CASCADE_LINES;
      chatterState.index = 0;
      addMessage(treeToInboxMessage(MSG_NEPTUNE_CONTROL), 'neptune-control');

      employerRecallTimer.current = window.setTimeout(() => {
        addMessage(treeToInboxMessage(MSG_EMPLOYER_RECALL), 'outer-lanes-dispatch');
      }, EMPLOYER_RECALL_DELAY);
    }
  });

  return null;
}
