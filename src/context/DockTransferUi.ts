import { disablesShipPhysicsWhenDocked } from '../config/dockCaptureConfig';
import { getCollidables } from './CollisionRegistry';
import { hasDockablePartner } from './DockablePartnerStore';
import { getDockCaptureProfile } from '../utils/dockingCapture';

export const DOCK_TRANSFER_UI_CHANGED = 'DockTransferUiChanged';

export type DockTransferUiState = {
  partnerId: string | null;
  /** Full transfer panel visible. */
  panelOpen: boolean;
  /** Towable dock (ship keeps physics) — starts minimized. */
  towable: boolean;
};

let state: DockTransferUiState = {
  partnerId: null,
  panelOpen: false,
  towable: false,
};

let listenersBound = false;

function notify() {
  window.dispatchEvent(new CustomEvent(DOCK_TRANSFER_UI_CHANGED));
}

export function getDockTransferUi(): DockTransferUiState {
  return state;
}

export function isTowableDockPartner(partnerId: string): boolean {
  const bay =
    getCollidables().find((c) => c.id === `docking-bay-${partnerId}`) ??
    getCollidables().find((c) => c.stationId === partnerId);
  if (!bay) return false;
  return !disablesShipPhysicsWhenDocked(getDockCaptureProfile(bay));
}

/** Call when ship docks to a dockable partner. */
export function syncDockTransferOnDock(partnerId: string) {
  const towable = isTowableDockPartner(partnerId);
  state = {
    partnerId,
    towable,
    // Towable docks start minimized so the player can fly while attached.
    panelOpen: !towable,
  };
  notify();
}

export function clearDockTransferUi() {
  state = { partnerId: null, panelOpen: false, towable: false };
  notify();
}

export function openDockTransferPanel() {
  if (!state.partnerId) return;
  state = { ...state, panelOpen: true };
  notify();
}

export function minimizeDockTransferPanel() {
  if (!state.partnerId || !state.towable) return;
  state = { ...state, panelOpen: false };
  notify();
}

/** Bind once so cargo / transfer HUDs stay in sync with dock events. */
export function ensureDockTransferUiListeners() {
  if (listenersBound || typeof window === 'undefined') return;
  listenersBound = true;

  window.addEventListener('ShipDocked', (e: Event) => {
    const id = (e as CustomEvent<{ stationId: string | null }>).detail?.stationId ?? null;
    if (hasDockablePartner(id)) {
      syncDockTransferOnDock(id);
    } else {
      clearDockTransferUi();
    }
  });
  window.addEventListener('ShipUndocked', () => {
    clearDockTransferUi();
  });
}

ensureDockTransferUiListeners();
