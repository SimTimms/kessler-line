// Emergency broadcast dialogue — Elias Voss hands out the comms relay mission.
// Accepting / declining is what logs it in the journal, so the ids here must be
// the shared COMMS_RELAY_MISSION_ID: MISSION_DEFS is keyed on it, and
// JournalPanel drops any active mission it cannot find a definition for.

import type { DockDialogueTree } from '../../../types/dialogueTypes';
import type { DialogueEffect } from '../../../narrative/dialogueEffects';
import { COMMS_RELAY_MISSION_ID } from './comms-relay-config';

const acceptMissionEffect: DialogueEffect = {
  type: 'acceptMission',
  missionId: COMMS_RELAY_MISSION_ID,
};

const declineMissionEffect: DialogueEffect = {
  type: 'declineMission',
  missionId: COMMS_RELAY_MISSION_ID,
};

export const COMMS_RELAY_DIALOGUE_TREE: {
  missionId: string;
  missionDialogue: DockDialogueTree;
} = {
  missionId: COMMS_RELAY_MISSION_ID,
  missionDialogue: {
    id: 'elias-voss-comms-relay-mission',
    openingTurnId: 'intro',
    turns: {
      intro: {
        id: 'intro',
        npcText:
          "Something's wrong. We received a burst of emergency comms on all local arrays, but now everything's gone quiet. The system is dead. We're only getting local comms from ships within broadcast range.\n\nThere's a comms buffer satellite in Mars orbit — an automated relay node that caches incoming transmissions. If you can dock with it and download the emergency logs, we might be able to work out what happened.\n\nI can restock your fuel, O2, and power if you dock here first. You'll want to increase your radio scanner range to locate the satellite.",
        playerOptions: [
          {
            id: 'accept',
            label: "I'LL DO IT",
            text: "I'll find the satellite and get those logs.",
            nextTurnId: 'accepted',
            effects: [acceptMissionEffect],
          },
          {
            id: 'decline',
            label: 'NOT NOW',
            text: "I can't take this on right now.",
            nextTurnId: 'declined',
            effects: [declineMissionEffect],
          },
        ],
      },
      accepted: {
        id: 'accepted',
        npcText:
          "Good. The satellite should be in a mid-altitude Mars orbit — inclined, so it won't be on the ecliptic. Increase your radio scanner range and sweep for it. Once you dock, the buffer system should let you pull the logs directly.\n\nBring back whatever you find. Donington out.",
        playerOptions: [],
      },
      declined: {
        id: 'declined',
        npcText:
          "Understood. The satellite isn't going anywhere — the offer stands if you change your mind. Donington out.",
        playerOptions: [],
      },
    },
  },
};
