import { useState, type CSSProperties, type DragEvent } from 'react';
import { Package } from 'lucide-react';
import { getDock, getDockInventoryOwner } from '../../../context/DockablePartnerStore';
import { listInventorySlots, type InventoryOwnerRef } from '../../../context/InventoryStore';
import { getInventoryItemUi } from '../../../config/inventoryCatalog';
import {
  ITEM_ICONS,
  expandCargoToCells,
  slotsToCargoItems,
  transferCargoStack,
  writeCargoDragPayload,
  readCargoDragPayload,
  isCargoDragEvent,
  type CargoDragPayload,
} from '../PowerHUD/Cargo/cargoHoldHelpers';

const SUMMARY_COLS = 8;
const DEFAULT_SLOTS = 24;

interface DockCargoSummaryProps {
  partnerId: string;
  /** Number of grid slots to display. Defaults to 24. */
  slotCount?: number;
}

export default function DockCargoSummary({ partnerId, slotCount }: DockCargoSummaryProps) {
  const effectiveSlots = slotCount ?? DEFAULT_SLOTS;
  const [isDropTarget, setIsDropTarget] = useState(false);

  const dockOwner: InventoryOwnerRef = getDockInventoryOwner(partnerId);
  const slots = listInventorySlots(dockOwner);
  const items = slotsToCargoItems(slots);
  const cells = expandCargoToCells(items, effectiveSlots);
  const filledCount = cells.filter((c) => c.filled).length;
  const inventoryLabel = getDock(partnerId)?.inventory?.label ?? 'Salvage';

  function onDragStart(e: DragEvent, itemId: string, salvagedBy?: string) {
    const payload: CargoDragPayload = { itemId, quantity: 1, from: dockOwner, salvagedBy };
    writeCargoDragPayload(e.dataTransfer, payload);
  }

  function onGridDragOver(e: DragEvent) {
    if (!isCargoDragEvent(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDropTarget(true);
  }

  function onGridDragLeave() {
    setIsDropTarget(false);
  }

  function onGridDrop(e: DragEvent) {
    setIsDropTarget(false);
    e.preventDefault();
    const payload = readCargoDragPayload(e.dataTransfer);
    if (!payload) return;
    transferCargoStack(
      payload.from,
      dockOwner,
      payload.itemId,
      payload.quantity,
      payload.salvagedBy
    );
  }

  return (
    <div className={`dock-cargo-summary${isDropTarget ? ' dock-cargo-summary--drop-target' : ''}`}>
      <div className="dock-cargo-summary__header">
        <span className="hud-subtitle">{inventoryLabel}</span>
        <span className="resource-bar-val" style={{ width: 60 }}>
          {filledCount}/{effectiveSlots}
        </span>
      </div>
      <div
        className="dock-cargo-summary__grid"
        style={{ '--cargo-summary-cols': SUMMARY_COLS } as CSSProperties}
        onDragOver={onGridDragOver}
        onDragLeave={onGridDragLeave}
        onDrop={onGridDrop}
      >
        {cells.map((cell, i) => {
          if (!cell.filled) {
            return (
              <div
                key={`empty-${i}`}
                className="dock-cargo-summary__cell dock-cargo-summary__cell--empty"
              />
            );
          }
          const Icon = ITEM_ICONS[cell.itemId] ?? Package;
          const ui = getInventoryItemUi(cell.itemId);
          return (
            <div
              key={`${cell.itemId}-${i}`}
              className="dock-cargo-summary__cell dock-cargo-summary__cell--filled"
              title={`${cell.label} — drag to ship cargo`}
              draggable
              onDragStart={(e) => onDragStart(e, cell.itemId, cell.salvagedBy)}
            >
              <Icon size={10} strokeWidth={1.75} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
