import { useEffect, useState, type DragEvent } from 'react';
import {
  getCO2FilterLevel,
  getSpareFilterCount,
  getNoFilterElapsed,
  subscribeCO2Filter,
  installFilterFromCargo,
} from '../../../../context/CO2FilterStore';
import { CO2_FILTER_ITEM_ID } from '../../../../config/damageConfig';
import {
  isCargoDragEvent,
  readCargoDragPayload,
  writeCargoDragPayload,
  type CargoDragPayload,
} from '../../PowerHUD/Cargo/cargoHoldHelpers';
import { CO2_FILTER_SLOT_OWNER } from '../../PowerHUD/Cargo/CargoHoldPanel';
import type { InventoryOwnerRef } from '../../../../context/InventoryStore';

export const CO2_SLOT_OWNER_REF: InventoryOwnerRef = {
  kind: 'vessel',
  vesselId: CO2_FILTER_SLOT_OWNER,
};

/** Live CO2 scrubber level, spare count and time spent without a filter. */
export function useCO2Filter() {
  const [level, setLevel] = useState(() => getCO2FilterLevel());
  const [spares, setSpares] = useState(() => getSpareFilterCount());
  const [elapsed, setElapsed] = useState(() => getNoFilterElapsed());
  useEffect(
    () =>
      subscribeCO2Filter(() => {
        setLevel(getCO2FilterLevel());
        setSpares(getSpareFilterCount());
        setElapsed(getNoFilterElapsed());
      }),
    []
  );
  return { co2Level: level, co2Spares: spares, noFilterElapsed: elapsed };
}

interface CO2FilterDragHandlersProps {
  filterInstalled: boolean;
  setCo2DropTarget: (isTarget: boolean) => void;
}

/** Drag-and-drop handlers for the CO2 filter module slot. */
export function createCO2FilterDragHandlers({
  filterInstalled,
  setCo2DropTarget,
}: CO2FilterDragHandlersProps) {
  function onCO2DragStart(e: DragEvent) {
    if (!filterInstalled) return;
    const payload: CargoDragPayload = {
      itemId: CO2_FILTER_ITEM_ID,
      quantity: 1,
      from: CO2_SLOT_OWNER_REF,
    };
    writeCargoDragPayload(e.dataTransfer, payload);
  }

  function onCO2DragOver(e: DragEvent) {
    if (!isCargoDragEvent(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setCo2DropTarget(true);
  }

  function onCO2DragLeave() {
    setCo2DropTarget(false);
  }

  function onCO2Drop(e: DragEvent) {
    setCo2DropTarget(false);
    e.preventDefault();
    const payload = readCargoDragPayload(e.dataTransfer);
    if (!payload || payload.itemId !== CO2_FILTER_ITEM_ID) return;
    // Don't accept drops from the CO2 slot itself (would be a no-op)
    if (payload.from.kind === 'vessel' && payload.from.vesselId === CO2_FILTER_SLOT_OWNER) return;
    installFilterFromCargo();
  }

  return { onCO2DragStart, onCO2DragOver, onCO2DragLeave, onCO2Drop };
}
