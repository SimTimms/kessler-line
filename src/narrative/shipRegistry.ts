// Ship profile registry — assigns random agendas to ships on first contact
// and builds a contact history for the session.
//
// Each ship gets one profile per session (cached by shipId). Profiles are
// randomly generated on first contact using weighted pools, then used to
// select contextually appropriate dialogue trees.
//
// currentRegion is always derived from the player's actual position: you can
// only radio ships that are near you, so every contacted ship is in the same
// orbital zone as the player (or an adjacent zone if they're passing through).

import { PLANETS } from '../components/Planets/SolarSystem';
import { shipPosRef } from '../context/ShipPos';

// ── Types ──────────────────────────────────────────────────────────────────────

export type ShipFaction =
  | 'Terran Concordat'
  | 'Periphery League'
  | 'Independent'
  | 'The Drift'
  | 'Church of the Return'
  | 'Martian Citizens Front'
  | 'Corporate';

export type ShipClass =
  | 'cargo-hauler'
  | 'ore-miner'
  | 'survey'
  | 'patrol'
  | 'salvager'
  | 'courier'
  | 'merchant'
  | 'unknown'
  | 'drifter'
  | 'fast-runner'
  | 'tug'
  | 'utility'
  | 'maintenance'
  | 'independent-trader';

export type ShipRegion =
  | 'Neptune System'
  | 'Triton'
  | 'Deep Space'
  | 'Uranus Belt'
  | 'Saturn System'
  | 'Jupiter System'
  | 'Asteroid Belt'
  | 'Mars'
  | 'Earth Orbit'
  | 'Inner System';

export type ShipAgenda =
  | 'transiting'
  | 'drifting'
  | 'mining'
  | 'patrolling'
  | 'surveying'
  | 'salvaging'
  | 'in-distress'
  | 'trading'
  | 'loitering'
  | 'repairing'
  | 'urgent-delivery'
  | 'evading';

export type ShipWillingness = 'talkative' | 'brief' | 'hostile' | 'silent';

export interface ContactEvent {
  timestamp: number;
  summary: string;
}

export interface ShipRecord {
  id: string;
  vesselName: string;
  shipClass: ShipClass;
  faction: ShipFaction;
  currentRegion: ShipRegion;
  destination: ShipRegion | 'none';
  agenda: ShipAgenda;
  willingness: ShipWillingness;
  firstContact: number;
  lastContact: number;
  contacts: ContactEvent[];
}

// ── Weighted random helpers ────────────────────────────────────────────────────

function weightedRandom<T>(pool: { value: T; weight: number }[]): T {
  const total = pool.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of pool) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return pool[pool.length - 1].value;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Data pools ─────────────────────────────────────────────────────────────────

const CLASS_POOL: { value: ShipClass; weight: number }[] = [
  { value: 'cargo-hauler', weight: 35 },
  { value: 'ore-miner', weight: 20 },
  { value: 'patrol', weight: 15 },
  { value: 'independent-trader', weight: 15 },
  { value: 'salvager', weight: 10 },
  { value: 'survey', weight: 5 },
];

const FACTION_POOL: { value: ShipFaction; weight: number }[] = [
  { value: 'Periphery League', weight: 35 },
  { value: 'Independent', weight: 30 },
  { value: 'Terran Concordat', weight: 15 },
  { value: 'The Drift', weight: 10 },
  { value: 'Corporate', weight: 5 },
  { value: 'Martian Citizens Front', weight: 3 },
  { value: 'Church of the Return', weight: 2 },
];

// Ordered from outermost to innermost — used for destination selection
const ALL_REGIONS: ShipRegion[] = [
  'Deep Space',
  'Neptune System',
  'Triton',
  'Uranus Belt',
  'Saturn System',
  'Jupiter System',
  'Asteroid Belt',
  'Mars',
  'Earth Orbit',
  'Inner System',
];

// Adjacent regions for each zone — NPC ships have an 80% chance of being in
// the player's zone, 20% in a neighbor (passing through)
const REGION_NEIGHBORS: Partial<Record<ShipRegion, ShipRegion[]>> = {
  'Deep Space': ['Neptune System'],
  'Neptune System': ['Deep Space', 'Uranus Belt'],
  Triton: ['Neptune System', 'Uranus Belt'],
  'Uranus Belt': ['Neptune System', 'Saturn System'],
  'Saturn System': ['Uranus Belt', 'Jupiter System'],
  'Jupiter System': ['Saturn System', 'Asteroid Belt'],
  'Asteroid Belt': ['Jupiter System', 'Mars'],
  Mars: ['Asteroid Belt', 'Earth Orbit'],
  'Earth Orbit': ['Mars', 'Inner System'],
  'Inner System': ['Earth Orbit'],
};

const CLASS_AGENDAS: Record<ShipClass, ShipAgenda[]> = {
  'cargo-hauler': ['transiting', 'transiting', 'drifting'],
  'ore-miner': ['mining', 'mining', 'transiting'],
  survey: ['surveying', 'surveying', 'transiting'],
  patrol: ['patrolling', 'patrolling', 'transiting'],
  salvager: ['salvaging', 'salvaging', 'drifting', 'transiting'],
  'independent-trader': ['transiting', 'drifting', 'transiting'],
  courier: ['urgent-delivery', 'transiting', 'evading'],
  merchant: ['trading', 'transiting', 'loitering'],
  unknown: ['drifting', 'transiting'],
  drifter: ['drifting', 'evading'],
  'fast-runner': ['evading', 'urgent-delivery', 'transiting'],
  tug: ['transiting', 'repairing', 'drifting'],
  utility: ['repairing', 'transiting', 'loitering'],
  maintenance: ['repairing', 'loitering', 'transiting'],
};

const CLASS_WILLINGNESS: Record<ShipClass, ShipWillingness[]> = {
  'cargo-hauler': ['brief', 'brief', 'talkative'],
  'ore-miner': ['brief', 'hostile', 'brief'],
  survey: ['talkative', 'talkative', 'brief'],
  patrol: ['brief', 'hostile', 'hostile'],
  salvager: ['talkative', 'brief', 'talkative'],
  'independent-trader': ['talkative', 'brief', 'talkative'],
  courier: ['brief', 'talkative', 'silent'],
  merchant: ['talkative', 'brief', 'talkative'],
  unknown: ['silent', 'hostile', 'brief'],
  drifter: ['silent', 'hostile', 'brief'],
  'fast-runner': ['hostile', 'brief', 'silent'],
  tug: ['brief', 'talkative', 'silent'],
  utility: ['talkative', 'brief', 'silent'],
  maintenance: ['brief', 'silent', 'talkative'],
};

// Agendas that imply the ship is going somewhere
const TRANSIT_AGENDAS = new Set<ShipAgenda>(['transiting']);

// ── Player region detection ────────────────────────────────────────────────────
// Maps the player's distance from the sun (origin) to the nearest orbital zone
// using midpoints between adjacent planet orbits. Planet orbit radii are taken
// directly from the PLANETS array so this stays correct regardless of scale.

export function getPlayerRegion(): ShipRegion {
  const dist = shipPosRef.current.length();
  if (dist === 0) return 'Neptune System'; // before ship initialises

  // PLANETS indices: 0=Mercury 1=Venus 2=Earth 3=Mars 4=Jupiter 5=Saturn 6=Uranus 7=Neptune
  const [, , earth, mars, jupiter, saturn, uranus, neptune] = PLANETS.map((p) => p.orbitRadius);

  // Zone boundaries: midpoints between adjacent orbits
  const midUranusNeptune = (uranus + neptune) / 2;
  const midSaturnUranus = (saturn + uranus) / 2;
  const midJupiterSaturn = (jupiter + saturn) / 2;
  const midMarsJupiter = (mars + jupiter) / 2; // covers asteroid belt
  const midEarthMars = (earth + mars) / 2;

  if (dist > neptune * 1.15) return 'Deep Space';
  if (dist >= midUranusNeptune) return 'Neptune System';
  if (dist >= midSaturnUranus) return 'Uranus Belt';
  if (dist >= midJupiterSaturn) return 'Saturn System';
  if (dist >= midMarsJupiter) return 'Jupiter System';
  if (dist >= midEarthMars) return 'Mars'; // includes asteroid belt
  return 'Inner System';
}

// ── Display helpers ────────────────────────────────────────────────────────────

export function formatShipClass(c: ShipClass): string {
  const map: Record<ShipClass, string> = {
    'cargo-hauler': 'CARGO HAULER',
    'ore-miner': 'ORE MINER',
    survey: 'SURVEY VESSEL',
    patrol: 'PATROL',
    salvager: 'SALVAGER',
    'independent-trader': 'INDEPENDENT',
    courier: 'COURIER',
    merchant: 'MERCHANT',
    unknown: 'UNKNOWN',
    drifter: 'DRIFTER',
    'fast-runner': 'FAST RUNNER',
    tug: 'TUG',
    utility: 'UTILITY',
    maintenance: 'MAINTENANCE',
  };
  return map[c];
}

export function formatAgenda(a: ShipAgenda): string {
  const map: Record<ShipAgenda, string> = {
    transiting: 'TRANSIT',
    drifting: 'DRIFTING',
    mining: 'MINING OPS',
    patrolling: 'ON PATROL',
    surveying: 'SURVEY OPS',
    salvaging: 'SALVAGE OPS',
    'in-distress': 'IN DISTRESS',
    evading: 'RUNNING DARK',
    trading: 'TRADING',
    loitering: 'LOITERING',
    repairing: 'REPAIR OPS',
    'urgent-delivery': 'URGENT DELIVERY',
  };
  return map[a];
}

// ── Profile generation ─────────────────────────────────────────────────────────

function generateRecord(shipId: string, vesselName: string): ShipRecord {
  const shipClass = weightedRandom(CLASS_POOL);
  const faction = weightedRandom(FACTION_POOL);
  const agenda = pick(CLASS_AGENDAS[shipClass]);
  const willingness = pick(CLASS_WILLINGNESS[shipClass]);

  // Derive currentRegion from where the player actually is — ships you can
  // radio must be nearby. 80% chance they're in the same zone; 20% they're
  // a neighbour passing through.
  const playerRegion = getPlayerRegion();
  const neighbors = REGION_NEIGHBORS[playerRegion] ?? [];
  const currentRegion: ShipRegion =
    Math.random() < 0.8 || neighbors.length === 0 ? playerRegion : pick(neighbors);

  // Destination: only for transiting ships, and always somewhere other than
  // where they currently are. Prefer regions further from the player to suggest
  // the ship is heading away (or arriving from) another zone.
  const destination: ShipRegion | 'none' = TRANSIT_AGENDAS.has(agenda)
    ? pick(ALL_REGIONS.filter((r) => r !== currentRegion))
    : 'none';

  const now = Date.now();
  const profileLine = [
    formatShipClass(shipClass),
    faction,
    formatAgenda(agenda),
    destination !== 'none' ? `→ ${destination}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    id: shipId,
    vesselName,
    shipClass,
    faction,
    currentRegion,
    destination,
    agenda,
    willingness,
    firstContact: now,
    lastContact: now,
    contacts: [{ timestamp: now, summary: `First contact. ${profileLine}.` }],
  };
}

// ── Session registry ───────────────────────────────────────────────────────────

const _registry = new Map<string, ShipRecord>();

/** Returns the existing record for a ship or creates one on first call. */
export function getOrCreateShipRecord(shipId: string, vesselName: string): ShipRecord {
  if (_registry.has(shipId)) return _registry.get(shipId)!;
  const record = generateRecord(shipId, vesselName);
  _registry.set(shipId, record);
  return record;
}

/** Append a contact event and update lastContact timestamp. */
export function addContactEvent(shipId: string, summary: string): void {
  const record = _registry.get(shipId);
  if (!record) return;
  const now = Date.now();
  record.lastContact = now;
  record.contacts.push({ timestamp: now, summary });
}

/** Look up a record without creating one. */
export function getShipRecord(shipId: string): ShipRecord | undefined {
  return _registry.get(shipId);
}

/** Serialize the full registry to JSON for debugging or future save-state. */
export function serializeRegistry(): string {
  return JSON.stringify(Object.fromEntries(_registry), null, 2);
}
