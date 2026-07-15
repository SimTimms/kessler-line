import type { DockConfig, DockContact } from '../dockConfig';

const MINING_SUPERVISOR: DockContact = {
  id: 'supervisor-reeves',
  name: 'Mara Reeves',
  age: 41,
  birthplace: 'Phobos Yard',
  company: 'Outer Belt Mining Co.',
  role: 'official',
  portrait: '/profiles/scab-captain.png',
  bio: 'Runs the extraction schedule on AST-47718. Keeps the books straight and the ore moving.',
  platform: 'REACH',
  inventory: {
    label: 'Mara Reeves',
    slots: [
      // Excess ore from the cut — eager to move it.
      { itemId: 'iron-slag', quantity: 18, capacity: 40, supply: 0.85, demand: 0.1 },
      // Short on life support for the crew rotation.
      { itemId: 'organics', quantity: 1, capacity: 20, supply: 0.05, demand: 0.9 },
      { itemId: 'o2-cells', quantity: 2, capacity: 30, supply: 0.1, demand: 0.7 },
      { itemId: 'reaction-mass', quantity: 6, capacity: 50, supply: 0.35, demand: 0.25 },
    ],
  },
  dialogue: {
    id: 'supervisor-reeves',
    openingTurnId: 'intro',
    turns: {
      intro: {
        id: 'intro',
        npcText: 'Insidion. Wa wont yu?',
        playerOptions: [
          {
            id: 'ask-fuel',
            label: 'Need fuel for the run home',
            text: 'Running low on reaction mass. Can you spare anything off the depot line?',
            nextTurnId: 'fuel-ok',
          },
          {
            id: 'ask-ore',
            label: 'Any surplus ore for sale?',
            text: 'Looking for raw iron — anything off the last cut going spare?',
            nextTurnId: 'ore-offer',
          },
          {
            id: 'leave',
            label: 'Just passing through',
            text: 'Nothing today. Clearing the cradle.',
            nextTurnId: null,
          },
        ],
      },
      'fuel-ok': {
        id: 'fuel-ok',
        npcText: 'Have yu to spend?',
        playerOptions: [
          {
            id: 'what need',
            label: 'What do you need',
            text: 'We have supplies to trade, what do you need?',
            nextTurnId: 'what-need',
          },
          {
            id: 'trade-supplies',
            label: 'How about this?',
            text: 'How about this?',
            nextTurnId: 'trade-supplies',
          },
        ],
      },
      'trade-supplies': {
        id: 'trade-supplies',
        npcText: 'Show me your offer. Make it worth opening the depot line.',
        trade: {
          cargoBarter: true,
          acceptRatio: 1,
          insultRatio: 0.4,
          counterTargetRatio: 1.15,
          acceptThreshold: 44,
          insultThreshold: 12,
          counterMultiplier: 1.22,
          acceptPenaltyPerNegativeStance: 5,
          insultPenaltyPerNegativeStance: 2,
          insultReliefPerPositiveStance: 2,
          minimumInsultThreshold: 4,
          panelStatusOpen: 'Set both sides of the deal, then transmit.',
          panelStatusCleared: 'Offer cleared. Set a new package.',
          panelStatusEmptyOffer: 'Put goods on both sides — or at least what you are giving.',
          panelStatusInsult: 'Offer rejected as insulting.',
          panelStatusAccepted: 'They agree. Confirm to finalize the exchange.',
          panelStatusCounter: 'Counteroffer on the table: {offer}',
          panelStatusSuccess: 'Exchange complete: {offer}',
          panelStatusCounterDeclined: 'Counteroffer declined. Submit a new offer.',
          npcInsultText: 'Yu insulting us pilot. We can take wot we need',
          npcAcceptText: 'That clears my line. Confirm and we swap.',
          npcCounterText: 'Too light. I can do it for {offer}.',
          npcCompleteText: 'Transfer locked. We can trade again if you have more to move.',
          npcCounterDeclinedAckText: 'Then adjust your numbers and send again.',
          playerOfferText: 'Proposed deal: {offer}',
          playerAcceptText: 'Agreed. Executing exchange: {offer}',
          playerCounterAcceptText: 'Counter accepted. Executing: {offer}',
          playerCounterDeclineText: 'Counter declined. I will submit another offer.',
        },
        playerOptions: [
          {
            id: 'trade-back',
            label: 'Back',
            text: 'Stand by. Let me rethink this.',
            nextTurnId: 'fuel-ok',
          },
        ],
      },
      'what-need': {
        id: 'what-need',
        npcText: 'Needs organics. Have yu crews peepals? Have yu? ',
        playerOptions: [
          {
            id: 'trade-crew',
            label: 'I have crew, they work hard. Good solid people',
            text: 'I have crew, they work hard. Good solid people',
            nextTurnId: 'what-need',
          },
          {
            id: 'no-trade',
            label: 'No',
            text: "I don't trade in people.",
            nextTurnId: 'maybe-take',
          },
        ],
      },
      'maybe-take': {
        id: 'maybe-take',
        npcText: 'Mai be we take yus organics, why not give us?',
        playerOptions: [
          {
            id: 'accept',
            label: 'Take it',
            text: 'Take it.',
            nextTurnId: 'ore-done',
          },
          {
            id: 'decline',
            label: 'No',
            text: 'No.',
            nextTurnId: null,
          },
        ],
      },
      'ore-offer': {
        id: 'ore-offer',
        npcText:
          "We've got slag-grade iron in the hopper — not assay-certified, but it'll smelt. Nothing free. Show me what you'll put up for it.",
        trade: {
          cargoBarter: true,
          acceptRatio: 0.95,
          insultRatio: 0.35,
          counterTargetRatio: 1.1,
          acceptThreshold: 44,
          insultThreshold: 12,
          counterMultiplier: 1.22,
          acceptPenaltyPerNegativeStance: 5,
          insultPenaltyPerNegativeStance: 2,
          insultReliefPerPositiveStance: 2,
          minimumInsultThreshold: 4,
          panelStatusOpen: 'Offer something for the slag — they will not gift it.',
          panelStatusCleared: 'Offer cleared. Set a new package.',
          panelStatusEmptyOffer: 'Put something on your side if you want their ore.',
          panelStatusInsult: 'Offer rejected as insulting.',
          panelStatusAccepted: 'They agree. Confirm to finalize the exchange.',
          panelStatusCounter: 'Counteroffer on the table: {offer}',
          panelStatusSuccess: 'Exchange complete: {offer}',
          panelStatusCounterDeclined: 'Counteroffer declined. Submit a new offer.',
          npcInsultText: 'Yu joking? That slag cost blood to cut.',
          npcAcceptText: 'Deal. Confirm and we swap.',
          npcCounterText: 'Not enough. I can do: {offer}.',
          npcCompleteText: 'Loaded. Watch your mass limits on undock.',
          npcCounterDeclinedAckText: 'Then come back with a real package.',
          playerOfferText: 'Proposed deal: {offer}',
          playerAcceptText: 'Agreed. Executing exchange: {offer}',
          playerCounterAcceptText: 'Counter accepted. Executing: {offer}',
          playerCounterDeclineText: 'Counter declined. I will submit another offer.',
        },
        playerOptions: [
          {
            id: 'decline',
            label: 'Pass',
            text: 'Not this run.',
            nextTurnId: 'intro',
          },
        ],
      },

      'ore-done': {
        id: 'ore-done',
        npcText: "Loaded. Watch your mass limits on undock — that ore's dense.",
        playerOptions: [
          {
            id: 'done',
            label: 'Clear',
            text: 'Clear. Undocking.',
            nextTurnId: null,
          },
        ],
      },
    },
  },
};

const SYNDICATE_RUNNER: DockContact = {
  id: 'runner-vex',
  name: 'Dex Vex',
  age: 33,
  role: 'gangster',
  portrait: '/Image_0.jpg',
  bio: 'Nobody asks how he got a berth on a mining rock. He asks how fast you can leave.',
  platform: 'OPENLINE',
  inventory: {
    label: 'Dex Vex',
    slots: [
      { itemId: 'unmarked-canister', quantity: 2, capacity: 5, supply: 0.7, demand: 0.15 },
      { itemId: 'spare-parts', quantity: 3, capacity: 20, supply: 0.4, demand: 0.3 },
      // Always hunting reaction mass for quiet burns.
      { itemId: 'reaction-mass', quantity: 0, capacity: 50, supply: 0, demand: 0.95 },
      { itemId: 'power-cells', quantity: 1, capacity: 30, supply: 0.2, demand: 0.55 },
    ],
  },
  dialogue: {
    id: 'runner-vex',
    openingTurnId: 'intro',
    turns: {
      intro: {
        id: 'intro',
        npcText:
          "...Didn't expect company on this rock. You didn't see me, I didn't see you. Unless you've got something worth my time?",
        playerOptions: [
          {
            id: 'ask-work',
            label: 'Got any off-book work?',
            text: "I'm listening. What's the job?",
            nextTurnId: 'job-offer',
          },
          {
            id: 'leave',
            label: 'Wrong channel',
            text: 'Disregard. Closing channel.',
            nextTurnId: null,
          },
        ],
      },
      'job-offer': {
        id: 'job-offer',
        npcText:
          'Small package, inner relay drop. No manifest, no questions. Half now, half on delivery. You in?',
        playerOptions: [
          {
            id: 'accept',
            label: 'Take the package',
            text: "I'm in. Load it.",
            nextTurnId: 'job-done',
            effects: [
              {
                type: 'giveCargo',
                item: 'Unmarked Canister',
                qty: 1,
                resultText: 'Unmarked canister loaded into the hold.',
              },
              {
                type: 'shareInfo',
                from: 'Unknown — relay drop',
                subject: 'Drop coordinates · unmarked package',
                text: 'Coordinates attached. Burn quiet. — V.',
                platform: 'OPENLINE',
                resultText: 'Drop coordinates logged to your inbox.',
              },
            ],
          },
          {
            id: 'decline',
            label: 'Too hot',
            text: 'Too hot for me.',
            nextTurnId: null,
          },
        ],
      },
      'job-done': {
        id: 'job-done',
        npcText: "Good. Coordinates are in your inbox. Don't open it.",
        playerOptions: [
          {
            id: 'ack',
            label: 'Copy',
            text: 'Copy. Out.',
            nextTurnId: null,
          },
        ],
      },
    },
  },
};

const TRADER: DockContact = {
  id: 'trader-sol',
  name: 'Iris Sol',
  age: 28,
  role: 'trader',
  portrait: '/Image_0.jpg',
  company: 'Sol Freight Exchange',
  bio: 'Independent broker — buys low from mining ops, sells to relay stations.',
  platform: 'HERALD',
  inventory: {
    label: 'Iris Sol',
    slots: [
      { itemId: 'o2-cells', quantity: 12, capacity: 30, supply: 0.75, demand: 0.15 },
      { itemId: 'power-cells', quantity: 8, capacity: 30, supply: 0.6, demand: 0.2 },
      // Buys slag cheap from miners for inner-system runs.
      { itemId: 'iron-slag', quantity: 4, capacity: 40, supply: 0.2, demand: 0.8 },
      { itemId: 'spare-parts', quantity: 5, capacity: 20, supply: 0.45, demand: 0.35 },
    ],
  },
  dialogue: {
    id: 'trader-sol',
    openingTurnId: 'intro',
    turns: {
      intro: {
        id: 'intro',
        npcText:
          "Sol, freight exchange. I've got surplus O2 cells and a buyer looking for iron slag. What've you got in the hold?",
        playerOptions: [
          {
            id: 'buy-o2',
            label: 'Buy O2 cells',
            text: 'What are you asking for a full O2 top-off?',
            nextTurnId: 'o2-sale',
            effects: [
              {
                type: 'transferResource',
                resource: 'o2',
                amount: 25,
                resultText: 'O2 cells transferred — tanks topped up.',
              },
            ],
          },
          {
            id: 'leave',
            label: 'Just browsing',
            text: 'Just browsing the board. Maybe next cycle.',
            nextTurnId: null,
          },
        ],
      },
      'o2-sale': {
        id: 'o2-sale',
        npcText:
          'Done — cells are on your hookup. Anything else before I move on to the next rock?',
        playerOptions: [
          {
            id: 'done',
            label: "That's all",
            text: "That's all. Good flying.",
            nextTurnId: null,
          },
        ],
      },
    },
  },
};

/** Sandbox mineral asteroid dock — resources + interior comms contacts. */
export const ASTEROID_DOCK_CONFIG: DockConfig = {
  label: 'Asteroid Dock',
  fuel: { amount: 100, capacity: 100 },
  o2: { amount: 100, capacity: 100 },
  power: { amount: 100, capacity: 100 },
  crew: { amount: 4, capacity: 8 },
  inventory: {
    label: 'Asteroid Dock Depot',
    slots: [
      { itemId: 'iron-slag', quantity: 30, capacity: 80, supply: 0.9, demand: 0.05 },
      { itemId: 'reaction-mass', quantity: 20, capacity: 60, supply: 0.5, demand: 0.3 },
      { itemId: 'o2-cells', quantity: 10, capacity: 40, supply: 0.4, demand: 0.35 },
      { itemId: 'spare-parts', quantity: 6, capacity: 25, supply: 0.3, demand: 0.45 },
    ],
  },
  contacts: [MINING_SUPERVISOR, SYNDICATE_RUNNER, TRADER],
  jobBoard: [
    {
      id: 'survey-run',
      title: 'Surface Survey — Sector 7',
      summary:
        'Fly a low pass over the north face and transmit magnetometer readings. Pay on receipt.',
      dialogue: {
        id: 'job-survey-run',
        openingTurnId: 'posting',
        turns: {
          posting: {
            id: 'posting',
            npcText:
              'SURVEY CONTRACT — SECTOR 7\n\nLow pass over the north mineral face. Magnetometer data to OBMC relay. Standard rate on verified receipt.\n\nAccept contract?',
            playerOptions: [
              {
                id: 'accept',
                label: 'Accept contract',
                text: "I'll run the survey. Send the waypoints.",
                nextTurnId: 'accepted',
                effects: [
                  {
                    type: 'shareInfo',
                    from: 'OBMC — Job Board',
                    subject: 'Survey waypoints · Sector 7',
                    text: 'Waypoints attached. Complete the pass and transmit raw magnetometer logs to OBMC relay.',
                    platform: 'HERALD',
                    resultText: 'Survey waypoints logged to your inbox.',
                  },
                ],
              },
              {
                id: 'decline',
                label: 'Pass',
                text: 'Not this cycle.',
                nextTurnId: null,
              },
            ],
          },
          accepted: {
            id: 'accepted',
            npcText: 'Contract logged. Waypoints are in your inbox. Good hunting.',
            playerOptions: [
              {
                id: 'ack',
                label: 'Copy',
                text: 'Copy. Undocking.',
                nextTurnId: null,
              },
            ],
          },
        },
      },
    },
  ],
};
