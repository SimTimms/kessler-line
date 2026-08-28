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
import { CO2_FILTER_ITEM_ID, HULL_REPAIR_PATCH_ITEM_ID } from '../../../../config/damageConfig';
import { removeInstalledFilter } from '../../../../context/CO2FilterStore';
import {
  expandCargoToCells,
  isCargoDragEvent,
  readCargoDragPayload,
  transferCargoStack,
  writeCargoDragPayload,
  type CargoDragPayload,
} from './cargoHoldHelpers';
import './CargoHoldPanel.css';

/** Sentinel vesselId used when dragging a filter out of the CO2 slot. */
export const CO2_FILTER_SLOT_OWNER = '__co2-filter-slot__';

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
    provenanceLabel?: string;
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

  function onDragStart(e: DragEvent, itemId: string, quantity: number, salvagedBy?: string) {
    if (!transferEnabled && itemId !== CO2_FILTER_ITEM_ID && itemId !== HULL_REPAIR_PATCH_ITEM_ID) return;
    const payload: CargoDragPayload = { itemId, quantity, from: PLAYER_OWNER, salvagedBy };
    writeCargoDragPayload(e.dataTransfer, payload);
  }

  function onDragOver(e: DragEvent) {
    if (!isCargoDragEvent(e.dataTransfer)) return;
    // Accept normal transfers when docked, and always accept CO2 filter slot returns
    if (!transferEnabled) {
      // Peek: we can't read payload on dragOver in all browsers, so we allow
      // the drop and validate in onDrop instead.
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  }

  function onDragLeave() {
    setDragOver(false);
  }

  function onDrop(e: DragEvent) {
    setDragOver(false);
    e.preventDefault();
    const payload = readCargoDragPayload(e.dataTransfer);
    if (!payload) return;

    // Accept drops from the CO2 filter slot sentinel
    const fromCO2Slot =
      payload.from.kind === 'vessel' &&
      payload.from.vesselId === CO2_FILTER_SLOT_OWNER;

    if (fromCO2Slot && payload.itemId === CO2_FILTER_ITEM_ID) {
      removeInstalledFilter();
      return;
    }

    if (!transferEnabled) return;
    transferCargoStack(
      payload.from,
      PLAYER_OWNER,
      payload.itemId,
      payload.quantity,
      payload.salvagedBy
    );
  }

  return (
    <div
      className={`cargo-hold-panel mech-cargo ${dragOver ? 'cargo-hold-panel--drop-target' : ''} ${className}`.trim()}
      aria-label="Cargo hold"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="mech-cargo-bezel">
        <div className="mech-cargo-head">
          <span className="mech-cargo-lamp" aria-hidden />
          <span className="mech-cargo-title">CARGO</span>
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
            title={open ? 'Close cargo hold' : 'Open cargo hold'}
          >
            <span className="mech-cargo-toggle-face" aria-hidden>
              {open ? '−' : '+'}
            </span>
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
                const { Icon, color, label, itemId, stackQuantity, salvagedBy, provenanceLabel } =
                  cell;
                const ui = getInventoryItemUi(itemId);
                return (
                  <button
                    key={`${itemId}-${salvagedBy ?? 'plain'}-${index}`}
                    type="button"
                    role="listitem"
                    className="cargo-hold-panel__cell cargo-hold-panel__cell--filled"
                    style={{ '--cargo-color': color } as CSSProperties}
                    draggable={transferEnabled || itemId === CO2_FILTER_ITEM_ID || itemId === HULL_REPAIR_PATCH_ITEM_ID}
                    onDragStart={(e) => onDragStart(e, itemId, 1, salvagedBy)}
                    onMouseEnter={() =>
                      setHovered({
                        itemId,
                        label,
                        stackQuantity,
                        tag: ui.tag,
                        provenanceLabel,
                      })
                    }
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => {
                      if (!onEjectItem) return;
                      onEjectItem({
                        name: itemId,
                        quantity: stackQuantity,
                        salvagedBy,
                      });
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
                  <span className="cargo-hold-panel__detail-qty">
                    {hovered.stackQuantity} aboard
                  </span>
                  {hovered.provenanceLabel ? (
                    <span className="cargo-hold-panel__detail-qty">{hovered.provenanceLabel}</span>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
