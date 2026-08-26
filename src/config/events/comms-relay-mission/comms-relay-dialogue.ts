// Emergency broadcast dialogue tree — Elias Voss at Donington Station.
// Fired as a narrative hail after the player completes a prerequisite mission.

import type { DialogueTree } from '../../../narrative/npcDialogues';
import { COMMS_RELAY_DIALOGUE_TREE_ID } from './comms-relay-config';

export const COMMS_RELAY_DIALOGUE_TREE: DialogueTree = {
  id: COMMS_RELAY_DIALOGUE_TREE_ID,
  captainName: 'Elias Voss',
  vesselName: 'Donington Station',
  openingTurnId: 'intro',
  kind: 'broadcast' as const,
  turns: {
    intro: {
      id: 'intro',
      npcText:
        "Something's wrong. We received a burst of emergency comms on all local arrays, but now everything's gone quiet. The system is dead. We're only getting local comms from ships within broadcast range.\n\nThere's a comms buffer satellite in Mars orbit — an automated relay node that caches incoming transmissions. If you can dock with it and download the emergency logs, we might be able to work out what happened.\n\nI can restock your fuel, O2, and power if you dock here first. You'll want to increase your radio scanner range to locate the satellite.",
      playerOptions: [
        {
          id: 'accept',
          label: 'I\'LL DO IT',
          text: "I'll find the satellite and get those logs.",
          nextTurnId: 'accepted',
        },
        {
          id: 'decline',
          label: 'NOT NOW',
          text: "I can't take this on right now.",
          nextTurnId: 'declined',
        },
        {
          id: 'restock',
          label: 'RESTOCK FIRST',
          text: "Top me up before I head out.",
          nextTurnId: 'resupply',
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
    resupply: {
      id: 'resupply',
      npcText:
        "Done — fuel, O2, and power reserves topped up. You're clear to proceed.\n\nThe comms buffer satellite is in Mars orbit. Increase your radio scanner range and sweep for it. Ready when you are.",
      playerOptions: [
        {
          id: 'accept-after-restock',
          label: 'HEADING OUT',
          text: "Thanks. I'll find the satellite.",
          nextTurnId: 'accepted',
        },
        {
          id: 'decline-after-restock',
          label: 'NOT NOW',
          text: "Appreciate the restock, but I can't do this right now.",
          nextTurnId: 'declined',
        },
      ],
    },
  },
};
