// Authored dialogue trees for radio conversations and inbox messages.
// Every tree here is pinned to an entity explicitly — scripted hails, the
// starter fleet, broadcast contacts — never selected automatically.

import type { InboxMessage, ReplyOption } from '../context/MessageStore';
import { BROADCAST_DIALOGUE_TREES } from './broadcastDialogues';
import { PILOT_PROFILE } from './pilotProfile';
import type { DialogueTree } from '../types/dialogueTypes';

export const MSG_DISPATCH_INTRO: DialogueTree = {
  id: 'dispatch-intro-1',
  kind: 'inbox',
  captainName: 'Outer Lanes Ltd. — Routing',
  vesselName: 'OL Routing',
  from: 'Outer Lanes Ltd. — Routing',
  subject: 'Job #OL-4471',
  platform: 'REACH',
  senderLocationId: 'Neptune',
  openingTurnId: 'intro',
  turns: {
    intro: {
      id: 'intro',
      npcText: `Delivery to Sirix Station, Neptune vicinity.\n\nParcel: 1x sealed unit, ref. MX-7734. Handle with care.\n\nDrop and go. Signature not required.\n\n— Mara Voss\nRouting Coordinator, Outer Lanes Ltd.`,
      playerOptions: [
        {
          id: 'dispatch-ack',
          label: 'Acknowledged. En route.',
          text: `Job #OL-4471 acknowledged. Parcel MX-7734 confirmed in hold.\n\nProceeding to Sirix Station, Neptune vicinity. ETA dependent on corridor clearance.\n\n— Pilot, Independent`,
          nextTurnId: 'dispatch-reply-ack',
        },
        {
          id: 'dispatch-query-contents',
          label: "Query: what's in MX-7734?",
          text: `Routing query — MX-7734 is listed as sealed, no contents declaration on my manifest copy. If Neptune Traffic asks, what am I carrying?\n\n— Pilot, Independent`,
          nextTurnId: 'dispatch-reply-query',
        },
        {
          id: 'dispatch-sirix-checkin',
          label: 'Sirix flagging missed check-in.',
          text: `Heads up — BEACON is flagging a missed automated check-in for Sirix Station. Status shows unknown.\n\nWant me to verify before final approach?\n\n— Pilot, Independent`,
          nextTurnId: 'dispatch-reply-sirix',
        },
      ],
    },
    'dispatch-reply-ack': {
      id: 'dispatch-reply-ack',
      npcText: `Good. Don't dawdle — the Sirix window is narrow and I can't extend your clearance if you miss it.\n\nMX-7734 is time-sensitive. Move.\n\n— M.V.`,
      playerOptions: [],
    },
    'dispatch-reply-query': {
      id: 'dispatch-reply-query',
      npcText: `Contents are proprietary cargo. Outer Lanes is cleared through Neptune Traffic — that clearance covers your manifest.\n\nYou're being paid to deliver, not to know. Keep moving.\n\n— M.V.`,
      playerOptions: [],
    },
    'dispatch-reply-sirix': {
      id: 'dispatch-reply-sirix',
      npcText: `Automated systems miss check-ins. Sirix is active.\n\nComplete the delivery. If there's no one to receive, leave it at the dock terminal and log the drop.\n\nDon't deviate.\n\n— M.V.`,
      playerOptions: [],
    },
  },
};

export const MSG_FAMILY_EARTH: DialogueTree = {
  id: 'family-earth-1',
  kind: 'inbox',
  captainName: 'Home — Earth, Sector 9',
  vesselName: 'Still here',
  from: 'Home — Earth, Sector 9',
  subject: 'Still here',
  audioFile: 'https://kessler-audio.s3.eu-west-2.amazonaws.com/family-earth-1.mp3',
  audioVoice: 'Marcela',
  platform: 'BROADCAST',
  senderLocationId: 'Earth',
  openingTurnId: 'intro',
  turns: {
    intro: {
      id: 'intro',
      npcText: `Power's been stable for three weeks now. The feeds are patchy but we're getting through.\n\nOksana's growing fast. She asks about you.\n\nWe're okay. Come back when you can.\n\n— M`,
      playerOptions: [
        {
          id: 'family-reply-okay',
          label: "I'm okay — near Neptune.",
          text: `I'm okay. Running a courier job in the Neptune corridor. Quiet out here.\n\nTell Oksana I'll bring something back.\n\nMiss you both. I'll make it back soon.`,
          nextTurnId: null,
          deliveryNote: `RELAY FAILED — INNER SYSTEM DESTINATION UNRESOLVABLE\nMessage held in outgoing queue. No delivery window available.`,
        },
        {
          id: 'family-reply-coming-back',
          label: "Tell Oksana I'll be back.",
          text: `Tell Oksana I'm coming home. It's going to take a while — the lanes are complicated right now — but I'm coming.\n\nKeep the power stable and stay where you are.\n\nI love you.`,
          nextTurnId: null,
          deliveryNote: `RELAY FAILED — INNER SYSTEM DESTINATION UNRESOLVABLE\nMessage held in outgoing queue. No delivery window available.`,
        },
        {
          id: 'family-reply-hang-on',
          label: 'Hang on. On my way.',
          text: `We're okay out here. The feeds are patchy on this end too.\n\nI'm going to work my way back in. Stay where you are — don't try to move.\n\nI love you both. I'm coming.`,
          nextTurnId: null,
          deliveryNote: `RELAY FAILED — INNER SYSTEM DESTINATION UNRESOLVABLE\nMessage held in outgoing queue. No delivery window available.`,
        },
      ],
    },
  },
};

export const MSG_NEPTUNE_CONTROL: DialogueTree = {
  id: 'neptune-control-1',
  kind: 'inbox',
  captainName: 'Neptune Control — Traffic Authority',
  vesselName: 'Approach Corridor Closed',
  from: 'Neptune Control — Traffic Authority',
  subject: 'Approach Corridor Closed',
  platform: 'REACH',
  openingTurnId: 'intro',
  turns: {
    intro: {
      id: 'intro',
      npcText: `Vessel, you have entered a restricted approach corridor.\n\nNo-fly zone is active. All docking rights for the inner ring are suspended pending security review.\n\nReverse thrust immediately and hold at minimum 20,000 units from the planet surface. Failure to comply will be treated as a hostile approach.\n\nNEPTUNE CONTROL OUT.`,
      playerOptions: [],
    },
  },
};

export const MSG_EMPLOYER_RECALL: DialogueTree = {
  id: 'employer-recall-1',
  kind: 'inbox',
  captainName: '— DISPATCH',
  vesselName: 'PRIORITY-1',
  from: '— DISPATCH',
  subject: '⚠ PRIORITY-1 — ABORT APPROACH',
  platform: 'HERALD',
  openingTurnId: 'intro',
  turns: {
    intro: {
      id: 'intro',
      npcText: `Stop.\n\nDo not attempt Neptune entry. The corridor is locked and your window is gone.\n\nReturn to Asteroid Dock. Now.\n\nDo not contact Neptune Control. Do not respond to hails.\n\nThis is not a request.`,
      playerOptions: [],
    },
  },
};

export const SATURN_STARTER_DIALOGUE_TREE_ID = 'saturn-rendezvous-missing';

const SATURN_STARTER_TREE: DialogueTree = {
  id: SATURN_STARTER_DIALOGUE_TREE_ID,
  captainName: '',
  vesselName: '',
  openingTurnId: 'intro',
  turns: {
    intro: {
      id: 'intro',
      npcText:
        "Hey, this is a fleet recon ship. Not much out here. We haven't had contact from anyone in days — that's not unusual this far out, but we were expecting a rendezvous and got complete radio silence. Have you had any contact out here?",
      playerOptions: [
        {
          id: 'intro-earth-blackout',
          label: 'EARTH IS DARK',
          text: `Negative. I was at a station a few days ago and heard Earth-side comms were going dark in waves. Nothing confirmed, but the blackout sounds real.\n\n— ${PILOT_PROFILE.name}`,
          nextTurnId: 'earth-blackout',
        },
        {
          id: 'intro-rendezvous',
          label: 'WHO WERE YOU MEETING',
          text: `No confirmed contact on my side. Who was your rendezvous with?\n\n— ${PILOT_PROFILE.name}`,
          nextTurnId: 'rendezvous',
        },
        {
          id: 'intro-hoard',
          label: 'CONSERVE SUPPLIES',
          text: `No contact. I'd start conserving supplies now — fuel, food, and life support.\n\n— ${PILOT_PROFILE.name}`,
          nextTurnId: 'hoard',
        },
      ],
    },
    'earth-blackout': {
      id: 'earth-blackout',
      npcText:
        "That's the first straight answer I've had all week. We heard the same rumor but nobody wanted to say it out loud. If Earth is dark, every route inward is going to get crowded fast.",
      playerOptions: [
        {
          id: 'earth-blackout-goal',
          label: 'HEADING INWARD',
          text: `Copy. My plan is to head back toward the inner system and verify what's happened near Earth.\n\n— ${PILOT_PROFILE.name}`,
          nextTurnId: 'close',
        },
      ],
    },
    rendezvous: {
      id: 'rendezvous',
      npcText:
        'Survey cutter out of Titan orbit. Precise crew. Never misses a window. This time we got nothing — no ping, no delay notice, no debris trace. Just silence.',
      playerOptions: [
        {
          id: 'rendezvous-goal',
          label: 'WIDEN YOUR SEARCH',
          text: `Understood. Expand your sweep and keep your transponder hot. I'm moving inward toward Earth and can relay if I hear anything solid.\n\n— ${PILOT_PROFILE.name}`,
          nextTurnId: 'close',
        },
      ],
    },
    hoard: {
      id: 'hoard',
      npcText:
        "You're not wrong. We burned too much waiting on a ship that never arrived. We'll lock down nonessential systems and ration from now on.",
      playerOptions: [
        {
          id: 'hoard-goal',
          label: 'MOVE TOWARD INNER SYSTEM',
          text: `Good call. I'm doing the same — stock up, then push toward the inner system and see what happened at Earth.\n\n— ${PILOT_PROFILE.name}`,
          nextTurnId: 'close',
        },
      ],
    },
    close: {
      id: 'close',
      npcText:
        "Copy. If you hear anything verifiable from Earth relays, push it on this frequency. We'll return the favor. Recon out.",
      playerOptions: [
        {
          id: 'close-ack',
          label: 'KEEP CHANNEL OPEN',
          text: `Channel open. Stay safe.\n\n— ${PILOT_PROFILE.name}`,
          nextTurnId: null,
        },
      ],
    },
  },
};

export const DIALOGUE_TREES: DialogueTree[] = [
  SATURN_STARTER_TREE,
  // ── Inbox message trees (kind:'inbox' — excluded from ship assignment) ──────
  MSG_DISPATCH_INTRO,
  MSG_FAMILY_EARTH,
  MSG_NEPTUNE_CONTROL,
  MSG_EMPLOYER_RECALL,
  // ── Narrative scripted hails (kind:'broadcast' — excluded from random assignment) ──
  {
    id: 'elias-voss-satellite-hail',
    captainName: 'Elias Voss',
    vesselName: 'Donington Station',
    openingTurnId: 'intro',
    kind: 'broadcast' as const,
    turns: {
      intro: {
        id: 'intro',
        npcText:
          "Excellent, we're picking up the transmissions now. I'll take it from here, going to adjust the orbital trajectory remotely. If we hear anything from Earth, I'll let you know.",
        playerOptions: [
          {
            id: 'ack',
            label: 'ACKNOWLEDGED',
            text: 'Copy that. Good luck with the data.',
            nextTurnId: 'closing',
          },
          {
            id: 'ask-earth',
            label: 'ANYTHING FROM EARTH?',
            text: 'Have you had any contact from Earth recently? Anything at all?',
            nextTurnId: 'earth',
          },
        ],
      },
      closing: {
        id: 'closing',
        npcText: 'Appreciate the work, pilot. Donington out.',
        playerOptions: [],
      },
      earth: {
        id: 'earth',
        npcText:
          "Nothing yet. The relay's been quiet for a while now. But that's what the satellite is for — if there's anything out there, we'll hear it. I'll keep you posted.",
        playerOptions: [
          {
            id: 'earth-ack',
            label: 'UNDERSTOOD',
            text: "Alright. I'll be around.",
            nextTurnId: null,
          },
        ],
      },
    },
  },
];

// ── Explicit tree assignment ──────────────────────────────────────────────────
// A tree is pinned to an entity id by whatever authored it: a hail offer
// carrying a dialogueTreeId, the starter fleet, a broadcast contact, or a
// scripted narrative hail. Nothing assigns a tree on its own, so an entity
// with no assignment simply has no conversation.

const _assignedTrees = new Map<string, string>();

export function getDialogueTreeById(treeId: string): DialogueTree | undefined {
  return (
    DIALOGUE_TREES.find((t) => t.id === treeId) ??
    BROADCAST_DIALOGUE_TREES.find((t) => t.id === treeId)
  );
}

/** Pin a fixed dialogue tree to an entity id (broadcast contacts, scripted hails). */
export function assignDialogueTree(entityId: string, treeId: string): DialogueTree {
  const tree = getDialogueTreeById(treeId);
  if (!tree) throw new Error(`Dialogue tree not found: ${treeId}`);
  _assignedTrees.set(entityId, tree.id);
  return tree;
}

/** The tree pinned to this entity, or undefined when nothing authored one. */
export function getAssignedDialogueTree(shipId: string): DialogueTree | undefined {
  const treeId = _assignedTrees.get(shipId);
  return treeId ? getDialogueTreeById(treeId) : undefined;
}

// ── Inbox message conversion ────────────────────────────────────────────────
// Converts a DialogueTree with kind:'inbox' into the InboxMessage shape that
// MessageStore / MessageDialog expect. The opening turn's npcText becomes the
// message body; playerOptions become reply choices; nextTurnId references
// become NPC follow-up messages (npcResponse).

export function treeToInboxMessage(tree: DialogueTree): Omit<InboxMessage, 'read' | 'timestamp'> {
  const opening = tree.turns[tree.openingTurnId];
  const from = tree.from ?? tree.captainName;
  const subject = tree.subject ?? tree.vesselName;

  const replies: ReplyOption[] | undefined =
    opening.playerOptions.length > 0
      ? opening.playerOptions.map((opt) => {
          const npcTurn = opt.nextTurnId ? tree.turns[opt.nextTurnId] : undefined;
          return {
            id: opt.id,
            label: opt.label,
            playerText: opt.text,
            deliveryNote: opt.deliveryNote,
            npcResponse: npcTurn
              ? {
                  id: opt.nextTurnId!,
                  from,
                  subject: `Re: ${subject}`,
                  body: npcTurn.npcText,
                  platform: tree.platform,
                }
              : undefined,
          };
        })
      : undefined;

  return {
    id: tree.id,
    from,
    subject,
    body: opening.npcText,
    audioFile: tree.audioFile || undefined,
    audioVoice: tree.audioVoice,
    platform: tree.platform,
    senderLocationId: tree.senderLocationId,
    replies,
  };
}
