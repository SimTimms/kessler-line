/**
 * SaveManager — reads from / writes to all global state refs.
 *
 * capture() snapshots the current game state into a SaveData object.
 * apply()   restores a SaveData object back into all global state refs.
 */

import * as THREE from 'three';
import {
  SAVE_VERSION,
  type SaveData,
  type SavedMessage,
  type SavedInventory,
} from './SaveStore';
import { shipPosRef } from './ShipPos';
import {
  power,
  fuel,
  o2,
  hullIntegrity,
  setPower,
  setFuel,
  setO2,
  setHullIntegrity,
  shipVelocity,
  shipQuaternion,
  mainEngineDisabled,
} from './ShipState';
import { cargo, setCargo } from './Inventory';
import { navTargetIdRef, navTargetPosRef } from './NavTarget';
import { messageStore } from './MessageStore';
import { activeMissionRef, completedMissionsRef, declinedMissionsRef, setActiveMissions, setCompletedMissions, setDeclinedMissions } from './MissionState';
import { tutorialStepRef, dockingTutorialActiveRef } from './TutorialState';
import { getAllSettlementRuntimes, restoreSettlement } from './SettlementTracker';
import { getDroneUi, restoreDroneState } from './DroneStore';
import {
  getAllInventories,
  ensureInventory,
  type InventoryOwnerRef,
} from './InventoryStore';
import { getAllThreads, restoreThreads } from './ChatStore';
import { getAllHailStates, restoreHailStates } from './HailState';
import { getAllShipRecords, restoreShipRecords } from '../narrative/shipRegistry';
import {
  scannerPowerLevelRefs,
  getScannerRange,
  isScannerPowerOn,
  type ScannerElementId,
  type ScannerRangeId,
} from '../config/scanRanges';
import { magneticOnRef, magneticScanRangeRef } from './MagneticScan';
import { driveSignatureOnRef, driveSignatureRangeRef } from './DriveSignatureScan';
import { proximityScanOnRef, proximityScanRangeRef } from './ProximityScan';
import { radioOnRef, radioRangeRef } from './RadioState';
import { spotlightOnRef } from './SpotlightState';
import { radiationOnRef, radiationRangeRef } from './RadiationScan';
import {
  listCargoContainers,
  setSavedContainerPosition,
  clearSavedContainerPositions,
} from './CargoContainerRegistry';
import {
  getSavedContactIds,
  setSavedContactIds,
  getHistoricalContactIds,
  setHistoricalContactIds,
} from './SavedContactsState';
import { captureCO2FilterState, applyCO2FilterState } from './CO2FilterStore';

function parseOwnerKey(ownerKey: string): InventoryOwnerRef | null {
  // "dock:X:contact:Y" → { kind: 'contact', dockId: X, contactId: Y }
  const contactMatch = ownerKey.match(/^dock:(.+?):contact:(.+)$/);
  if (contactMatch) {
    return { kind: 'contact', dockId: contactMatch[1], contactId: contactMatch[2] };
  }
  // "dock:X" → { kind: 'dock', dockId: X }
  const dockMatch = ownerKey.match(/^dock:(.+)$/);
  if (dockMatch) {
    return { kind: 'dock', dockId: dockMatch[1] };
  }
  // "vessel:X" — skip; player cargo is restored separately
  return null;
}

export function capture(): SaveData {
  // ── Dock inventories (skip vessel owners — cargo covers player inventory) ──
  const dockInventories: Record<string, SavedInventory> = {};
  for (const [key, state] of getAllInventories()) {
    if (state.owner.kind === 'vessel') continue;
    dockInventories[key] = {
      ownerKey: state.ownerKey,
      label: state.label,
      slots: state.slots.map((s) => ({ ...s })),
    };
  }

  // ── Settlements ────────────────────────────────────────────────────────────
  const settlements: SaveData['settlements'] = {};
  for (const [id, runtime] of getAllSettlementRuntimes()) {
    settlements[id] = {
      food: runtime.food,
      water: runtime.water,
      air: runtime.air,
      population: runtime.population,
      violence: runtime.violence,
      status: runtime.status,
      starvationElapsedSec: runtime.starvationElapsedSec,
      tickAccumulatorSec: runtime.tickAccumulatorSec,
    };
  }

  // ── Drone ──────────────────────────────────────────────────────────────────
  const droneUi = getDroneUi();

  // ── Messages — serialize full fields ───────────────────────────────────────
  const messages: SavedMessage[] = messageStore.current.map((m) => ({
    id: m.id,
    from: m.from,
    subject: m.subject,
    body: m.body,
    read: m.read,
    timestamp: m.timestamp,
    repliedWith: m.repliedWith,
    platform: m.platform,
    replies: m.replies,
    audioFile: m.audioFile,
    audioVoice: m.audioVoice,
    senderLocationId: m.senderLocationId,
  }));

  // ── Chat / hail / ship registry ──────────────────────────────────────────
  const chatThreads: Record<string, { shipId: string; shipName: string; captainName: string; dialogueTreeId: string; messages: { id: string; role: 'player' | 'npc'; text: string; timestamp: number }[]; currentTurnId: string | null; awaitingNpc: boolean }> = {};
  for (const [id, thread] of getAllThreads()) {
    chatThreads[id] = {
      shipId: thread.shipId,
      shipName: thread.shipName,
      captainName: thread.captainName,
      dialogueTreeId: thread.dialogueTreeId,
      messages: thread.messages.map((m) => ({ ...m })),
      currentTurnId: thread.currentTurnId,
      awaitingNpc: thread.awaitingNpc,
    };
  }

  return {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    position: [shipPosRef.current.x, shipPosRef.current.y, shipPosRef.current.z],
    velocity: [shipVelocity.x, shipVelocity.y, shipVelocity.z],
    quaternion: [shipQuaternion.x, shipQuaternion.y, shipQuaternion.z, shipQuaternion.w],
    power,
    fuel,
    o2,
    hullIntegrity,
    engineDamage: {
      reverseA: mainEngineDisabled.reverseA.current,
      reverseB: mainEngineDisabled.reverseB.current,
    },
    cargo: cargo.map((c) => ({ name: c.name, quantity: c.quantity })),
    navTargetId: navTargetIdRef.current,
    navTargetPos: [navTargetPosRef.current.x, navTargetPosRef.current.y, navTargetPosRef.current.z],
    messages,
    missions: {
      activeMission: activeMissionRef.current,
      completedMissions: [...completedMissionsRef.current],
      declinedMissions: [...declinedMissionsRef.current],
    },
    tutorial: {
      step: tutorialStepRef.current,
      dockingActive: dockingTutorialActiveRef.current,
    },
    settlements,
    drone: {
      mode: droneUi.mode,
      hull: droneUi.hull,
      targetId: droneUi.targetId,
      targetLabel: droneUi.targetLabel,
      mining: droneUi.mining,
      miningProgress: droneUi.miningProgress,
      statusLine: droneUi.statusLine,
    },
    dockInventories,
    chatThreads,
    hailStates: getAllHailStates(),
    shipRegistry: getAllShipRecords(),
    scannerPowerLevels: Object.fromEntries(
      (Object.keys(scannerPowerLevelRefs) as ScannerElementId[]).map(
        (id) => [id, scannerPowerLevelRefs[id].current]
      )
    ),
    containerPositions: Object.fromEntries(
      listCargoContainers()
        .filter((c) => !c.isConsumed())
        .map((c) => {
          const p = c.getSimPosition();
          return [c.id, [p.x, p.y, p.z] as [number, number, number]];
        })
    ),
    savedContactIds: getSavedContactIds(),
    historicalContactIds: getHistoricalContactIds(),
    co2FilterLevel: captureCO2FilterState().level,
    co2SpareFilters: captureCO2FilterState().spares,
    co2NoFilterElapsed: captureCO2FilterState().noFilterElapsed,
  };
}

/**
 * Apply a save to all module-level state refs.
 * Call this before the Spaceship component mounts so that initialPosition
 * picks up the restored coordinates.
 */
export function apply(data: SaveData): void {
  // Position — shipPosRef is read by Scene to set initialPosition
  shipPosRef.current.set(...data.position);

  // Velocity & quaternion — written into the Three.js objects that
  // useShipPhysics reads on its first frame
  shipVelocity.set(...data.velocity);
  shipQuaternion.set(...data.quaternion);

  // Resources
  setPower(data.power);
  setFuel(data.fuel);
  setO2(data.o2);
  setHullIntegrity(data.hullIntegrity);

  // Engine damage
  mainEngineDisabled.reverseA.current = data.engineDamage.reverseA;
  mainEngineDisabled.reverseB.current = data.engineDamage.reverseB;

  // Cargo
  setCargo(data.cargo);

  // Nav target
  navTargetIdRef.current = data.navTargetId;
  navTargetPosRef.current.set(...data.navTargetPos);

  // Inbox — clean replace: now that we save full message fields, a clean
  // replace is more reliable than the old merge strategy
  messageStore.current.length = 0;
  for (const msg of data.messages) {
    messageStore.current.push({ ...msg });
  }

  // Missions — backward compat: old saves store activeMission as string | null
  const rawActive = data.missions.activeMission;
  const activeMissions = Array.isArray(rawActive)
    ? rawActive
    : rawActive != null
      ? [rawActive]
      : [];
  setActiveMissions(activeMissions);
  setCompletedMissions(data.missions.completedMissions);
  setDeclinedMissions(data.missions.declinedMissions ?? []);

  // Tutorial
  tutorialStepRef.current = data.tutorial.step;
  dockingTutorialActiveRef.current = data.tutorial.dockingActive;

  // Settlements
  for (const [settlementId, saved] of Object.entries(data.settlements)) {
    restoreSettlement(settlementId, saved);
  }

  // Drone
  restoreDroneState(data.drone);

  // Dock inventories — restore BEFORE components mount so ensureInventory's
  // guard (slots.length === 0) prevents dock registration from overwriting
  for (const [ownerKey, saved] of Object.entries(data.dockInventories)) {
    const owner = parseOwnerKey(ownerKey);
    if (!owner) continue;
    const state = ensureInventory(owner, undefined, saved.label);
    state.slots = saved.slots.map((s) => ({ ...s }));
  }

  // Chat threads
  if (data.chatThreads) {
    restoreThreads(data.chatThreads);
  }

  // Hail states
  if (data.hailStates) {
    restoreHailStates(data.hailStates);
  }

  // Ship registry
  if (data.shipRegistry) {
    restoreShipRecords(data.shipRegistry);
  }

  // Scanner power levels → also sync on/off and range refs
  if (data.scannerPowerLevels) {
    for (const [id, level] of Object.entries(data.scannerPowerLevels)) {
      const key = id as ScannerElementId;
      if (scannerPowerLevelRefs[key]) {
        scannerPowerLevelRefs[key].current = level;
      }
    }
    const on = (id: ScannerElementId) => isScannerPowerOn(scannerPowerLevelRefs[id].current);
    const range = (id: ScannerRangeId) => getScannerRange(id, scannerPowerLevelRefs[id].current);
    spotlightOnRef.current = on('spotlight');
    magneticOnRef.current = on('magnet');
    magneticScanRangeRef.current = range('magnet');
    driveSignatureOnRef.current = on('drive');
    driveSignatureRangeRef.current = range('drive');
    proximityScanOnRef.current = on('proximity');
    proximityScanRangeRef.current = range('proximity');
    radioOnRef.current = on('radio');
    radioRangeRef.current = range('radio');
    radiationOnRef.current = on('radiation');
    radiationRangeRef.current = range('radiation');
  }

  // Cargo container positions — stash in the registry so CargoContainer reads
  // them on mount instead of resetting to prop-defined spawn positions.
  clearSavedContainerPositions();
  if (data.containerPositions) {
    for (const [id, pos] of Object.entries(data.containerPositions)) {
      setSavedContainerPosition(id, pos);
    }
  }

  // Saved contacts
  if (data.savedContactIds) {
    setSavedContactIds(data.savedContactIds);
  }
  if (data.historicalContactIds) {
    setHistoricalContactIds(data.historicalContactIds);
  }

  // CO2 filter
  if (data.co2FilterLevel !== undefined) {
    applyCO2FilterState(
      data.co2FilterLevel,
      data.co2SpareFilters ?? [],
      data.co2NoFilterElapsed ?? 0,
    );
  }
}

/** Convert a saved quaternion to Euler XYZ angles for R3F group rotation prop. */
export function savedQuaternionToEuler(
  q: [number, number, number, number]
): [number, number, number] {
  const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(...q), 'XYZ');
  return [euler.x, euler.y, euler.z];
}
