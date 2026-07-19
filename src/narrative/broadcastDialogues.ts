import type { DialogueTree } from './npcDialogues';

const AST_SIGN_OFF = '— AST-47718';

/** Dialogue trees for world objects that hail the player (not random NPC ships). */
export const BROADCAST_DIALOGUE_TREES: DialogueTree[] = [
  {
    id: 'mineral-asteroid-hail',
    captainName: 'AST-47718 Beacon',
    vesselName: 'AST-47718',
    openingTurnId: 'open',
    kind: 'broadcast',
    turns: {
      open: {
        id: 'open',
        npcText:
          'Thanks for answering the hail. Mining operations are steady — just checking nearby traffic on this frequency.',
        playerOptions: [
          {
            id: 'status',
            label: 'Request status.',
            text: 'What\'s your colony status?',
            nextTurnId: 'status',
          },
          {
            id: 'decline',
            label: 'Sign off.',
            text: 'Copy. Standing by on this frequency.',
            nextTurnId: 'signed_off',
          },
        ],
      },
      status: {
        id: 'status',
        npcText:
          'Colony is operational. Ore extraction nominal. We\'ll ping if supply needs change.',
        playerOptions: [],
      },
      signed_off: {
        id: 'signed_off',
        npcText: `Understood. Signal out. ${AST_SIGN_OFF}`,
        playerOptions: [],
      },
    },
  },
  {
    id: 'mineral-asteroid-hail-food-low',
    captainName: 'AST-47718 Beacon',
    vesselName: 'AST-47718',
    openingTurnId: 'open',
    kind: 'broadcast',
    turns: {
      open: {
        id: 'open',
        npcText:
          'Thanks for picking up. Our food reserves are running low — we\'re requesting supplemental rations if you can spare any.',
        playerOptions: [
          {
            id: 'help',
            label: 'I can spare food.',
            text: 'I can spare some rations. What do you need?',
            nextTurnId: 'food_need',
          },
          {
            id: 'decline',
            label: "Can't help right now.",
            text: 'Sorry, I can\'t help right now.',
            nextTurnId: 'declined',
          },
        ],
      },
      food_need: {
        id: 'food_need',
        npcText:
          'Fifty units would stabilize us for two weeks. We can transfer ore credits on receipt.',
        playerOptions: [
          {
            id: 'agree',
            label: 'Initiate transfer.',
            text: 'Stand by — I\'ll initiate a food transfer.',
            nextTurnId: 'agreed',
          },
          {
            id: 'later',
            label: 'Check reserves first.',
            text: 'I need to check my reserves first.',
            nextTurnId: 'later',
          },
        ],
      },
      agreed: {
        id: 'agreed',
        npcText: `Copy that. Standing by for your transfer signal. ${AST_SIGN_OFF}`,
        playerOptions: [],
      },
      later: {
        id: 'later',
        npcText: `Understood. We\'ll keep broadcasting on this frequency. ${AST_SIGN_OFF}`,
        playerOptions: [],
      },
      declined: {
        id: 'declined',
        npcText: `Understood. Signal out. ${AST_SIGN_OFF}`,
        playerOptions: [],
      },
    },
  },
  {
    id: 'mineral-asteroid-hail-food-desperate',
    captainName: 'AST-47718 Beacon',
    vesselName: 'AST-47718',
    openingTurnId: 'open',
    kind: 'broadcast',
    turns: {
      open: {
        id: 'open',
        npcText:
          'Emergency hail — our food reserves are depleted. We are in desperate need of rations. Please respond.',
        playerOptions: [
          {
            id: 'help',
            label: 'I can help.',
            text: 'I hear you. What do you need?',
            nextTurnId: 'food_need',
          },
          {
            id: 'decline',
            label: "Can't help.",
            text: 'I can\'t assist right now.',
            nextTurnId: 'declined',
          },
        ],
      },
      food_need: {
        id: 'food_need',
        npcText:
          'Any amount helps. Without resupply we\'ll start losing crew within the hour.',
        playerOptions: [
          {
            id: 'agree',
            label: 'Sending supplies.',
            text: 'Hang on — I\'m preparing an emergency food transfer.',
            nextTurnId: 'agreed',
          },
          {
            id: 'later',
            label: 'Need a moment.',
            text: 'Give me a moment to assess what I can spare.',
            nextTurnId: 'later',
          },
        ],
      },
      agreed: {
        id: 'agreed',
        npcText: `Thank you. Colony standing by. ${AST_SIGN_OFF}`,
        playerOptions: [],
      },
      later: {
        id: 'later',
        npcText: `Please hurry. Time is critical. ${AST_SIGN_OFF}`,
        playerOptions: [],
      },
      declined: {
        id: 'declined',
        npcText: `Copy. We\'ll keep broadcasting. ${AST_SIGN_OFF}`,
        playerOptions: [],
      },
    },
  },
  {
    id: 'mineral-asteroid-hail-food-starving',
    captainName: 'AST-47718 Beacon',
    vesselName: 'AST-47718',
    openingTurnId: 'open',
    kind: 'broadcast',
    turns: {
      open: {
        id: 'open',
        npcText:
          'Mayday — starvation event in progress. We are losing crew. Emergency food supply required immediately.',
        playerOptions: [
          {
            id: 'help',
            label: 'Sending aid.',
            text: 'I\'m on it. Tell me what you need.',
            nextTurnId: 'food_need',
          },
          {
            id: 'decline',
            label: "Can't help.",
            text: 'I can\'t help right now.',
            nextTurnId: 'declined',
          },
        ],
      },
      food_need: {
        id: 'food_need',
        npcText:
          'We need food now — any amount. Crew casualties are mounting.',
        playerOptions: [
          {
            id: 'agree',
            label: 'Emergency transfer.',
            text: 'Emergency transfer inbound. Stand by.',
            nextTurnId: 'agreed',
          },
        ],
      },
      agreed: {
        id: 'agreed',
        npcText: `Copy. Thank you. ${AST_SIGN_OFF}`,
        playerOptions: [],
      },
      declined: {
        id: 'declined',
        npcText: `Understood. ${AST_SIGN_OFF}`,
        playerOptions: [],
      },
    },
  },
  {
    id: 'mineral-asteroid-hail-water-low',
    captainName: 'AST-47718 Beacon',
    vesselName: 'AST-47718',
    openingTurnId: 'open',
    kind: 'broadcast',
    turns: {
      open: {
        id: 'open',
        npcText:
          'Thanks for answering. Our water reserves are critically low — requesting supplemental supply.',
        playerOptions: [
          {
            id: 'help',
            label: 'I can spare water.',
            text: 'I can spare water. What do you need?',
            nextTurnId: 'water_need',
          },
          {
            id: 'decline',
            label: "Can't help.",
            text: 'Sorry, I can\'t help right now.',
            nextTurnId: 'declined',
          },
        ],
      },
      water_need: {
        id: 'water_need',
        npcText:
          'Eighty units would restore safe reserves. Ore credits available on transfer.',
        playerOptions: [
          {
            id: 'agree',
            label: 'Initiate transfer.',
            text: 'Stand by — initiating water transfer.',
            nextTurnId: 'agreed',
          },
          {
            id: 'later',
            label: 'Check reserves first.',
            text: 'I need to check my reserves first.',
            nextTurnId: 'later',
          },
        ],
      },
      agreed: {
        id: 'agreed',
        npcText: `Copy that. Standing by. ${AST_SIGN_OFF}`,
        playerOptions: [],
      },
      later: {
        id: 'later',
        npcText: `Understood. ${AST_SIGN_OFF}`,
        playerOptions: [],
      },
      declined: {
        id: 'declined',
        npcText: `Understood. Signal out. ${AST_SIGN_OFF}`,
        playerOptions: [],
      },
    },
  },
  {
    id: 'salvage-intake-delivery',
    captainName: 'Salvage Intake',
    vesselName: 'Salvage Depot',
    openingTurnId: 'open',
    kind: 'broadcast',
    turns: {
      open: {
        id: 'open',
        npcText:
          'Intake confirms recovery. Your delivery is tagged and logged in the depot hold. Dock at Salvage Berth and speak with the Salvage Master to negotiate your claim share.',
        playerOptions: [
          {
            id: 'ack',
            label: 'Copy.',
            text: 'Copy. Heading for the berth.',
            nextTurnId: 'ack',
          },
          {
            id: 'ask',
            label: 'What is my share?',
            text: 'What cut am I looking at?',
            nextTurnId: 'share',
          },
        ],
      },
      ack: {
        id: 'ack',
        npcText: 'Berth is lit. Master will take your claim when you land.',
        playerOptions: [],
      },
      share: {
        id: 'share',
        npcText:
          'Standard cut is half of tagged recovery, subject to negotiation. Some masters are fair. Some are not. Bring your logs.',
        playerOptions: [
          {
            id: 'out',
            label: 'Understood.',
            text: 'Understood. Out.',
            nextTurnId: null,
          },
        ],
      },
    },
  },
];

export const MINERAL_ASTEROID_HAIL_TREE_ID = 'mineral-asteroid-hail';
export const MINERAL_ASTEROID_HAIL_FOOD_LOW_TREE_ID = 'mineral-asteroid-hail-food-low';
export const MINERAL_ASTEROID_HAIL_FOOD_DESPERATE_TREE_ID = 'mineral-asteroid-hail-food-desperate';
export const MINERAL_ASTEROID_HAIL_FOOD_STARVING_TREE_ID = 'mineral-asteroid-hail-food-starving';
export const MINERAL_ASTEROID_HAIL_WATER_LOW_TREE_ID = 'mineral-asteroid-hail-water-low';
export const SALVAGE_INTAKE_DELIVERY_TREE_ID = 'salvage-intake-delivery';
