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
  setShipCrew,
  resetAmmo,
} from './ShipState';
import { addDerelict, type DerelictRecord } from './DerelictStore';
import { addCargoItem, clearCargo } from './Inventory';
import { resetCO2Filter } from './CO2FilterStore';
import { HULL_REPAIR_PATCH_ITEM_ID } from '../config/damageConfig';
import { clearFractures } from './DamageControlStore';
import { setSavedContactIds, setHistoricalContactIds } from './SavedContactsState';
import { disableAutopilot } from './AutopilotState';
import { clearNavTarget } from './NavTarget';
import { clearSelectedTarget } from './TargetSelection';
import { resetCameraMode } from './CameraMode';
import { minimapShipPosition } from './MinimapShipPosition';
import { randomizeCurrentShip } from '../config/shipConfig';
import { resetResourceDrainFlags } from '../hooks/shipPhysics/resourceDrain';

export const EVENT_SHIP_RESPAWNED = 'ShipRespawned';

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

  // 6. Clear cargo, then reset CO2 filter (adds 2 filters) + hull patches
  clearCargo();
  resetCO2Filter();
  addCargoItem(HULL_REPAIR_PATCH_ITEM_ID, 2);

  // 7. Clear existing fractures (new ship has no prior damage)
  clearFractures();

  // 8. Clear contacts
  setSavedContactIds([]);
  setHistoricalContactIds([]);

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
