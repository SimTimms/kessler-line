/**
 * Elias Voss — emergency broadcast hail.
 *
 * Previously a debug `setTimeout` inside CommsRelayMissionController. Now armed
 * by the scene via `registerTimedEvent(ELIAS_VOSS_HAIL_EVENT_ID, <ms>)`.
 */

import { completedMissionsRef } from '../../context/MissionState';
import { fireNarrativeHail } from '../../narrative/narrativeHail';
import { ELIAS_VOSS } from '../../config/npcs/elias-voss';
import {
  COMMS_RELAY_MISSION_ID,
  COMMS_RELAY_HAIL_CONTACT_ID,
  COMMS_RELAY_DIALOGUE_TREE_ID,
} from '../../config/events/comms-relay-mission/comms-relay-config';
import type { TimedEventDef } from '../event-trigger';

export const ELIAS_VOSS_HAIL_EVENT_ID = 'elias-voss-hail';

export function fireEliasVossEmergencyHail(): void {
  // Nothing to ask for if the player already finished the relay mission.
  if (completedMissionsRef.current.includes(COMMS_RELAY_MISSION_ID)) return;

  fireNarrativeHail({
    contactId: COMMS_RELAY_HAIL_CONTACT_ID,
    dialogueTreeId: COMMS_RELAY_DIALOGUE_TREE_ID,
    shipName: 'Donington Station',
    captainName: 'Elias Voss',
    personId: ELIAS_VOSS.id,
  });
}

export const eliasVossHailEvent: TimedEventDef = {
  id: ELIAS_VOSS_HAIL_EVENT_ID,
  label: 'Elias Voss — emergency broadcast',
  run: fireEliasVossEmergencyHail,
};
