import { useState, useCallback, useEffect, type DragEvent, type CSSProperties } from 'react';
import { Package } from 'lucide-react';
import { ITEM_ICONS } from '../Huds/PowerHUD/Cargo/cargoHoldHelpers';
import { getInventoryItemDef, getInventoryItemUi } from '../../config/inventoryCatalog';
import type { CargoBarterRow, CargoBarterDealDraft } from './DialogueThread';
import './TradeCargoGrid.css';

/* ── Shared drag constants (also used by ShipCargoSummary) ───────────── */

export const TRADE_DRAG_MIME = 'application/x-crubbs-trade';

export type TradeDragSource = 'shipCargo' | 'contactCargo' | 'youGive' | 'theyGive';

export interface TradeDragPayload {
  itemId: string;
  source: TradeDragSource;
}

/**
 * Module-level drag source so dragover handlers can validate without
 * reading DataTransfer (which browsers block during dragover).
 */
let activeDragSource: TradeDragSource | null = null;

export function setActiveDragSource(source: TradeDragSource | null) {
  activeDragSource = source;
}

export function getActiveDragSource(): TradeDragSource | null {
  return activeDragSource;
}

/**
 * Current player-staged amounts, readable by ShipCargoSummary so it can
 * hide cells that have been moved into YOU GIVE.
 */
export let activePlayerStaged: Record<string, number> = {};

/**
 * Module-level callback for unstaging a player item from YOU GIVE.
 * Set by TradeCargoGrid on each render so ShipCargoSummary can call it
 * when receiving a drop from YOU GIVE.
 */
export let tradeUnstagePlayer: ((itemId: string) => void) | null = null;

/* ── Helpers ─────────────────────────────────────────────────────────── */

function writeTradeDrag(dt: DataTransfer, payload: TradeDragPayload) {
  dt.setData(TRADE_DRAG_MIME, JSON.stringify(payload));
  dt.effectAllowed = 'move';
}

function readTradeDrag(dt: DataTransfer): TradeDragPayload | null {
  try {
    const raw = dt.getData(TRADE_DRAG_MIME);
    if (!raw) return null;
    return JSON.parse(raw) as TradeDragPayload;
  } catch {
    return null;
  }
}

function isTradeDrag(dt: DataTransfer): boolean {
  return [...dt.types].includes(TRADE_DRAG_MIME);
}

/* ── Cell type shared by contact cargo + deal zones ──────────────────── */

interface GridCell {
  itemId: string;
  label: string;
  color: string;
}

function expandCells(rows: CargoBarterRow[], subtract: Record<string, number>): GridCell[] {
  const cells: GridCell[] = [];
  for (const row of rows) {
    const ui = getInventoryItemUi(row.itemId);
    const def = getInventoryItemDef(row.itemId);
    const label = def?.label ?? row.label;
    const count = Math.max(0, row.max - (subtract[row.itemId] ?? 0));
    for (let i = 0; i < count; i++) {
      cells.push({ itemId: row.itemId, label, color: ui.color });
    }
  }
  return cells;
}

function expandStagedCells(amounts: Record<string, number>, rows: CargoBarterRow[]): GridCell[] {
  const cells: GridCell[] = [];
  for (const [itemId, qty] of Object.entries(amounts)) {
    if (qty <= 0) continue;
    const ui = getInventoryItemUi(itemId);
    const def = getInventoryItemDef(itemId);
    const row = rows.find((r) => r.itemId === itemId);
    const label = def?.label ?? row?.label ?? itemId;
    for (let i = 0; i < qty; i++) {
      cells.push({ itemId, label, color: ui.color });
    }
  }
  return cells;
}

/* ── Props ───────────────────────────────────────────────────────────── */

interface TradeCargoGridProps {
  playerRows: CargoBarterRow[];
  contactRows: CargoBarterRow[];
  cargoDeal?: CargoBarterDealDraft;
  onCargoOfferChange?: (
    side: 'playerGives' | 'contactGives',
    itemId: string,
    value: number
  ) => void;
}

/* ── Component ───────────────────────────────────────────────────────── */

const GRID_COLS = 8;

export default function TradeCargoGrid({
  playerRows,
  contactRows,
  cargoDeal,
  onCargoOfferChange,
}: TradeCargoGridProps) {
  const [dropZone, setDropZone] = useState<'youGive' | 'theyGive' | 'contactCargo' | null>(null);

  const playerStaged = cargoDeal?.playerGives ?? {};
  const contactStaged = cargoDeal?.contactGives ?? {};

  // Publish player staged amounts so ShipCargoSummary can subtract them.
  activePlayerStaged = playerStaged;

  // Publish unstage callback so ShipCargoSummary can handle drops from YOU GIVE.
  tradeUnstagePlayer = (itemId: string) => {
    if (!onCargoOfferChange) return;
    const current = playerStaged[itemId] ?? 0;
    if (current > 0) onCargoOfferChange('playerGives', itemId, current - 1);
  };

  useEffect(() => {
    return () => {
      activePlayerStaged = {};
      tradeUnstagePlayer = null;
    };
  }, []);

  // Contact cargo cells minus what's been staged into THEY GIVE.
  const contactCells = expandCells(contactRows, contactStaged);
  const contactPadTo = Math.max(GRID_COLS, Math.ceil(contactCells.length / GRID_COLS) * GRID_COLS);

  // Deal zone cells — individual squares per staged unit.
  const youGiveCells = expandStagedCells(playerStaged, playerRows);
  const theyGiveCells = expandStagedCells(contactStaged, contactRows);

  /* ── Contact cell drag ────────────────────────────────────────────── */

  const onContactDragStart = useCallback((e: DragEvent, itemId: string) => {
    writeTradeDrag(e.dataTransfer, { itemId, source: 'contactCargo' });
    activeDragSource = 'contactCargo';
  }, []);

  /* ── Staged cell drag (return to source) ──────────────────────────── */

  const onYouGiveDragStart = useCallback((e: DragEvent, itemId: string) => {
    writeTradeDrag(e.dataTransfer, { itemId, source: 'youGive' });
    activeDragSource = 'youGive';
  }, []);

  const onTheyGiveDragStart = useCallback((e: DragEvent, itemId: string) => {
    writeTradeDrag(e.dataTransfer, { itemId, source: 'theyGive' });
    activeDragSource = 'theyGive';
  }, []);

  const onCellDragEnd = useCallback(() => {
    activeDragSource = null;
  }, []);

  /* ── Drop zone handlers ───────────────────────────────────────────── */

  const handleDragOver = useCallback(
    (zone: 'youGive' | 'theyGive' | 'contactCargo') => (e: DragEvent) => {
      if (!isTradeDrag(e.dataTransfer)) return;
      // Only allow the correct source for each zone.
      if (zone === 'youGive' && activeDragSource !== 'shipCargo') return;
      if (zone === 'theyGive' && activeDragSource !== 'contactCargo') return;
      if (zone === 'contactCargo' && activeDragSource !== 'theyGive') return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDropZone(zone);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDropZone(null);
  }, []);

  const handleDrop = useCallback(
    (zone: 'youGive' | 'theyGive' | 'contactCargo') => (e: DragEvent) => {
      setDropZone(null);
      e.preventDefault();
      const payload = readTradeDrag(e.dataTransfer);
      if (!payload || !onCargoOfferChange) return;

      if (zone === 'youGive' && payload.source === 'shipCargo') {
        // Ship Cargo → YOU GIVE: stage one more unit.
        const current = playerStaged[payload.itemId] ?? 0;
        const row = playerRows.find((r) => r.itemId === payload.itemId);
        if (row && current < row.max) {
          onCargoOfferChange('playerGives', payload.itemId, current + 1);
        }
      } else if (zone === 'theyGive' && payload.source === 'contactCargo') {
        // Contact Cargo → THEY GIVE: stage one more unit.
        const current = contactStaged[payload.itemId] ?? 0;
        const row = contactRows.find((r) => r.itemId === payload.itemId);
        if (row && current < row.max) {
          onCargoOfferChange('contactGives', payload.itemId, current + 1);
        }
      } else if (zone === 'contactCargo' && payload.source === 'theyGive') {
        // THEY GIVE → Contact Cargo: unstage one unit.
        const current = contactStaged[payload.itemId] ?? 0;
        if (current > 0) {
          onCargoOfferChange('contactGives', payload.itemId, current - 1);
        }
      }
    },
    [onCargoOfferChange, playerStaged, contactStaged, playerRows, contactRows]
  );

  /* ── Unstage (click a staged cell) ────────────────────────────────── */

  const unstagePlayer = useCallback(
    (itemId: string) => {
      if (!onCargoOfferChange) return;
      const current = playerStaged[itemId] ?? 0;
      if (current > 0) onCargoOfferChange('playerGives', itemId, current - 1);
    },
    [onCargoOfferChange, playerStaged]
  );

  const unstageContact = useCallback(
    (itemId: string) => {
      if (!onCargoOfferChange) return;
      const current = contactStaged[itemId] ?? 0;
      if (current > 0) onCargoOfferChange('contactGives', itemId, current - 1);
    },
    [onCargoOfferChange, contactStaged]
  );

  const gridStyle = { '--trade-grid-cols': GRID_COLS } as CSSProperties;

  return (
    <div className="trade-cargo-root">
      {/* ── Contact inventory grid (hidden when all items are staged) ── */}
      {contactCells.length > 0 && (
        <div
          className={`trade-cargo-hold-section${dropZone === 'contactCargo' ? ' trade-cargo-hold-section--drop-target' : ''}`}
          onDragOver={handleDragOver('contactCargo')}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop('contactCargo')}
        >
          <div className="trade-cargo-hold-section__header">
            <span className="trade-cargo-section-label">Contact Cargo</span>
            <span className="trade-cargo-section-count">{contactCells.length}</span>
          </div>
          <div className="trade-cargo-cell-grid" style={gridStyle}>
            {contactCells.map((cell, i) => {
              const Icon = ITEM_ICONS[cell.itemId] ?? Package;
              return (
                <div
                  key={`cc-${cell.itemId}-${i}`}
                  className="trade-cargo-cell"
                  style={{ '--cargo-color': cell.color } as CSSProperties}
                  title={`${cell.label} — drag to THEY GIVE`}
                  draggable
                  onDragStart={(e) => onContactDragStart(e, cell.itemId)}
                  onDragEnd={onCellDragEnd}
                >
                  <Icon size={10} strokeWidth={1.75} />
                </div>
              );
            })}
            {Array.from({ length: contactPadTo - contactCells.length }, (_, i) => (
              <div key={`pad-${i}`} className="trade-cargo-cell trade-cargo-cell--empty" />
            ))}
          </div>
        </div>
      )}

      {/* ── Deal staging zones ────────────────────────────────────────── */}
      <div className="trade-cargo-deal">
        {/* YOU GIVE */}
        <div
          className={`trade-cargo-deal__zone${dropZone === 'youGive' ? ' trade-cargo-deal__zone--drop-target' : ''}`}
          onDragOver={handleDragOver('youGive')}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop('youGive')}
        >
          <div className="trade-cargo-deal__zone-title">YOU GIVE</div>
          {youGiveCells.length === 0 ? (
            <div className="trade-cargo-deal__empty"></div>
          ) : (
            <div className="trade-cargo-cell-grid trade-cargo-cell-grid--deal" style={gridStyle}>
              {youGiveCells.map((cell, i) => {
                const Icon = ITEM_ICONS[cell.itemId] ?? Package;
                return (
                  <div
                    key={`yg-${cell.itemId}-${i}`}
                    className="trade-cargo-cell trade-cargo-cell--staged"
                    style={{ '--cargo-color': cell.color } as CSSProperties}
                    title={`${cell.label} — drag back or click to remove`}
                    draggable
                    onDragStart={(e) => onYouGiveDragStart(e, cell.itemId)}
                    onDragEnd={onCellDragEnd}
                    onClick={() => unstagePlayer(cell.itemId)}
                  >
                    <Icon size={10} strokeWidth={1.75} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* THEY GIVE */}
        <div
          className={`trade-cargo-deal__zone${dropZone === 'theyGive' ? ' trade-cargo-deal__zone--drop-target' : ''}`}
          onDragOver={handleDragOver('theyGive')}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop('theyGive')}
        >
          <div className="trade-cargo-deal__zone-title">THEY GIVE</div>
          {theyGiveCells.length === 0 ? (
            <div className="trade-cargo-deal__empty">Drag from Contact Cargo</div>
          ) : (
            <div className="trade-cargo-cell-grid trade-cargo-cell-grid--deal" style={gridStyle}>
              {theyGiveCells.map((cell, i) => {
                const Icon = ITEM_ICONS[cell.itemId] ?? Package;
                return (
                  <div
                    key={`tg-${cell.itemId}-${i}`}
                    className="trade-cargo-cell trade-cargo-cell--staged"
                    style={{ '--cargo-color': cell.color } as CSSProperties}
                    title={`${cell.label} — drag back or click to remove`}
                    draggable
                    onDragStart={(e) => onTheyGiveDragStart(e, cell.itemId)}
                    onDragEnd={onCellDragEnd}
                    onClick={() => unstageContact(cell.itemId)}
                  >
                    <Icon size={10} strokeWidth={1.75} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
