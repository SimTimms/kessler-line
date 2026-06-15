import type { DialogueTree } from './npcDialogues';

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
          'Thanks for answering the hail. Our mining drone is stranded — we\'re in desperate need of fuel.',
        playerOptions: [
          {
            id: 'help',
            label: 'I can spare fuel.',
            text: 'I can spare some fuel. What do you need?',
            nextTurnId: 'fuel_need',
          },
          {
            id: 'decline',
            label: "Can't help right now.",
            text: 'Sorry, I can\'t help right now.',
            nextTurnId: 'declined',
          },
        ],
      },
      fuel_need: {
        id: 'fuel_need',
        npcText:
          'Two hundred units would get us to the nearest depot. We\'ll transfer ore credits on arrival.',
        playerOptions: [
          {
            id: 'agree',
            label: 'Initiate transfer.',
            text: 'Stand by — I\'ll initiate a fuel transfer.',
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
        npcText: 'Copy that. Standing by for your transfer signal. — AST-47718',
        playerOptions: [],
      },
      later: {
        id: 'later',
        npcText: 'Understood. We\'ll keep broadcasting on this frequency. — AST-47718',
        playerOptions: [],
      },
      declined: {
        id: 'declined',
        npcText: 'Understood. Signal out. — AST-47718',
        playerOptions: [],
      },
    },
  },
];

export const MINERAL_ASTEROID_HAIL_TREE_ID = 'mineral-asteroid-hail';
