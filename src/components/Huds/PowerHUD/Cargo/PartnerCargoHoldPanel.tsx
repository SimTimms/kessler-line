import { useEffect, useMemo, useState, type CSSProperties, type DragEvent } from 'react';
import {
  DOCK_TRANSFER_UI_CHANGED,
  getDockTransferUi,
} from '../../../../context/DockTransferUi';
import { getDockablePartnerLabel } from '../../../../context/DockablePartnerStore';
import {
  getInventory,
  INVENTORY_CHANGED,
  listInventorySlots,
  type InventoryOwnerRef,
} from '../../../../context/InventoryStore';
import { getInventoryItemUi } from '../../../../config/inventoryCatalog';
import { CARGO_HOLD_SLOT_COUNT } from './cargoHoldConstants';
import {
  expandCargoToCells,
  isCargoDragEvent,
  readCargoDragPayload,
  slotsToCargoItems,
  transferCargoStack,
  writeCargoDragPayload,
  type CargoDragPayload,
} from './cargoHoldHelpers';
import './CargoHoldPanel.css';

/**
 * Cargo hold for the currently docked partner (e.g. towable container).
 * Drag stacks between this panel and the ship {@link CargoHoldPanel}.
 */
export default function PartnerCargoHoldPanel() {
  const [dockUi, setDockUi] = useState(getDockTransferUi);
  const [open, setOpen] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [invTick, setInvTick] = useState(0);
  const [hovered, setHovered] = useState<{
    itemId: string;
    label: string;
    stackQuantity: number;
    tag: string;
  } | null>(null);

  useEffect(() => {
    const onUi = () => setDockUi(getDockTransferUi());
    const onInv = () => setInvTick((n) => n + 1);
    window.addEventListener(DOCK_TRANSFER_UI_CHANGED, onUi);
    window.addEventListener(INVENTORY_CHANGED, onInv);
    return () => {
      window.removeEventListener(DOCK_TRANSFER_UI_CHANGED, onUi);
      window.removeEventListener(INVENTORY_CHANGED, onInv);
    };
  }, []);

  const partnerId = dockUi.partnerId;
  const dockOwner: InventoryOwnerRef | null = partnerId
    ? { kind: 'dock', dockId: partnerId }
    : null;
  const dockInv = dockOwner ? getInventory(dockOwner) : undefined;
  // Towable crates always show (deposit/withdraw). Stations only if they have cargo slots.
  const showPanel =
    dockOwner != null &&
    dockInv != null &&
    (dockUi.towable || dockInv.slots.length > 0);

  const items = useMemo(() => {
    if (!partnerId || !showPanel) return [];
    return slotsToCargoItems(listInventorySlots({ kind: 'dock', dockId: partnerId }));
  }, [partnerId, showPanel, invTick]);

  const cells = useMemo(() => expandCargoToCells(items), [items]);
  const filledCount = cells.filter((c) => c.filled).length;

  if (!partnerId || !dockOwner || !showPanel) return null;

  const label = getDockablePartnerLabel(partnerId) || 'Container';

  function onDragStart(e: DragEvent, itemId: string, quantity: number) {
    const payload: CargoDragPayload = { itemId, quantity, from: dockOwner! };
    writeCargoDragPayload(e.dataTransfer, payload);
  }

  function onDragOver(e: DragEvent) {
    if (!isCargoDragEvent(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  }

  function onDrop(e: DragEvent) {
    setDragOver(false);
    e.preventDefault();
    const payload = readCargoDragPayload(e.dataTransfer);
    if (!payload) return;
    transferCargoStack(payload.from, dockOwner!, payload.itemId, payload.quantity);
  }

  return (
    <div
      className={`cargo-hold-panel cargo-hold-panel--partner ${dragOver ? 'cargo-hold-panel--drop-target' : ''}`}
      aria-label={`${label} cargo hold`}
      onDragOver={onDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div className="cargo-hold-panel__header">
        <span className="cargo-hold-panel__title">{label}</span>
        <span className="cargo-hold-panel__count">
          {filledCount}/{CARGO_HOLD_SLOT_COUNT}
        </span>
        <button
          type="button"
          className="cargo-hold-panel__toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? 'CLOSE' : 'OPEN'}
        </button>
      </div>

      <p className="cargo-hold-panel__hint">Container inventory — drag to ship cargo</p>

      {open ? (
        <>
          <div className="cargo-hold-panel__grid" role="list">
            {cells.map((cell, index) => {
              if (!cell.filled) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="cargo-hold-panel__cell cargo-hold-panel__cell--empty"
                    role="listitem"
                    onMouseEnter={() => setHovered(null)}
                  />
                );
              }
              const { Icon, color, label: itemLabel, itemId, stackQuantity } = cell;
              const ui = getInventoryItemUi(itemId);
              return (
                <button
                  key={`${itemId}-${index}`}
                  type="button"
                  role="listitem"
                  className="cargo-hold-panel__cell cargo-hold-panel__cell--filled"
                  style={{ '--cargo-color': color } as CSSProperties}
                  draggable
                  onDragStart={(e) => onDragStart(e, itemId, 1)}
                  onMouseEnter={() =>
                    setHovered({
                      itemId,
                      label: itemLabel,
                      stackQuantity,
                      tag: ui.tag,
                    })
                  }
                  onMouseLeave={() => setHovered(null)}
                  aria-label={itemLabel}
                  title={`Drag to transfer 1× ${itemLabel}`}
                >
                  <Icon size={11} strokeWidth={1.75} />
                </button>
              );
            })}
          </div>
          <div className="cargo-hold-panel__divider" aria-hidden />
          <div className="cargo-hold-panel__detail" aria-live="polite">
            {hovered ? (
              <>
                <span className="cargo-hold-panel__detail-tag">{hovered.tag}</span>
                <span className="cargo-hold-panel__detail-name">{hovered.label}</span>
                <span className="cargo-hold-panel__detail-qty">{hovered.stackQuantity} stored</span>
              </>
            ) : (
              <span className="cargo-hold-panel__detail-idle">Drag a stack</span>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
