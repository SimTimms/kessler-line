import { completedMissionsRef } from '../../context/MissionState';
import {
  COMMS_RELAY_HAIL_CONTACT_ID,
  COMMS_RELAY_MISSION_ID,
} from './comms-relay-mission/comms-relay-config';
import { COMMS_RELAY_DIALOGUE_TREE } from './comms-relay-mission/comms-relay-dialogue';
import { ELIAS_VOSS_DIALOGUE } from '../../config/npcs/elias-voss';
import { dockContactThreadId } from '../../config/dockConfig';
import { setDockContactDialogue } from '../../context/DockablePartnerStore';
import { deliverDockDialogueTurn } from '../../utils/dockInteriorChat';
import type { TimedEventDef } from '../event-trigger';

export const ELIAS_VOSS_HAIL_EVENT_ID = 'elias-voss-hail';

/**
 * Hands Elias Voss the comms relay mission, whether or not the player happens
 * to be talking to him when it fires. Three things have to happen for that:
 *
 *  1. the source config gets the new tree, so a dock that unregisters and
 *     re-registers (scene teardown) still has the mission on him;
 *  2. the registered copy gets it too — `registerDock` shallow-copies every
 *     contact, and that copy is what the contacts list and dialogue panel read;
 *  3. an already-open conversation is moved onto the new tree's opening turn,
 *     since the panel only opens a conversation once per mount.
 */
export function fireEliasVossEmergencyHail(): void {
  // Nothing to ask for if the player already finished the relay mission.
  if (completedMissionsRef.current.includes(COMMS_RELAY_MISSION_ID)) return;

  const tree = COMMS_RELAY_DIALOGUE_TREE.missionDialogue;
  const missionId = COMMS_RELAY_DIALOGUE_TREE.missionId;

  ELIAS_VOSS_DIALOGUE.dialogue = tree;
  if (!ELIAS_VOSS_DIALOGUE.missionId) ELIAS_VOSS_DIALOGUE.missionId = [];
  if (!ELIAS_VOSS_DIALOGUE.missionId.includes(missionId)) {
    ELIAS_VOSS_DIALOGUE.missionId.push(missionId);
  }

  // Fires DOCKABLE_PARTNER_CHANGED, which re-renders the contacts HUD.
  const live = setDockContactDialogue(COMMS_RELAY_HAIL_CONTACT_ID, tree, missionId);
  if (!live) return; // no dock of his registered — the config swap is all we can do

  deliverDockDialogueTurn(
    dockContactThreadId(live.dockId, live.contact.id),
    tree,
    tree.openingTurnId
  );
}

export const eliasVossHailEvent: TimedEventDef = {
  id: ELIAS_VOSS_HAIL_EVENT_ID,
  label: 'Elias Voss — emergency broadcast',
  run: fireEliasVossEmergencyHail,
};
