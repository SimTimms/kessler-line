import type { DockConfig, DockContact, DockTradeTurnConfig } from '../dockConfig';
import type { InventoryBlueprint } from '../inventoryTypes';

function cargoBarterTrade(overrides?: Partial<DockTradeTurnConfig>): DockTradeTurnConfig {
  return {
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
    npcInsultText: 'That insult wastes both our time.',
    npcAcceptText: 'Deal. Confirm and we swap.',
    npcCounterText: 'Not enough. I can do: {offer}.',
    npcCompleteText: 'Transfer locked.',
    npcCounterDeclinedAckText: 'Then adjust and send again.',
    playerOfferText: 'Proposed deal: {offer}',
    playerAcceptText: 'Agreed. Executing exchange: {offer}',
    playerCounterAcceptText: 'Counter accepted. Executing: {offer}',
    playerCounterDeclineText: 'Counter declined. I will submit another offer.',
    ...overrides,
  };
}

function barterDialogue(
  id: string,
  opening: string,
  tradeNpcLine: string,
  tradeOverrides?: Partial<DockTradeTurnConfig>
) {
  return {
    id,
    openingTurnId: 'intro',
    turns: {
      intro: {
        id: 'intro',
        npcText: opening,
        playerOptions: [
          {
            id: 'trade',
            label: 'Open trade',
            text: "Let's see what we can swap.",
            nextTurnId: 'trade',
          },
          {
            id: 'leave',
            label: 'Clear',
            text: 'Clear. Out.',
            nextTurnId: null,
          },
        ],
      },
      trade: {
        id: 'trade',
        npcText: tradeNpcLine,
        trade: cargoBarterTrade(tradeOverrides),
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
  };
}

// ── Pad A — Mining cradle (ore-rich, life-support poor) ─────────────────────

const PAD_A_FOREMAN: DockContact = {
  id: 'pad-a-foreman',
  name: 'Kell Orth',
  age: 47,
  role: 'official',
  company: 'Outer Belt Mining Co.',
  portrait: '/profiles/scab-captain.png',
  bio: 'Shift foreman. Sells slag cheap, hoards organics for the next crew rotation.',
  platform: 'REACH',
  inventory: {
    label: 'Kell Orth',
    slots: [
      { itemId: 'iron-slag', quantity: 22, capacity: 40, supply: 0.9, demand: 0.05 },
      { itemId: 'organics', quantity: 0, capacity: 20, supply: 0, demand: 0.95 },
      { itemId: 'o2-cells', quantity: 1, capacity: 30, supply: 0.05, demand: 0.85 },
      { itemId: 'spare-parts', quantity: 2, capacity: 20, supply: 0.2, demand: 0.55 },
    ],
  },
  dialogue: barterDialogue(
    'pad-a-foreman',
    'Cradle A. Cut is heavy this cycle. You hauling or begging?',
    'Put organics or O2 on the table if you want my slag.',
    {
      npcInsultText: 'Yu wasting my shift. Come back with rations.',
      npcCompleteText: 'Loaded. Watch your mass on undock.',
    }
  ),
};

const PAD_A_WRENCH: DockContact = {
  id: 'pad-a-wrench',
  name: 'Suri Vale',
  age: 34,
  role: 'merchant',
  company: 'Independent',
  portrait: '/Image_0.jpg',
  bio: 'Pad mechanic. Always short on spare parts; sits on power cells from the last salvage.',
  platform: 'HERALD',
  inventory: {
    label: 'Suri Vale',
    slots: [
      { itemId: 'power-cells', quantity: 9, capacity: 30, supply: 0.7, demand: 0.15 },
      { itemId: 'spare-parts', quantity: 1, capacity: 20, supply: 0.1, demand: 0.9 },
      { itemId: 'reaction-mass', quantity: 3, capacity: 50, supply: 0.25, demand: 0.4 },
      { itemId: 'iron-slag', quantity: 4, capacity: 40, supply: 0.45, demand: 0.2 },
    ],
  },
  dialogue: barterDialogue(
    'pad-a-wrench',
    "Vale. If it's broken I can look. If it's trade, show me parts.",
    'I need spares. Power cells I can move.',
    { npcInsultText: 'That offer is scrap. Try again.', npcCompleteText: 'Swap done. Bay clear.' }
  ),
};

const PAD_A_DEPOT: InventoryBlueprint = {
  label: 'Mining Cradle Depot',
  slots: [
    { itemId: 'iron-slag', quantity: 35, capacity: 80, supply: 0.95, demand: 0.05 },
    { itemId: 'reaction-mass', quantity: 8, capacity: 60, supply: 0.3, demand: 0.5 },
    { itemId: 'o2-cells', quantity: 3, capacity: 40, supply: 0.15, demand: 0.7 },
    { itemId: 'organics', quantity: 2, capacity: 25, supply: 0.1, demand: 0.8 },
  ],
};

/** Pad A — ore-rich mining cradle, short on life support. */
export const INVENTORY_PAD_A_DOCK: DockConfig = {
  label: 'Mining Cradle A',
  backgroundImage: '/station.jpg',
  fuel: { amount: 42, capacity: 100 },
  o2: { amount: 18, capacity: 100 },
  power: { amount: 55, capacity: 100 },
  crew: { amount: 6, capacity: 8 },
  inventory: PAD_A_DEPOT,
  contacts: [PAD_A_FOREMAN, PAD_A_WRENCH],
};

// ── Pad B — Shadow berth (contraband, fuel-hungry) ──────────────────────────

const PAD_B_RUNNER: DockContact = {
  id: 'pad-b-runner',
  name: 'Nox Pell',
  age: 29,
  role: 'gangster',
  portrait: '/Image_0.jpg',
  bio: 'Quiet berth runner. Moves unmarked canisters; burns reaction mass like water.',
  platform: 'OPENLINE',
  inventory: {
    label: 'Nox Pell',
    slots: [
      { itemId: 'unmarked-canister', quantity: 3, capacity: 5, supply: 0.75, demand: 0.1 },
      { itemId: 'reaction-mass', quantity: 0, capacity: 50, supply: 0, demand: 1 },
      { itemId: 'power-cells', quantity: 2, capacity: 30, supply: 0.25, demand: 0.5 },
      { itemId: 'organics', quantity: 5, capacity: 20, supply: 0.55, demand: 0.2 },
    ],
  },
  dialogue: barterDialogue(
    'pad-b-runner',
    "...Berth B. You didn't see me. Unless you've got propellant.",
    'Reaction mass first. Canisters second. No ledger.',
    {
      npcInsultText: "Cute. Don't waste my burn window.",
      npcCompleteText: "Done. Don't open that canister.",
      acceptRatio: 0.95,
    }
  ),
};

const PAD_B_FIXER: DockContact = {
  id: 'pad-b-fixer',
  name: 'Juno Rhee',
  age: 38,
  role: 'drifter',
  portrait: '/Image_0.jpg',
  bio: 'Cuts deals for crews stuck on fumes. Wants power cells; sits on spare parts.',
  platform: 'OPENLINE',
  inventory: {
    label: 'Juno Rhee',
    slots: [
      { itemId: 'spare-parts', quantity: 8, capacity: 20, supply: 0.65, demand: 0.2 },
      { itemId: 'power-cells', quantity: 0, capacity: 30, supply: 0, demand: 0.9 },
      { itemId: 'o2-cells', quantity: 4, capacity: 30, supply: 0.35, demand: 0.4 },
      { itemId: 'unmarked-canister', quantity: 1, capacity: 5, supply: 0.4, demand: 0.3 },
    ],
  },
  dialogue: barterDialogue(
    'pad-b-fixer',
    'Rhee. You look dry. I can fix that — for cells.',
    'Parts out, power in. Make it clean.',
    { npcInsultText: 'Lowball me again and the berth goes dark.', npcCompleteText: 'Clean swap.' }
  ),
};

const PAD_B_DEPOT: InventoryBlueprint = {
  label: 'Shadow Berth Stores',
  slots: [
    { itemId: 'unmarked-canister', quantity: 2, capacity: 8, supply: 0.6, demand: 0.2 },
    { itemId: 'reaction-mass', quantity: 4, capacity: 60, supply: 0.15, demand: 0.85 },
    { itemId: 'spare-parts', quantity: 10, capacity: 25, supply: 0.55, demand: 0.25 },
    { itemId: 'organics', quantity: 6, capacity: 25, supply: 0.4, demand: 0.3 },
  ],
};

/** Pad B — shadow berth, low fuel, contraband-heavy. */
export const INVENTORY_PAD_B_DOCK: DockConfig = {
  label: 'Shadow Berth B',
  backgroundImage: '/station-2.jpg',
  fuel: { amount: 12, capacity: 100 },
  o2: { amount: 48, capacity: 100 },
  power: { amount: 28, capacity: 100 },
  crew: { amount: 2, capacity: 6 },
  inventory: PAD_B_DEPOT,
  contacts: [PAD_B_RUNNER, PAD_B_FIXER],
};

// ── Pad C — Freight exchange (life-support surplus, ore demand) ──────────────

const PAD_C_BROKER: DockContact = {
  id: 'pad-c-broker',
  name: 'Calen Moss',
  age: 31,
  role: 'trader',
  company: 'Sol Freight Exchange',
  portrait: '/Image_0.jpg',
  bio: 'Buys slag for inner relays; sells O2 and power at a premium to mining boats.',
  platform: 'HERALD',
  inventory: {
    label: 'Calen Moss',
    slots: [
      { itemId: 'o2-cells', quantity: 14, capacity: 30, supply: 0.8, demand: 0.1 },
      { itemId: 'power-cells', quantity: 11, capacity: 30, supply: 0.7, demand: 0.15 },
      { itemId: 'iron-slag', quantity: 2, capacity: 40, supply: 0.15, demand: 0.85 },
      { itemId: 'reaction-mass', quantity: 7, capacity: 50, supply: 0.4, demand: 0.35 },
    ],
  },
  dialogue: barterDialogue(
    'pad-c-broker',
    'Moss, freight exchange. I buy ore. I sell breath and volts.',
    'Show me slag if you want my cells.',
    {
      npcInsultText: 'That price insults the exchange.',
      npcCompleteText: 'Cleared. Next buyer is already on channel.',
      acceptRatio: 0.9,
    }
  ),
};

const PAD_C_QUARTERMASTER: DockContact = {
  id: 'pad-c-qm',
  name: 'Rin Okada',
  age: 44,
  role: 'dockmaster',
  company: 'Pad C Authority',
  portrait: '/profiles/scab-captain.png',
  bio: 'Keeps the pad fed. Depot is flush on O2; short on organics and spare parts.',
  platform: 'REACH',
  inventory: {
    label: 'Rin Okada',
    slots: [
      { itemId: 'o2-cells', quantity: 10, capacity: 30, supply: 0.6, demand: 0.2 },
      { itemId: 'organics', quantity: 1, capacity: 20, supply: 0.05, demand: 0.9 },
      { itemId: 'spare-parts', quantity: 0, capacity: 20, supply: 0, demand: 0.85 },
      { itemId: 'reaction-mass', quantity: 12, capacity: 50, supply: 0.5, demand: 0.25 },
    ],
  },
  dialogue: barterDialogue(
    'pad-c-qm',
    'Pad C control. State your business — resupply or clear.',
    'Organics and parts move first. O2 I can spare.',
    {
      npcInsultText: 'Pad authority rejects that package.',
      npcCompleteText: 'Logged. Undock when ready.',
    }
  ),
};

const PAD_C_DEPOT: InventoryBlueprint = {
  label: 'Freight Exchange Depot',
  slots: [
    { itemId: 'o2-cells', quantity: 24, capacity: 50, supply: 0.85, demand: 0.1 },
    { itemId: 'power-cells', quantity: 16, capacity: 40, supply: 0.75, demand: 0.15 },
    { itemId: 'iron-slag', quantity: 5, capacity: 80, supply: 0.2, demand: 0.75 },
    { itemId: 'organics', quantity: 3, capacity: 30, supply: 0.2, demand: 0.65 },
    { itemId: 'spare-parts', quantity: 2, capacity: 25, supply: 0.15, demand: 0.7 },
  ],
};

/** Pad C — freight exchange, life-support rich, ore-hungry. */
export const INVENTORY_PAD_C_DOCK: DockConfig = {
  label: 'Freight Exchange C',
  backgroundImage: '/station-3.jpg',
  fuel: { amount: 68, capacity: 100 },
  o2: { amount: 88, capacity: 100 },
  power: { amount: 74, capacity: 100 },
  crew: { amount: 3, capacity: 10 },
  inventory: PAD_C_DEPOT,
  contacts: [PAD_C_BROKER, PAD_C_QUARTERMASTER],
};

export const INVENTORY_CONFIG_DOCKS = {
  'inventory-pad-a': INVENTORY_PAD_A_DOCK,
  'inventory-pad-b': INVENTORY_PAD_B_DOCK,
  'inventory-pad-c': INVENTORY_PAD_C_DOCK,
} as const;
