import { completedMissionsRef } from '../../context/MissionState';
import {
  COMMS_RELAY_HAIL_CONTACT_ID,
  COMMS_RELAY_MISSION_ID,
} from './comms-relay-mission/comms-relay-config';
import { COMMS_RELAY_DIALOGUE_TREE } from './comms-relay-mission/comms-relay-dialogue';
import { ELIAS_VOSS_DIALOGUE } from '../../config/npcs/elias-voss';
import { addChatMessage, setChatTurn } from '../../context/ChatStore';
import type { TimedEventDef } from '../event-trigger';
import { ELIAS_VOSS_ID } from '../../config/npcs/elias-voss';

export const ELIAS_VOSS_HAIL_EVENT_ID = 'elias-voss-hail';

export function fireEliasVossEmergencyHail(): void {
  // Nothing to ask for if the player already finished the relay mission.
  if (completedMissionsRef.current.includes(COMMS_RELAY_MISSION_ID)) return;
  ELIAS_VOSS_DIALOGUE.missionId?.push(COMMS_RELAY_DIALOGUE_TREE.missionId);
  ELIAS_VOSS_DIALOGUE.dialogue = COMMS_RELAY_DIALOGUE_TREE.missionDialogue as any;
  console.log('ELIAS_VOSS_DIALOGUE_UPDATE', ELIAS_VOSS_DIALOGUE);

  /*
  addChatMessage(ELIAS_VOSS_ID, {
    id: 'hail-emergency',
    role: 'npc',
    text: 'hey',
    timestamp: Date.now(),
  });
  console.log('setChatTurn 2', ELIAS_VOSS_DIALOGUE);

  setChatTurn(ELIAS_VOSS_ID, 'hail-emergency', false);
  */
}

export const eliasVossHailEvent: TimedEventDef = {
  id: ELIAS_VOSS_HAIL_EVENT_ID,
  label: 'Elias Voss — emergency broadcast',
  run: fireEliasVossEmergencyHail,
};
