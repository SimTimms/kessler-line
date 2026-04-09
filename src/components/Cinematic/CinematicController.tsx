import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cinematicThrustReverse, shipControlDisabledUntil } from '../../context/ShipState';
import {
  cinematicAutopilotActive,
  neptuneNoFlyZoneActive,
  neptuneNoFlyZoneMessage,
  shipInstructionMessage,
  chatterState,
  setCascadePhase,
  scrapperIntroActive,
} from '../../context/CinematicState';
import {
  SCRAPPER_BRAKE_EVENT_DELAY,
  SCRAPPER_CAPTAIN_CUE_DELAY,
  SCRAPPER_CONTROLS_ENABLE_DELAY,
} from '../../config/scrapperConfig';
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

  useEffect(() => {
    // ── Scrapper intro: lock controls until captain's cue ─────────────────────
    scrapperIntroActive.current = true;
    shipControlDisabledUntil.current = Infinity;

    const brakingChatterLines = [
      "Captain, we're losing the cargo pod—",
      'Braking thrusters are nominal. How far did it drift?',
      "It's heading for atmosphere. Someone needs to go get it.",
      'Pilot — your ship is in Bay 2. You know what to do.',
    ];

    let brakingTimers: ReturnType<typeof setTimeout>[] = [];

    const onBrakingStarted = () => {
      // Crewmate chatter
      chatterState.lines = brakingChatterLines;
      chatterState.index = 0;

      const releaseTimer = window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('ScrapperCargoRelease'));
      }, SCRAPPER_BRAKE_EVENT_DELAY);

      const captainTimer = window.setTimeout(() => {
        shipInstructionMessage.current = 'CAPTAIN: LAUNCH AND RETRIEVE THE CARGO';
      }, SCRAPPER_CAPTAIN_CUE_DELAY);

      const enableTimer = window.setTimeout(() => {
        scrapperIntroActive.current = false;
        shipControlDisabledUntil.current = 0;
        shipInstructionMessage.current = '';
      }, SCRAPPER_CONTROLS_ENABLE_DELAY);

      brakingTimers = [releaseTimer, captainTimer, enableTimer];
    };

    window.addEventListener('ScrapperBrakingStarted', onBrakingStarted);

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
      brakingTimers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener('ScrapperBrakingStarted', onBrakingStarted);
      cinematicAutopilotActive.current = false;
      cinematicThrustReverse.current = false;
      scrapperIntroActive.current = false;
      shipControlDisabledUntil.current = 0;
    };
  }, []);

  useFrame(() => {
    const planetPos = solarPlanetPositions.Neptune;
    if (!planetPos) return;

    neptuneWorld.current.set(planetPos.x * SOLAR_SYSTEM_SCALE, 0, planetPos.z * SOLAR_SYSTEM_SCALE);
    const distance = neptuneWorld.current.distanceTo(shipPosRef.current);

    if (!noFlyTriggered.current && distance <= NO_FLY_ZONE_DISTANCE) {
      noFlyTriggered.current = true;
      neptuneNoFlyZoneActive.current = true;
      neptuneNoFlyZoneMessage.current = 'NEPTUNE NO-FLY ZONE';
      shipInstructionMessage.current = 'AUTOPILOT: RETRO-BURN IMMEDIATELY';
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
