import { useState, type CSSProperties, type DragEvent } from 'react';
import { Package } from 'lucide-react';
import { cargo } from '../../../context/Inventory';
import { resolveInventoryItemId, getInventoryItemUi } from '../../../config/inventoryCatalog';
import {
  ITEM_ICONS,
  expandCargoToCells,
} from '../PowerHUD/Cargo/cargoHoldHelpers';
import { CARGO_HOLD_SLOT_COUNT } from '../PowerHUD/Cargo/cargoHoldConstants';
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
    const payload: TradeDragPayload = { itemId, source: 'shipCargo' };
    e.dataTransfer.setData(TRADE_DRAG_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
    setActiveDragSource('shipCargo');
  }

  function onDragEnd() {
    setActiveDragSource(null);
  }

  function onGridDragOver(e: DragEvent) {
    if (getActiveDragSource() !== 'youGive') return;
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
    try {
      const raw = e.dataTransfer.getData(TRADE_DRAG_MIME);
      if (!raw) return;
      const payload = JSON.parse(raw) as TradeDragPayload;
      if (payload.source !== 'youGive') return;
      tradeUnstagePlayer?.(payload.itemId);
    } catch { /* ignore */ }
  }

  return (
    <div className={`dock-cargo-summary${isDropTarget ? ' dock-cargo-summary--drop-target' : ''}`}>
      <div className="dock-cargo-summary__header">
        <span className="dock-station-panel__section-label">Ship Cargo</span>
        <span className="dock-cargo-summary__count">
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
