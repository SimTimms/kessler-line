import {
  DRONE_MINING_CYCLE_SECONDS,
  MINING_DRONE_ID,
  MINING_DRONE_LABEL,
  type DroneType,
} from '../config/droneConfig';
import { MINING_ORE_ITEM_ID } from '../config/miningConfig';
import { MINING_DRONE_DOCK_CONFIG } from '../config/docks/miningDroneDockConfig';
import {
  getDock,
  registerDock,
  unregisterDock,
  readPartnerAmount,
} from './DockablePartnerStore';
import { addInventoryItem, listInventorySlots } from './InventoryStore';
import { getCollidables } from './CollisionRegistry';
import { getDockCaptureProfile } from '../utils/dockingCapture';
import { isClampDockProfile } from '../config/dockCaptureConfig';
import {
  selectedTargetKey,
  selectedTargetName,
  selectedTargetPosition,
} from './TargetSelection';
import * as THREE from 'three';

export const EVENT_DRONE_UI_CHANGED = 'DroneUiChanged';
export const EVENT_DRONE_COMMAND = 'DroneCommand';

export type DroneFlightMode =
  | 'stowed'
  | 'approaching'
  | 'docked'
  | 'mining'
  | 'recalling'
  | 'destroyed';

export type DroneCommand =
  | { type: 'launch'; targetId: string }
  | { type: 'beginMining' }
  | { type: 'stopMining' }
  | { type: 'recall' }
  | { type: 'reset' };

export type DroneUiState = {
  id: string;
  label: string;
  droneType: DroneType;
  mode: DroneFlightMode;
  hull: number;
  fuel: number;
  o2: number;
  power: number;
  oreCount: number;
  mining: boolean;
  miningProgress: number;
  targetId: string | null;
  targetLabel: string | null;
  statusLine: string;
  panelOpen: boolean;
};

type InternalState = {
  mode: DroneFlightMode;
  hull: number;
  targetId: string | null;
  targetLabel: string | null;
  mining: boolean;
  miningProgress: number;
  panelOpen: boolean;
  statusLine: string;
};

let internal: InternalState = {
  mode: 'stowed',
  hull: 100,
  targetId: null,
  targetLabel: null,
  mining: false,
  miningProgress: 0,
  panelOpen: true,
  statusLine: 'Bayed — select a target and launch',
};

let miningRaf = 0;
let miningStartedAt = 0;
let dockRegistered = false;

function notify() {
  window.dispatchEvent(new CustomEvent(EVENT_DRONE_UI_CHANGED));
}

function syncResourcesFromDock(): { fuel: number; o2: number; power: number; oreCount: number } {
  const dock = getDock(MINING_DRONE_ID);
  const slots = listInventorySlots({ kind: 'dock', dockId: MINING_DRONE_ID });
  const ore = slots.find((s) => s.itemId === MINING_ORE_ITEM_ID);
  return {
    fuel: dock?.fuel?.amount ?? readPartnerAmount(MINING_DRONE_ID, 'fuel'),
    o2: dock?.o2?.amount ?? 0,
    power: dock?.power?.amount ?? 0,
    oreCount: ore?.quantity ?? 0,
  };
}

export function ensureMiningDroneDockRegistered(): void {
  if (dockRegistered) return;
  registerDock({ id: MINING_DRONE_ID, ...MINING_DRONE_DOCK_CONFIG });
  dockRegistered = true;
}

export function unregisterMiningDroneDock(): void {
  if (!dockRegistered) return;
  unregisterDock(MINING_DRONE_ID);
  dockRegistered = false;
}

export function getDroneUi(): DroneUiState {
  const resources = syncResourcesFromDock();
  return {
    id: MINING_DRONE_ID,
    label: MINING_DRONE_LABEL,
    droneType: 'mining',
    mode: internal.mode,
    hull: internal.hull,
    fuel: resources.fuel,
    o2: resources.o2,
    power: resources.power,
    oreCount: resources.oreCount,
    mining: internal.mining,
    miningProgress: internal.miningProgress,
    targetId: internal.targetId,
    targetLabel: internal.targetLabel,
    statusLine: internal.statusLine,
    panelOpen: internal.panelOpen,
  };
}

export function getDroneMode(): DroneFlightMode {
  return internal.mode;
}

export function getDroneTargetId(): string | null {
  return internal.targetId;
}

export function getDroneHull(): number {
  return internal.hull;
}

export function isDroneMining(): boolean {
  return internal.mining;
}

function setInternal(partial: Partial<InternalState>) {
  internal = { ...internal, ...partial };
  notify();
}

function stopMiningLoop() {
  if (miningRaf) {
    cancelAnimationFrame(miningRaf);
    miningRaf = 0;
  }
}

function tickMining() {
  if (!internal.mining || internal.mode !== 'mining') {
    stopMiningLoop();
    return;
  }
  const elapsed = (performance.now() - miningStartedAt) / 1000;
  const progress = Math.min(1, elapsed / DRONE_MINING_CYCLE_SECONDS);
  if (progress !== internal.miningProgress) {
    setInternal({ miningProgress: progress });
  }
  if (progress >= 1) {
    addInventoryItem({ kind: 'dock', dockId: MINING_DRONE_ID }, MINING_ORE_ITEM_ID, 1);
    miningStartedAt = performance.now();
    setInternal({ miningProgress: 0, statusLine: 'Ore extracted — continuing cycle' });
  }
  miningRaf = requestAnimationFrame(tickMining);
}

export function beginDroneMining(): void {
  if (internal.mode !== 'docked' && internal.mode !== 'mining') return;
  if (!internal.targetId) return;
  miningStartedAt = performance.now();
  setInternal({
    mode: 'mining',
    mining: true,
    miningProgress: 0,
    panelOpen: true,
    statusLine: 'Mining in progress',
  });
  stopMiningLoop();
  miningRaf = requestAnimationFrame(tickMining);
}

export function stopDroneMining(): void {
  stopMiningLoop();
  if (!internal.mining) return;
  const wasMiningFlight = internal.mode === 'mining';
  setInternal({
    mining: false,
    miningProgress: 0,
    mode: wasMiningFlight ? 'docked' : internal.mode,
    statusLine: wasMiningFlight ? 'Clamped — idle' : internal.statusLine,
  });
}

/** Resolve a launchable clamp / mineable target from current selection. */
export function resolveLaunchTargetFromSelection(): {
  targetId: string;
  label: string;
  position: THREE.Vector3;
} | null {
  const key = selectedTargetKey;
  if (!key) return null;
  const entry =
    getCollidables().find((c) => c.id === key) ??
    getCollidables().find((c) => c.stationId === key) ??
    getCollidables().find((c) => c.label === key || c.label === selectedTargetName);
  if (!entry) return null;
  if (!isClampDockProfile(getDockCaptureProfile(entry))) return null;
  const position = new THREE.Vector3();
  entry.getWorldPosition(position);
  // Keep selection position in sync for callers that read the ref.
  selectedTargetPosition.copy(position);
  return {
    targetId: entry.id,
    label: entry.label ?? selectedTargetName ?? entry.id,
    position,
  };
}

export function commandLaunchAtSelection(): boolean {
  const target = resolveLaunchTargetFromSelection();
  if (!target) return false;
  if (internal.mode !== 'stowed') return false;
  if (internal.hull <= 0) return false;
  const fuel = syncResourcesFromDock().fuel;
  if (fuel <= 0) {
    setInternal({ statusLine: 'Launch aborted — no fuel' });
    return false;
  }
  setInternal({
    mode: 'approaching',
    targetId: target.targetId,
    targetLabel: target.label,
    mining: false,
    miningProgress: 0,
    panelOpen: true,
    statusLine: `Approaching ${target.label}`,
  });
  window.dispatchEvent(
    new CustomEvent(EVENT_DRONE_COMMAND, {
      detail: { type: 'launch', targetId: target.targetId } satisfies DroneCommand,
    })
  );
  return true;
}

export function commandRecall(): boolean {
  if (internal.mode === 'stowed' || internal.mode === 'destroyed' || internal.mode === 'recalling') {
    return false;
  }
  stopMiningLoop();
  setInternal({
    mode: 'recalling',
    mining: false,
    miningProgress: 0,
    panelOpen: true,
    statusLine: 'Recalling to ship',
  });
  window.dispatchEvent(
    new CustomEvent(EVENT_DRONE_COMMAND, {
      detail: { type: 'recall' } satisfies DroneCommand,
    })
  );
  return true;
}

export function notifyDroneDocked(targetId: string, label: string): void {
  stopMiningLoop();
  setInternal({
    mode: 'docked',
    targetId,
    targetLabel: label,
    mining: false,
    miningProgress: 0,
    panelOpen: true,
    statusLine: `Docked with ${label}`,
  });
}

export function notifyDroneStowed(): void {
  stopMiningLoop();
  setInternal({
    mode: 'stowed',
    targetId: null,
    targetLabel: null,
    mining: false,
    miningProgress: 0,
    statusLine: 'Bayed — select a target and launch',
  });
}

export function applyDroneHullDamage(amount: number): void {
  if (amount <= 0 || internal.mode === 'destroyed') return;
  const hull = Math.max(0, internal.hull - amount);
  if (hull <= 0) {
    stopMiningLoop();
    setInternal({
      hull: 0,
      mode: 'destroyed',
      mining: false,
      miningProgress: 0,
      panelOpen: true,
      statusLine: 'Drone destroyed',
    });
    return;
  }
  setInternal({ hull, statusLine: `Hull damage — ${Math.round(hull)}%` });
}

export function burnDroneFuel(amount: number): number {
  const dock = getDock(MINING_DRONE_ID);
  if (!dock?.fuel || amount <= 0) return 0;
  const burned = Math.min(amount, dock.fuel.amount);
  dock.fuel.amount -= burned;
  if (burned > 0) notify();
  return burned;
}

export function getDroneFuel(): number {
  return syncResourcesFromDock().fuel;
}

export function resetDroneState(): void {
  stopMiningLoop();
  ensureMiningDroneDockRegistered();
  const dock = getDock(MINING_DRONE_ID);
  if (dock?.fuel) dock.fuel.amount = MINING_DRONE_DOCK_CONFIG.fuel?.amount ?? 60;
  if (dock?.o2) dock.o2.amount = MINING_DRONE_DOCK_CONFIG.o2?.amount ?? 40;
  if (dock?.power) dock.power.amount = MINING_DRONE_DOCK_CONFIG.power?.amount ?? 70;
  internal = {
    mode: 'stowed',
    hull: 100,
    targetId: null,
    targetLabel: null,
    mining: false,
    miningProgress: 0,
    panelOpen: true,
    statusLine: 'Bayed — select a target and launch',
  };
  notify();
}

export function setDronePanelOpen(open: boolean): void {
  setInternal({ panelOpen: open });
}

export interface DroneSaveData {
  mode: DroneFlightMode;
  hull: number;
  targetId: string | null;
  targetLabel: string | null;
  mining: boolean;
  miningProgress: number;
  statusLine: string;
}

export function restoreDroneState(saved: DroneSaveData): void {
  stopMiningLoop();
  ensureMiningDroneDockRegistered();
  internal = {
    mode: saved.mode,
    hull: saved.hull,
    targetId: saved.targetId,
    targetLabel: saved.targetLabel,
    // Never restore active mining — the RAF loop can't resume with stale timestamps
    mining: false,
    miningProgress: 0,
    panelOpen: true,
    statusLine: saved.statusLine,
  };
  notify();
}
