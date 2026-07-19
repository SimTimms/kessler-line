import type { DockConfig, DockContact, DockTradeTurnConfig } from '../dockConfig';
import {
  SALVAGE_CLAIM_HOUSE_SHARE_RATIO,
  SALVAGE_CLAIM_PLAYER_SHARE_RATIO,
  SALVAGE_DEPOT_INVENTORY_ID,
} from '../salvageDropOffConfig';

function salvageClaimTrade(overrides?: Partial<DockTradeTurnConfig>): DockTradeTurnConfig {
  return {
    cargoBarter: true,
    salvageClaim: true,
    playerShareRatio: SALVAGE_CLAIM_PLAYER_SHARE_RATIO,
    acceptRatio: SALVAGE_CLAIM_HOUSE_SHARE_RATIO,
    insultRatio: 0.85,
    counterTargetRatio: SALVAGE_CLAIM_HOUSE_SHARE_RATIO,
    acceptThreshold: 44,
    insultThreshold: 12,
    counterMultiplier: 1.22,
    acceptPenaltyPerNegativeStance: 5,
    insultPenaltyPerNegativeStance: 2,
    insultReliefPerPositiveStance: 2,
    minimumInsultThreshold: 4,
    panelStatusOpen: 'Select tagged salvage to claim. No offer required.',
    panelStatusCleared: 'Claim cleared. Pick tagged stacks again.',
    panelStatusEmptyOffer: 'Mark the tagged salvage you want released.',
    panelStatusInsult: 'Claim refused.',
    panelStatusAccepted: 'They agree to the release. Confirm to transfer.',
    panelStatusCounter: 'Counter on the claim: {offer}',
    panelStatusSuccess: 'Claim settled: {offer}',
    panelStatusCounterDeclined: 'Counter declined. Submit another claim.',
    npcInsultText: 'That ask is out of line. Try a smaller cut.',
    npcAcceptText: 'Fair enough. Confirm and we release your tagged share.',
    npcCounterText: 'Too rich. I can release: {offer}.',
    npcCompleteText: 'Tagged share released to your hold.',
    npcCounterDeclinedAckText: 'Then revise the claim.',
    playerOfferText: 'Claiming: {offer}',
    playerAcceptText: 'Agreed. Executing claim: {offer}',
    playerCounterAcceptText: 'Counter accepted. Executing: {offer}',
    playerCounterDeclineText: 'Counter declined. I will revise.',
    ...overrides,
  };
}

/** Fair Salvage Master — negotiates a share of player-tagged depot salvage. */
const SALVAGE_MASTER: DockContact = {
  id: 'salvage-master',
  name: 'Mara Kett',
  age: 52,
  role: 'dockmaster',
  company: 'Outer Salvage Collective',
  portrait: '/profiles/scab-captain.png',
  bio: 'Depot master. Tags your recovery, takes a house cut, pays out the rest if you negotiate.',
  platform: 'REACH',
  inventory: {
    label: 'Mara Kett',
    slots: [],
  },
  dialogue: {
    id: 'salvage-master',
    openingTurnId: 'intro',
    turns: {
      intro: {
        id: 'intro',
        npcText:
          'Berth clear. Tagged salvage hits the depot books when intake takes a crate. You want a claim, we negotiate the cut — you do not need to put goods up front.',
        playerOptions: [
          {
            id: 'claim',
            label: 'Claim my salvage',
            text: 'I am here for my tagged share.',
            nextTurnId: 'claim',
          },
          {
            id: 'leave',
            label: 'Clear',
            text: 'Clear. Out.',
            nextTurnId: null,
          },
        ],
      },
      claim: {
        id: 'claim',
        npcText:
          'Show me which tagged stacks you want released. Standard house cut is half. Push harder and I counter.',
        trade: salvageClaimTrade(),
        playerOptions: [
          {
            id: 'back',
            label: 'Back',
            text: 'Stand by.',
            nextTurnId: 'intro',
          },
        ],
      },
    },
  },
};

/**
 * Unscrupulous clerk — demonstrates refuse/hold behaviour for tagged salvage.
 * Reusable pattern for other salvage docks.
 */
const SALVAGE_CLERK_UNSCRUPULOUS: DockContact = {
  id: 'salvage-clerk',
  name: 'Jex Rundle',
  age: 39,
  role: 'gangster',
  company: 'Independent',
  portrait: '/Image_0.jpg',
  bio: 'Depot clerk. Will "misplace" tagged salvage and refuse release when it suits him.',
  platform: 'OPENLINE',
  unscrupulous: true,
  inventory: {
    label: 'Jex Rundle',
    slots: [],
  },
  dialogue: {
    id: 'salvage-clerk',
    openingTurnId: 'intro',
    turns: {
      intro: {
        id: 'intro',
        npcText:
          'You looking for your crate? Funny thing — paperwork gets messy around here. Maybe we talk. Maybe we do not.',
        playerOptions: [
          {
            id: 'claim',
            label: 'I want my salvage',
            text: 'Release my tagged salvage. Now.',
            nextTurnId: 'claim',
          },
          {
            id: 'threat',
            label: 'Do not play games',
            text: 'Hold my salvage and you will regret it.',
            nextTurnId: 'refuse',
          },
          {
            id: 'leave',
            label: 'Walk away',
            text: 'Not worth it.',
            nextTurnId: null,
          },
        ],
      },
      claim: {
        id: 'claim',
        npcText: 'Fine. Put a claim on the table. I might feel generous. I might not.',
        trade: salvageClaimTrade({
          playerShareRatio: 0.25,
          insultRatio: 0.55,
          npcInsultText: 'No. That salvage is "under review." Walk away.',
          npcAcceptText: 'Lucky day. Confirm and I release a sliver.',
          npcCounterText: 'You get this or nothing: {offer}.',
          panelStatusInsult: 'They are holding your salvage.',
        }),
        playerOptions: [
          {
            id: 'back',
            label: 'Back',
            text: 'Stand by.',
            nextTurnId: 'intro',
          },
        ],
      },
      refuse: {
        id: 'refuse',
        npcText:
          'Cute. Depot is sealed. Your tags mean nothing until I say they do. Get off my pad.',
        playerOptions: [
          {
            id: 'out',
            label: 'Leave',
            text: 'This is not over.',
            nextTurnId: null,
          },
        ],
      },
    },
  },
};

/** Ship berth — shared depot inventory + salvage contacts. */
export const SALVAGE_DOCK_CONFIG: DockConfig = {
  label: 'Salvage Berth',
  backgroundImage: '/station.jpg',
  inventoryOwnerId: SALVAGE_DEPOT_INVENTORY_ID,
  fuel: { amount: 40, capacity: 100 },
  o2: { amount: 55, capacity: 100 },
  power: { amount: 70, capacity: 100 },
  crew: { amount: 0, capacity: 4 },
  inventory: {
    label: 'Salvage Depot',
    slots: [
      { itemId: 'spare-parts', quantity: 8, capacity: 30, supply: 0.55, demand: 0.2 },
      { itemId: 'iron-slag', quantity: 14, capacity: 50, supply: 0.7, demand: 0.1 },
      { itemId: 'unmarked-canister', quantity: 1, capacity: 5, supply: 0.4, demand: 0.15 },
      { itemId: 'reaction-mass', quantity: 4, capacity: 40, supply: 0.25, demand: 0.5 },
    ],
  },
  contacts: [SALVAGE_MASTER, SALVAGE_CLERK_UNSCRUPULOUS],
  jobBoard: [],
};

/** Crate intake pad — same depot bag, no ship dock / no contacts. */
export const SALVAGE_DROPOFF_DOCK_CONFIG: DockConfig = {
  label: 'Salvage Intake',
  backgroundImage: '/station.jpg',
  inventoryOwnerId: SALVAGE_DEPOT_INVENTORY_ID,
  inventory: {
    label: 'Salvage Depot',
    slots: [],
  },
  contacts: [],
  jobBoard: [],
};
