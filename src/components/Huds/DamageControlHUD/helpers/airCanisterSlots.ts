import { useEffect, useState, type DragEvent } from 'react';
import {
  getInstalledAirCanisterLevel,
  subscribeAirCanister,
  installAirCanisterFromCargo,
} from '../../../../context/AirCanisterStore';
import { AIR_CANISTER_ITEM_ID } from '../../../../config/damageConfig';
import {
  isCargoDragEvent,
  readCargoDragPayload,
  writeCargoDragPayload,
  type CargoDragPayload,
} from '../../PowerHUD/Cargo/cargoHoldHelpers';
import { AIR_CANISTER_SLOT_OWNER } from '../../PowerHUD/Cargo/CargoHoldPanel';
import type { InventoryOwnerRef } from '../../../../context/InventoryStore';

export const AIR_CANISTER_SLOT_OWNER_REF: InventoryOwnerRef = {
  kind: 'vessel',
  vesselId: AIR_CANISTER_SLOT_OWNER,
};

export function useAirCanister() {
  const [level, setLevel] = useState(() => getInstalledAirCanisterLevel());
  useEffect(() => subscribeAirCanister(() => setLevel(getInstalledAirCanisterLevel())), []);
  return level;
}

interface AirCanisterDragHandlersProps {
  airCanisterInstalled: boolean;
  setAirCanisterDropTarget: (isTarget: boolean) => void;
}

/** Drag-and-drop handlers for the air canister module slot. */
export function createAirCanisterDragHandlers({
  airCanisterInstalled,
  setAirCanisterDropTarget,
}: AirCanisterDragHandlersProps) {
  function onAirCanisterDragStart(e: DragEvent) {
    if (!airCanisterInstalled) return;
    const payload: CargoDragPayload = {
      itemId: AIR_CANISTER_ITEM_ID,
      quantity: 1,
      from: AIR_CANISTER_SLOT_OWNER_REF,
    };
    writeCargoDragPayload(e.dataTransfer, payload);
  }

  function onAirCanisterDragOver(e: DragEvent) {
    if (!isCargoDragEvent(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setAirCanisterDropTarget(true);
  }

  function onAirCanisterDragLeave() {
    setAirCanisterDropTarget(false);
  }

  function onAirCanisterDrop(e: DragEvent) {
    setAirCanisterDropTarget(false);
    e.preventDefault();
    const payload = readCargoDragPayload(e.dataTransfer);
    if (!payload || payload.itemId !== AIR_CANISTER_ITEM_ID) return;
    // Don't accept drops from the slot itself
    if (payload.from.kind === 'vessel' && payload.from.vesselId === AIR_CANISTER_SLOT_OWNER) return;
    installAirCanisterFromCargo();
  }

  return {
    onAirCanisterDragStart,
    onAirCanisterDragOver,
    onAirCanisterDragLeave,
    onAirCanisterDrop,
  };
}
