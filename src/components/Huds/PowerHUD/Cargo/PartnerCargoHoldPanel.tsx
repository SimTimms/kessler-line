import { useEffect, useMemo, useState, type CSSProperties, type DragEvent } from 'react';
import {
  DOCK_TRANSFER_UI_CHANGED,
  getDockTransferUi,
} from '../../../../context/DockTransferUi';
import {
  getDockablePartnerLabel,
  getDockInventoryOwner,
} from '../../../../context/DockablePartnerStore';
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
    provenanceLabel?: string;
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
    ? getDockInventoryOwner(partnerId)
    : null;
  const dockInv = dockOwner ? getInventory(dockOwner) : undefined;
  // Towable crates always show (deposit/withdraw). Stations only if they have cargo slots.
  const showPanel =
    dockOwner != null &&
    dockInv != null &&
    (dockUi.towable || dockInv.slots.length > 0);

  const items = useMemo(() => {
    if (!dockOwner || !showPanel) return [];
    return slotsToCargoItems(listInventorySlots(dockOwner));
  }, [dockOwner, showPanel, invTick]);

  const cells = useMemo(() => expandCargoToCells(items), [items]);
  const filledCount = cells.filter((c) => c.filled).length;

  if (!partnerId || !dockOwner || !showPanel) return null;

  const label = getDockablePartnerLabel(partnerId) || 'Container';
  const titleAbbrev = label.length > 8 ? `${label.slice(0, 7)}.` : label;

  function onDragStart(
    e: DragEvent,
    itemId: string,
    quantity: number,
    salvagedBy?: string
  ) {
    const payload: CargoDragPayload = { itemId, quantity, from: dockOwner!, salvagedBy };
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
    transferCargoStack(
      payload.from,
      dockOwner!,
      payload.itemId,
      payload.quantity,
      payload.salvagedBy
    );
  }

  return (
    <div
      className={`cargo-hold-panel mech-cargo mech-cargo--partner ${dragOver ? 'cargo-hold-panel--drop-target' : ''}`}
      aria-label={`${label} cargo hold`}
      onDragOver={onDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div className="mech-cargo-bezel">
        <div className="mech-cargo-head">
          <span className="mech-cargo-lamp" aria-hidden />
          <span className="mech-cargo-title" title={label}>
            {titleAbbrev}
          </span>
          <span className="mech-cargo-sub">HOLD</span>
          <span className="mech-cargo-count-screen" title="Hold capacity">
            <span className="mech-cargo-count">
              {filledCount}/{CARGO_HOLD_SLOT_COUNT}
            </span>
          </span>
          <button
            type="button"
            className={`mech-cargo-toggle${open ? ' mech-cargo-toggle--open' : ''}`}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            title={open ? 'Close hold' : 'Open hold'}
          >
            <span className="mech-cargo-toggle-face" aria-hidden>
              {open ? '−' : '+'}
            </span>
          </button>
        </div>

        <p className="cargo-hold-panel__hint">Container inventory — drag to ship cargo</p>

        {open ? (
          <div className="mech-cargo-crt">
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
                const {
                  Icon,
                  color,
                  label: itemLabel,
                  itemId,
                  stackQuantity,
                  salvagedBy,
                  provenanceLabel,
                } = cell;
                const ui = getInventoryItemUi(itemId);
                return (
                  <button
                    key={`${itemId}-${salvagedBy ?? 'plain'}-${index}`}
                    type="button"
                    role="listitem"
                    className="cargo-hold-panel__cell cargo-hold-panel__cell--filled"
                    style={{ '--cargo-color': color } as CSSProperties}
                    draggable
                    onDragStart={(e) => onDragStart(e, itemId, 1, salvagedBy)}
                    onMouseEnter={() =>
                      setHovered({
                        itemId,
                        label: itemLabel,
                        stackQuantity,
                        tag: ui.tag,
                        provenanceLabel,
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
                  {hovered.provenanceLabel ? (
                    <span className="cargo-hold-panel__detail-qty">{hovered.provenanceLabel}</span>
                  ) : null}
                </>
              ) : (
                <span className="cargo-hold-panel__detail-idle">Drag a stack</span>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
