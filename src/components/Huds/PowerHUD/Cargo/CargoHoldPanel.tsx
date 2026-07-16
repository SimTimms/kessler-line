import { useEffect, useMemo, useState, type CSSProperties, type DragEvent } from 'react';
import type { CargoItem } from '../../../../context/Inventory';
import {
  DOCK_TRANSFER_UI_CHANGED,
  getDockTransferUi,
  openDockTransferPanel,
} from '../../../../context/DockTransferUi';
import { getInventoryItemUi } from '../../../../config/inventoryCatalog';
import type { InventoryOwnerRef } from '../../../../context/InventoryStore';
import { PLAYER_VESSEL_ID } from '../../../../context/PlayerShipState';
import { CARGO_HOLD_SLOT_COUNT } from './cargoHoldConstants';
import {
  expandCargoToCells,
  isCargoDragEvent,
  readCargoDragPayload,
  transferCargoStack,
  writeCargoDragPayload,
  type CargoDragPayload,
} from './cargoHoldHelpers';
import './CargoHoldPanel.css';

export { CARGO_HOLD_SLOT_COUNT };

const PLAYER_OWNER: InventoryOwnerRef = { kind: 'vessel', vesselId: PLAYER_VESSEL_ID };

interface CargoHoldPanelProps {
  items: CargoItem[];
  /** Click a filled cell to begin eject flow for that stack. */
  onEjectItem?: (item: CargoItem) => void;
  className?: string;
  /** Start expanded. */
  defaultOpen?: boolean;
  /**
   * When true (docked with a transfer partner), cells can be dragged and this
   * hold accepts drops from the partner cargo panel.
   */
  transferEnabled?: boolean;
}

export default function CargoHoldPanel({
  items,
  onEjectItem,
  className = '',
  defaultOpen = true,
  transferEnabled = false,
}: CargoHoldPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [dockTransferUi, setDockTransferUi] = useState(getDockTransferUi);
  const [dragOver, setDragOver] = useState(false);
  const [hovered, setHovered] = useState<{
    itemId: string;
    label: string;
    stackQuantity: number;
    tag: string;
  } | null>(null);

  useEffect(() => {
    const onUi = () => setDockTransferUi(getDockTransferUi());
    window.addEventListener(DOCK_TRANSFER_UI_CHANGED, onUi);
    return () => window.removeEventListener(DOCK_TRANSFER_UI_CHANGED, onUi);
  }, []);

  const cells = useMemo(() => expandCargoToCells(items), [items]);
  const filledCount = cells.filter((c) => c.filled).length;
  const showOpenTransfer =
    dockTransferUi.partnerId != null && dockTransferUi.towable && !dockTransferUi.panelOpen;

  function onDragStart(e: DragEvent, itemId: string, quantity: number) {
    if (!transferEnabled) return;
    const payload: CargoDragPayload = { itemId, quantity, from: PLAYER_OWNER };
    writeCargoDragPayload(e.dataTransfer, payload);
  }

  function onDragOver(e: DragEvent) {
    if (!transferEnabled || !isCargoDragEvent(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  }

  function onDragLeave() {
    setDragOver(false);
  }

  function onDrop(e: DragEvent) {
    setDragOver(false);
    if (!transferEnabled) return;
    e.preventDefault();
    const payload = readCargoDragPayload(e.dataTransfer);
    if (!payload) return;
    transferCargoStack(payload.from, PLAYER_OWNER, payload.itemId, payload.quantity);
  }

  return (
    <div
      className={`cargo-hold-panel ${dragOver ? 'cargo-hold-panel--drop-target' : ''} ${className}`.trim()}
      aria-label="Cargo hold"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="cargo-hold-panel__header">
        <span className="cargo-hold-panel__title">Cargo</span>
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

      {showOpenTransfer ? (
        <button
          type="button"
          className="cargo-hold-panel__transfer-btn"
          onClick={() => openDockTransferPanel()}
          title="Open resource transfer with docked partner"
        >
          Open Resource Transfer
        </button>
      ) : null}

      {transferEnabled && open ? (
        <p className="cargo-hold-panel__hint">Drag stacks to / from container</p>
      ) : null}

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
              const { Icon, color, label, itemId, stackQuantity } = cell;
              const ui = getInventoryItemUi(itemId);
              return (
                <button
                  key={`${itemId}-${index}`}
                  type="button"
                  role="listitem"
                  className="cargo-hold-panel__cell cargo-hold-panel__cell--filled"
                  style={{ '--cargo-color': color } as CSSProperties}
                  draggable={transferEnabled}
                  onDragStart={(e) => onDragStart(e, itemId, 1)}
                  onMouseEnter={() =>
                    setHovered({
                      itemId,
                      label,
                      stackQuantity,
                      tag: ui.tag,
                    })
                  }
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => {
                    if (!onEjectItem) return;
                    onEjectItem({ name: itemId, quantity: stackQuantity });
                  }}
                  aria-label={label}
                  title={transferEnabled ? `Drag to transfer 1× ${label}` : label}
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
                <span className="cargo-hold-panel__detail-qty">{hovered.stackQuantity} aboard</span>
              </>
            ) : (
              <span className="cargo-hold-panel__detail-idle">
                {transferEnabled ? 'Drag a stack' : 'Hover a cell'}
              </span>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
