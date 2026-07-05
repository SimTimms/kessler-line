import type { DockContact, DockConfig, DockDialogueTree } from '../dockConfig';

export const DOCKMASTER_DIALOGUE: DockDialogueTree = {
  id: 'dockmaster',
  openingTurnId: 'intro',
  turns: {
    intro: {
      id: 'intro',
      npcText:
        "Korr, dockmaster. Your cradle's clamped and the meter's running. Fuel's rationed this cycle, but I can spare you some off the reserve line — for a number. What do you need?",
      playerOptions: [
        {
          id: 'ask-fuel',
          label: 'Buy fuel off the reserve line',
          text: "I'm running low. Put some on my tanks and bill me.",
          nextTurnId: 'fuel-done',
          effects: [
            {
              type: 'transferResource',
              resource: 'fuel',
              amount: 35,
              resultText: 'Reserve line opened — +35 fuel on your tanks.',
            },
          ],
        },
        {
          id: 'ask-work',
          label: 'Any work going?',
          text: 'Before I undock — any cargo work on the board?',
          nextTurnId: 'work-offer',
        },
        {
          id: 'ask-shady',
          label: 'Ask about off-manifest runs',
          text: "Word is there's freight that doesn't make the manifest. That true?",
          nextTurnId: 'shady-offer',
        },
        {
          id: 'leave',
          label: 'Nothing — undocking',
          text: "Nothing today, Korr. I'll clear the cradle.",
          nextTurnId: null,
        },
      ],
    },
    'fuel-done': {
      id: 'fuel-done',
      npcText:
        "Done. Tanks are reading fuller. Don't redline my reserve again or the Authority docks us both. Anything else?",
      playerOptions: [
        {
          id: 'fuel-to-work',
          label: 'Any work going?',
          text: 'Appreciated. While I have you — work on the board?',
          nextTurnId: 'work-offer',
        },
        {
          id: 'fuel-leave',
          label: "That's all",
          text: "That's all. Clear me for departure.",
          nextTurnId: null,
        },
      ],
    },
    'work-offer': {
      id: 'work-offer',
      npcText:
        "One parcel. Sealed med-crate for the inner relays — courier rate, no questions. Take it and I'll flag the drop coordinates to your inbox. Deal?",
      playerOptions: [
        {
          id: 'work-accept',
          label: 'Take the parcel',
          text: "I'll run it. Load it and send the coordinates.",
          nextTurnId: 'work-accepted',
          effects: [
            {
              type: 'giveCargo',
              item: 'Sealed Med-Crate',
              qty: 1,
              resultText: 'Med-crate loaded into the hold.',
            },
            {
              type: 'shareInfo',
              from: 'Helix Port Authority — Korr',
              subject: 'Courier drop · med-crate',
              text: 'Drop coordinates for the sealed med-crate are attached. Inner relay cluster. Courier rate on delivery. No questions, no signature. — Korr',
              platform: 'HERALD',
              resultText: 'Drop coordinates logged to your inbox.',
            },
          ],
        },
        {
          id: 'work-decline',
          label: 'Pass',
          text: "Not this run. I'll pass.",
          nextTurnId: 'intro',
        },
      ],
    },
    'work-accepted': {
      id: 'work-accepted',
      npcText:
        "Good. It's in your hold and the coordinates are on your inbox. Fly safe — that crate's worth more than your ship.",
      playerOptions: [
        {
          id: 'work-ack',
          label: 'Understood',
          text: 'Understood. Undocking.',
          nextTurnId: null,
        },
      ],
    },
    'shady-offer': {
      id: 'shady-offer',
      npcText:
        "...Careful where you say that. There's a man, Renke, works the lower cradles. Pays in hard credits but he's been known to lighten a hold while he loads it. You want me to wave you through to him?",
      playerOptions: [
        {
          id: 'shady-trust',
          label: 'Send me to Renke',
          text: "I can handle Renke. Wave me through.",
          nextTurnId: 'shady-result',
          effects: [
            {
              type: 'stealCargo',
              qty: 4,
              chance: 0.45,
              resultText: "Renke's crew lifted cargo off your hold while you talked terms.",
              failText: 'Renke kept it clean this time — nothing went missing.',
            },
            {
              type: 'damageHull',
              amount: 12,
              chance: 0.3,
              resultText: 'A "loading accident" left a fresh dent in your hull.',
            },
          ],
        },
        {
          id: 'shady-decline',
          label: 'Forget I asked',
          text: "Forget I asked. Keeping it clean.",
          nextTurnId: 'intro',
        },
      ],
    },
    'shady-result': {
      id: 'shady-result',
      npcText:
        "He'll be expecting you at the lower cradles. Whatever happens down there, it didn't come from me. Clear?",
      playerOptions: [
        {
          id: 'shady-ack',
          label: 'Clear',
          text: "Clear. We never talked.",
          nextTurnId: null,
        },
      ],
    },
  },
};

export const DOCKMASTER_KORR: DockContact = {
  id: 'dockmaster-korr',
  name: 'Vance Korr',
  age: 54,
  birthplace: 'Ceres, Belt',
  company: 'Helix Port Authority',
  role: 'dockmaster',
  portrait: '/Image_0.jpg',
  bio: 'Thirty years running approach control out of the Belt. Seen every kind of hauler limp into a cradle.',
  platform: 'HERALD',
  dialogue: DOCKMASTER_DIALOGUE,
};

/** Main-game Helix Port docking bay configuration. */
export const SPACE_STATION_DOCK: DockConfig = {
  label: 'Helix Port',
  contacts: [DOCKMASTER_KORR],
};
