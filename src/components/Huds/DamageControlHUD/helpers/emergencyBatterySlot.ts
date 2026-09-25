import { useEffect, useState, type DragEvent } from 'react';
import {
  getInstalledBatteryLevel,
  subscribeEmergencyBattery,
  installBatteryFromCargo,
} from '../../../../context/EmergencyBatteryStore';
import { EMERGENCY_BATTERY_ITEM_ID } from '../../../../config/damageConfig';
import {
  isCargoDragEvent,
  readCargoDragPayload,
  writeCargoDragPayload,
  type CargoDragPayload,
} from '../../PowerHUD/Cargo/cargoHoldHelpers';
import { EMERGENCY_BATTERY_SLOT_OWNER } from '../../PowerHUD/Cargo/CargoHoldPanel';
import type { InventoryOwnerRef } from '../../../../context/InventoryStore';

export const BATTERY_SLOT_OWNER_REF: InventoryOwnerRef = {
  kind: 'vessel',
  vesselId: EMERGENCY_BATTERY_SLOT_OWNER,
};

/** Charge of the installed emergency battery, or null when the slot is empty. */
export function useEmergencyBattery() {
  const [level, setLevel] = useState(() => getInstalledBatteryLevel());
  useEffect(() => subscribeEmergencyBattery(() => setLevel(getInstalledBatteryLevel())), []);
  return level;
}

interface EmergencyBatteryDragHandlersProps {
  batteryInstalled: boolean;
  setBatteryDropTarget: (isTarget: boolean) => void;
}

/** Drag-and-drop handlers for the emergency battery module slot. */
export function createEmergencyBatteryDragHandlers({
  batteryInstalled,
  setBatteryDropTarget,
}: EmergencyBatteryDragHandlersProps) {
  function onBatteryDragStart(e: DragEvent) {
    if (!batteryInstalled) return;
    const payload: CargoDragPayload = {
      itemId: EMERGENCY_BATTERY_ITEM_ID,
      quantity: 1,
      from: BATTERY_SLOT_OWNER_REF,
    };
    writeCargoDragPayload(e.dataTransfer, payload);
  }

  function onBatteryDragOver(e: DragEvent) {
    if (!isCargoDragEvent(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setBatteryDropTarget(true);
  }

  function onBatteryDragLeave() {
    setBatteryDropTarget(false);
  }

  function onBatteryDrop(e: DragEvent) {
    setBatteryDropTarget(false);
    e.preventDefault();
    const payload = readCargoDragPayload(e.dataTransfer);
    if (!payload || payload.itemId !== EMERGENCY_BATTERY_ITEM_ID) return;
    // Don't accept drops from the battery slot itself
    if (payload.from.kind === 'vessel' && payload.from.vesselId === EMERGENCY_BATTERY_SLOT_OWNER)
      return;
    installBatteryFromCargo();
  }

  return { onBatteryDragStart, onBatteryDragOver, onBatteryDragLeave, onBatteryDrop };
}
