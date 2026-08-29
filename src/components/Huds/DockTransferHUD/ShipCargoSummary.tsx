import { useState, type CSSProperties, type DragEvent } from 'react';
import { Package } from 'lucide-react';
import { cargo } from '../../../context/Inventory';
import { resolveInventoryItemId, getInventoryItemUi } from '../../../config/inventoryCatalog';
import {
  ITEM_ICONS,
  expandCargoToCells,
  writeCargoDragPayload,
  readCargoDragPayload,
  isCargoDragEvent,
  transferCargoStack,
  type CargoDragPayload,
} from '../PowerHUD/Cargo/cargoHoldHelpers';
import { CARGO_HOLD_SLOT_COUNT } from '../PowerHUD/Cargo/cargoHoldConstants';
import { PLAYER_VESSEL_ID } from '../../../context/PlayerShipState';
import type { InventoryOwnerRef } from '../../../context/InventoryStore';
import {
  TRADE_DRAG_MIME,
  setActiveDragSource,
  getActiveDragSource,
  activePlayerStaged,
  tradeUnstagePlayer,
  type TradeDragPayload,
} from '../../CommsChat/TradeCargoGrid';

const SUMMARY_COLS = 8;
const SUMMARY_SLOTS = 24;
const playerOwner: InventoryOwnerRef = { kind: 'vessel', vesselId: PLAYER_VESSEL_ID };

export default function ShipCargoSummary() {
  const [isDropTarget, setIsDropTarget] = useState(false);

  // Subtract items that have been staged into YOU GIVE.
  // No useMemo — parent re-renders every frame via RAF, and
  // activePlayerStaged is a module-level ref React can't track.
  const adjustedCargo = cargo.map((item) => {
    const itemId = resolveInventoryItemId(item.name);
    const staged = activePlayerStaged[itemId] ?? 0;
    return { ...item, quantity: Math.max(0, item.quantity - staged) };
  });

  const cells = expandCargoToCells(adjustedCargo, SUMMARY_SLOTS);
  const filledCount = cells.filter((c) => c.filled).length;

  function onDragStart(e: DragEvent, itemId: string) {
    // Trade drag (comms trade UI)
    const payload: TradeDragPayload = { itemId, source: 'shipCargo' };
    e.dataTransfer.setData(TRADE_DRAG_MIME, JSON.stringify(payload));
    setActiveDragSource('shipCargo');
    // Cargo drag (salvage / partner cargo panels)
    const cargoPayload: CargoDragPayload = { itemId, quantity: 1, from: playerOwner };
    writeCargoDragPayload(e.dataTransfer, cargoPayload);
  }

  function onDragEnd() {
    setActiveDragSource(null);
  }

  function onGridDragOver(e: DragEvent) {
    // Accept trade drags (youGive) or cargo drags (salvage panel)
    if (getActiveDragSource() === 'youGive' || isCargoDragEvent(e.dataTransfer)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setIsDropTarget(true);
    }
  }

  function onGridDragLeave() {
    setIsDropTarget(false);
  }

  function onGridDrop(e: DragEvent) {
    setIsDropTarget(false);
    e.preventDefault();

    // Try cargo drag first (salvage / partner panels)
    const cargoDrop = readCargoDragPayload(e.dataTransfer);
    if (cargoDrop && cargoDrop.from.kind !== 'vessel') {
      transferCargoStack(
        cargoDrop.from,
        playerOwner,
        cargoDrop.itemId,
        cargoDrop.quantity,
        cargoDrop.salvagedBy
      );
      return;
    }

    // Fall back to trade drag (youGive unstage)
    try {
      const raw = e.dataTransfer.getData(TRADE_DRAG_MIME);
      if (!raw) return;
      const payload = JSON.parse(raw) as TradeDragPayload;
      if (payload.source !== 'youGive') return;
      tradeUnstagePlayer?.(payload.itemId);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={`dock-cargo-summary${isDropTarget ? ' dock-cargo-summary--drop-target' : ''}`}>
      <div className="dock-cargo-summary__header">
        <span className="hud-subtitle">Ship Cargo</span>
        <span className="resource-bar-val" style={{ width: 60 }}>
          {filledCount}/{CARGO_HOLD_SLOT_COUNT}
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
              style={{ '--cargo-color': ui.color } as CSSProperties}
              title={`${cell.label} — drag to YOU GIVE`}
              draggable
              onDragStart={(e) => onDragStart(e, cell.itemId)}
              onDragEnd={onDragEnd}
            >
              <Icon size={10} strokeWidth={1.75} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
