import { useEffect, useState, type DragEvent } from 'react';
import {
  getInstalledBufferId,
  subscribeCommsBuffer,
  installBufferFromCargo,
} from '../../../../context/CommsBufferStore';
import { COMMS_BUFFER_ITEM_ID } from '../../../../config/damageConfig';
import {
  isCargoDragEvent,
  readCargoDragPayload,
  writeCargoDragPayload,
  type CargoDragPayload,
} from '../../PowerHUD/Cargo/cargoHoldHelpers';
import { COMMS_BUFFER_SLOT_OWNER } from '../../PowerHUD/Cargo/CargoHoldPanel';
import type { InventoryOwnerRef } from '../../../../context/InventoryStore';

export const COMMS_BUFFER_SLOT_OWNER_REF: InventoryOwnerRef = {
  kind: 'vessel',
  vesselId: COMMS_BUFFER_SLOT_OWNER,
};

/** Id of the currently installed comms buffer, or null when the slot is empty. */
export function useCommsBuffer() {
  const [bufferId, setBufferId] = useState(() => getInstalledBufferId());
  useEffect(() => subscribeCommsBuffer(() => setBufferId(getInstalledBufferId())), []);
  return bufferId;
}

interface CommsBufferDragHandlersProps {
  commsInstalled: boolean;
  commsBufferId: string | null;
  setCommsDropTarget: (isTarget: boolean) => void;
}

/** Drag-and-drop handlers for the comms buffer module slot. */
export function createCommsBufferDragHandlers({
  commsInstalled,
  commsBufferId,
  setCommsDropTarget,
}: CommsBufferDragHandlersProps) {
  function onCommsDragStart(e: DragEvent) {
    if (!commsInstalled) return;
    const payload: CargoDragPayload = {
      itemId: COMMS_BUFFER_ITEM_ID,
      quantity: 1,
      from: COMMS_BUFFER_SLOT_OWNER_REF,
      salvagedBy: commsBufferId,
    };
    writeCargoDragPayload(e.dataTransfer, payload);
  }

  function onCommsDragOver(e: DragEvent) {
    if (!isCargoDragEvent(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setCommsDropTarget(true);
  }

  function onCommsDragLeave() {
    setCommsDropTarget(false);
  }

  function onCommsDrop(e: DragEvent) {
    setCommsDropTarget(false);
    e.preventDefault();
    const payload = readCargoDragPayload(e.dataTransfer);
    if (!payload || payload.itemId !== COMMS_BUFFER_ITEM_ID) return;
    // Don't accept drops from the comms buffer slot itself
    if (payload.from.kind === 'vessel' && payload.from.vesselId === COMMS_BUFFER_SLOT_OWNER) return;
    if (!payload.salvagedBy) return;
    installBufferFromCargo(payload.salvagedBy);
  }

  return { onCommsDragStart, onCommsDragOver, onCommsDragLeave, onCommsDrop };
}
