import { addCargoItem } from './Inventory';
import {
  MINING_CYCLE_SECONDS,
  MINING_MODULE_ID,
  MINING_ORE_ITEM_ID,
} from '../config/miningConfig';
import { getCollidables } from './CollisionRegistry';
import { getDockCaptureProfile } from '../utils/dockingCapture';
import { isClampDockProfile } from '../config/dockCaptureConfig';
import { hasVesselModule } from './VesselStateStore';
import { PLAYER_VESSEL_ID } from './PlayerShipState';

export const EVENT_MINING_UI_CHANGED = 'MiningUiChanged';
export const EVENT_MINING_CYCLE_COMPLETE = 'MiningCycleComplete';

export type MiningUiState = {
  /** True when clamped to a mineable asteroid with a mining module installed. */
  clampActive: boolean;
  asteroidId: string | null;
  mining: boolean;
  /** 0–1 progress through the current extraction cycle. */
  progress: number;
};

let state: MiningUiState = {
  clampActive: false,
  asteroidId: null,
  mining: false,
  progress: 0,
};

let listenersBound = false;
let rafId = 0;
let cycleStartedAt = 0;

function notify() {
  window.dispatchEvent(new CustomEvent(EVENT_MINING_UI_CHANGED));
}

export function getMiningUi(): MiningUiState {
  return state;
}

function setState(partial: Partial<MiningUiState>) {
  state = { ...state, ...partial };
  notify();
}

function stopMiningLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

function tickMining() {
  if (!state.mining || !state.clampActive) {
    stopMiningLoop();
    return;
  }
  const elapsed = (performance.now() - cycleStartedAt) / 1000;
  const progress = Math.min(1, elapsed / MINING_CYCLE_SECONDS);
  if (progress !== state.progress) {
    setState({ progress });
  }
  if (progress >= 1) {
    addCargoItem(MINING_ORE_ITEM_ID, 1);
    window.dispatchEvent(
      new CustomEvent(EVENT_MINING_CYCLE_COMPLETE, {
        detail: { itemId: MINING_ORE_ITEM_ID, quantity: 1 },
      })
    );
    cycleStartedAt = performance.now();
    setState({ progress: 0 });
  }
  rafId = requestAnimationFrame(tickMining);
}

export function beginMining(): void {
  if (!state.clampActive || state.mining) return;
  if (!hasVesselModule(PLAYER_VESSEL_ID, MINING_MODULE_ID)) return;
  cycleStartedAt = performance.now();
  setState({ mining: true, progress: 0 });
  stopMiningLoop();
  rafId = requestAnimationFrame(tickMining);
}

export function stopMining(): void {
  stopMiningLoop();
  if (!state.mining && state.progress === 0) return;
  setState({ mining: false, progress: 0 });
}

function isMiningClampDock(stationId: string | null): boolean {
  if (!stationId) return false;
  if (!hasVesselModule(PLAYER_VESSEL_ID, MINING_MODULE_ID)) return false;
  const entry =
    getCollidables().find((c) => c.id === stationId) ??
    getCollidables().find((c) => c.stationId === stationId);
  if (!entry) return false;
  return isClampDockProfile(getDockCaptureProfile(entry));
}

/** Bind once so mining HUD stays in sync with clamp dock events. */
export function ensureMiningUiListeners() {
  if (listenersBound || typeof window === 'undefined') return;
  listenersBound = true;

  window.addEventListener('ShipDocked', (e: Event) => {
    const detail = (e as CustomEvent<{ stationId: string | null; clamp?: boolean }>).detail;
    const stationId = detail?.stationId ?? null;
    if (detail?.clamp || isMiningClampDock(stationId)) {
      setState({
        clampActive: true,
        asteroidId: stationId,
        mining: false,
        progress: 0,
      });
      return;
    }
    stopMining();
    setState({ clampActive: false, asteroidId: null });
  });

  window.addEventListener('ShipUndocked', () => {
    stopMining();
    setState({ clampActive: false, asteroidId: null });
  });
}

ensureMiningUiListeners();
