import * as THREE from 'three';
import { shipPosRef } from './ShipPos';
import {
  shipVelocity,
  shipQuaternion,
  shipDestroyed,
  mainEngineDisabled,
  setHullIntegrity,
  setFuel,
  setO2,
  setPower,
  setShipCrew,
  resetAmmo,
  fuel,
  o2,
  power,
} from './ShipState';
import { addDerelict, type DerelictRecord } from './DerelictStore';
import { addCargoItem, clearCargo, cargo } from './Inventory';
import { resetCO2Filter } from './CO2FilterStore';
import { resetCommsBuffer } from './CommsBufferStore';
import { resetEmergencyBattery } from './EmergencyBatteryStore';
import { HULL_REPAIR_PATCH_ITEM_ID } from '../config/damageConfig';
import { clearFractures } from './DamageControlStore';
import {
  setSavedContactIds,
  setHistoricalContactIds,
  getSavedContactIds,
  getHistoricalContactIds,
} from './SavedContactsState';
import { disableAutopilot } from './AutopilotState';
import { clearNavTarget } from './NavTarget';
import { clearSelectedTarget } from './TargetSelection';
import { resetCameraMode } from './CameraMode';
import { minimapShipPosition } from './MinimapShipPosition';
import { CURRENT_SHIP, randomizeCurrentShip } from '../config/shipConfig';
import { resetResourceDrainFlags } from '../hooks/shipPhysics/resourceDrain';
import { messageStore, clearMessages } from './MessageStore';
import { getAllThreads } from './ChatStore';
import type { DossierData } from '../components/CommsChat/ContactDossier';

export const EVENT_SHIP_RESPAWNED = 'ShipRespawned';

const PILOT_FIRST_NAMES = [
  'Yuri', 'Ines', 'Kwame', 'Lin', 'Hector', 'Sable', 'Jaya', 'Orin',
  'Reva', 'Tomas', 'Nessa', 'Callum', 'Ada', 'Mikhail', 'Zuri', 'Dex',
  'Noor', 'Jules', 'Petra', 'Harlan',
];
const PILOT_SURNAMES = [
  'Voss', 'Okafor', 'Shen', 'Duvall', 'Nkosi', 'Brandt', 'Ochoa', 'Kwan',
  'Morrow', 'Falk', 'Keita', 'Holst', 'Renn', 'Vasquez', 'Ito', 'Kask',
  'Okoye', 'Strand', 'Mallick', 'Gentry',
];
const PILOT_BIRTHPLACES = [
  'Ceres, Belt', 'Ganymede Station', 'Titan Colony', 'Europa Hab', 'Phobos Yard',
  'Vesta Settlement', 'Mars, Hellas Basin', 'Luna, Tycho', 'Enceladus Outpost',
  'Callisto, Valhalla', 'Pallas Station', 'Triton Relay', 'Io Mining Camp',
  'Earth, Lagos', 'Earth, Reykjavik', 'Earth, Jakarta',
];
const PILOT_COMPANIES = [
  undefined, undefined, undefined, // independent weight
  'Helix Freight', 'Aether Haulage', 'Kuiper Logistics', 'Outer Reach Salvage',
  'Meridian Corp', 'Belt Union Co-op', 'Titan Industrial',
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePilotDossier(shipName: string): DossierData {
  return {
    name: `${pick(PILOT_FIRST_NAMES)} ${pick(PILOT_SURNAMES)}`,
    age: 24 + Math.floor(Math.random() * 35),
    birthplace: pick(PILOT_BIRTHPLACES),
    company: pick(PILOT_COMPANIES),
    role: 'drifter',
    bio: `Sole crew of the ${shipName}. No further records on file.`,
  };
}

/** Player ship model used for derelict rendering. */
export const PLAYER_SHIP_MODEL_URL = '/shuttle-low-british.glb';

/** Set by Canvas-side DerelictField; processed on the next physics frame. */
export const pendingRespawnCause: { current: string | null } = { current: null };

/**
 * Capture the dead ship as a derelict at the moment of death.
 * Data only — the Canvas host adds the THREE wreck. Do not notify React.
 */
export function captureDerelictAtDeath(deathCause: string): DerelictRecord {
  return addDerelict({
    position: shipPosRef.current.clone(),
    quaternion: shipQuaternion.clone(),
    velocity: shipVelocity.clone(),
    modelUrl: PLAYER_SHIP_MODEL_URL,
    deathCause,
    cargo: cargo.map((c) => ({ itemId: c.name, quantity: c.quantity })),
    fuel,
    o2,
    power,
    isDockable: deathCause === 'o2',
    shipName: CURRENT_SHIP.name,
    savedContactIds: getSavedContactIds(),
    historicalContactIds: getHistoricalContactIds(),
    messages: [...messageStore.current],
    chatThreads: [...getAllThreads().values()],
    pilotDossier: generatePilotDossier(CURRENT_SHIP.name),
  });
}

/**
 * Respawn the player as a new ship after death.
 * Resets all player state and repositions the ship nearby.
 * The derelict must already have been captured via captureDerelictAtDeath().
 */
export function respawnAsNewShip(_deathCause: string): void {
  // 1. Capture the dead position for offset calculation (derelict already added at death time)
  const deadPosition = shipPosRef.current.clone();

  // 2. Reset destruction flag BEFORE setting hull (race condition guard)
  shipDestroyed.current = false;
  mainEngineDisabled.reverseA.current = false;
  mainEngineDisabled.reverseB.current = false;

  // 3. Reset resources and one-shot event flags
  setHullIntegrity(100);
  setFuel(100);
  setO2(100);
  setPower(90);
  setShipCrew(1);
  resetAmmo();
  resetResourceDrainFlags();

  // 4. Zero velocity, offset position from death location
  shipVelocity.set(0, 0, 0);

  const angle = Math.random() * Math.PI * 2;
  const dist = 200 + Math.random() * 300; // 200–500 units
  const newPos = new THREE.Vector3(
    deadPosition.x + Math.cos(angle) * dist,
    deadPosition.y,
    deadPosition.z + Math.sin(angle) * dist,
  );
  shipPosRef.current.copy(newPos);

  // 5. Reset quaternion to identity
  shipQuaternion.set(0, 0, 0, 1);

  // 6. Clear cargo, then reset CO2 filter (adds 2 filters) + hull patches + comms buffer
  clearCargo();
  resetCO2Filter();
  resetCommsBuffer();
  resetEmergencyBattery();
  addCargoItem(HULL_REPAIR_PATCH_ITEM_ID, 2);

  // 7. Clear existing fractures (new ship has no prior damage)
  clearFractures();

  // 8. Clear contacts and messages
  setSavedContactIds([]);
  setHistoricalContactIds([]);
  clearMessages();

  // 9. Reset navigation/targeting/autopilot/camera
  disableAutopilot();
  clearNavTarget();
  clearSelectedTarget();
  resetCameraMode('free');

  // 10. Randomize ship identity
  randomizeCurrentShip();

  // 11. Sync minimap position
  minimapShipPosition.copy(newPos);

  // 12. Notify listeners
  window.dispatchEvent(new Event(EVENT_SHIP_RESPAWNED));
}
