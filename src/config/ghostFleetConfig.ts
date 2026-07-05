export const SHIP_LABELS = [
  'FREIGHT SIG',
  'UNREGISTERED',
  'DRIVE TRACE',
  'GHOST SIG',
  'MINING VESSEL',
  'DEEP HAUL',
  'TRANSIT DRIVE',
  'DEBRIS HAULER',
  'COMMERCIAL',
  'UNIDENTIFIED',
  'RESEARCH',
  'MILITARY',
  'EXPLORATION',
  'SALVAGE',
  'TOWING',
  'PASSENGER',
  'FREIGHTER',
  'MINING',
  'HAULER',
  'SCIENTIFIC',
  'UNKNOWN',
];

export const SHIP_NAMES = [
  'ACHERON-2',
  'SABLE-WING',
  'STELLAROSA',
  'IKORA',
  'CETUS-3',
  'VESSEL YANTARA',
  'BRASK-ACTUAL',
  'STATION MINERVA',
  'OUTRIDER-7',
  'TRANSPORT-09',
  'MV HELION',
  'MV PALLOR',
  'DRIFT-3',
  'RELAY THETA',
  'SUPPLY-22',
  'TANKER-BRAVO',
  'THE LONG HAUL',
  'FERRY-14',
  'KASTOR',
  'MERIDIAN',
  'COLDFIRE',
  'VAGRANT III',
  'MV BELKA',
  'MV EREBUS',
  'TRANSIT-06',
  'HERALD-3',
  'MV JUNO',
  'ORION-7',
  'FLAB DRAGON',
  'ODINS BEARD',
  'BLACKBEARDS DELIGHTS',
];

export const STATION_NAMES = [
  'MINERVA',
  'SIRIX STATION',
  'TC NESTOR',
  'TC CYGNUS-4',
  'PL IRONSIDE',
  'WAYPOINT-9',
  'DEPOT-KAPPA',
  'MV LUCENT',
];
export const BEACON_NAMES = [
  `BEACON-${Math.floor(Math.random() * 10)}`,
  `BEACON-${Math.floor(Math.random() * 10)}`,
  `BEACON-${Math.floor(Math.random() * 10)}`,
  `DRONE-${Math.floor(Math.random() * 10)}`,
  `BEACON-${Math.floor(Math.random() * 10)}`,
  `BEACON-${Math.floor(Math.random() * 10)}`,
  `BEACON-${Math.floor(Math.random() * 10)}`,
  `BEACON-${Math.floor(Math.random() * 10)}`,
  `BEACON-${Math.floor(Math.random() * 10)}`,
  `BEACON-${Math.floor(Math.random() * 10)}`,
];
export const DISPATCHNAME = [
  'HARBOUR ADVISORY',
  'FLEET DISPATCH',
  'TRAFFIC CONTROL',
  'PORT AUTHORITY',
  'SAFETY DISPATCH',
  'EMERGENCY RESPONSE',
  'NAVAL DISPATCH',
  'CIVILIAN DISPATCH',
  'SECURITY DISPATCH',
  'RESCUE DISPATCH',
];
export const GHOST_FLEET_RADIUS = 40000000;
export const GHOST_FLEET_SHIP_COUNT = 100;
export const GHOST_FLEET_NEPTUNE_SHIP_COUNT = 50;
export const GHOST_FLEET_NEPTUNE_ORBIT_ALTITUDE_MULTIPLIER = 1.75;
export const GHOST_FLEET_NEPTUNE_ORBIT_RATIO = 0.8;
export const GHOST_FLEET_NEPTUNE_ORBIT_BAND_MIN = 0.9;
export const GHOST_FLEET_NEPTUNE_ORBIT_BAND_MAX = 1.1;
export const GHOST_FLEET_NEPTUNE_SCATTER_BAND_MIN = 0.55;
export const GHOST_FLEET_NEPTUNE_SCATTER_BAND_MAX = 1.7;
export const GHOST_FLEET_NEAR_RENDER_DISTANCE = 30_000;
export const GHOST_FLEET_NEAR_MODEL_URL = '/uboat.glb';
/** Target world-space size (longest axis) for rendered rendezvous ships. */
export const GHOST_FLEET_NEAR_MODEL_TARGET_SIZE = 120;
/** Extra artist-tuning multiplier applied after auto-normalizing GLB size. */
export const GHOST_FLEET_NEAR_MODEL_SCALE_MULTIPLIER = 30;
export const GHOST_FLEET_RENDEZVOUS_DOCK_HALF_EXTENTS = [12, 8, 16] as const;
