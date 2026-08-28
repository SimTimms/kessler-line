import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import {
  getFractures,
  subscribeDamageControl,
  startPatch,
  cancelPatch,
  getPatchCount,
  getPatchJobs,
  getPatchJobForFracture,
  tickDamageControl,
  tickPatchJobs,
  type PatchJob,
} from '../../../context/DamageControlStore';
import {
  getCO2FilterLevel,
  getSpareFilterCount,
  getNoFilterElapsed,
  subscribeCO2Filter,
  tickCO2Filter,
  installFilterFromCargo,
} from '../../../context/CO2FilterStore';
import {
  PATCH_DURATION_SECONDS,
  CO2_FILTER_WARN_THRESHOLD,
  CO2_FILTER_ITEM_ID,
  CO2_NO_FILTER_DEATH_SECONDS,
  HULL_REPAIR_PATCH_ITEM_ID,
} from '../../../config/damageConfig';
import {
  isCargoDragEvent,
  readCargoDragPayload,
  writeCargoDragPayload,
  type CargoDragPayload,
} from '../PowerHUD/Cargo/cargoHoldHelpers';
import { CO2_FILTER_SLOT_OWNER } from '../PowerHUD/Cargo/CargoHoldPanel';
import type { InventoryOwnerRef } from '../../../context/InventoryStore';
import { AlertTriangle, AirVent, Hammer } from 'lucide-react';
import './DamageControlHUD.css';

const DURATION_MS = PATCH_DURATION_SECONDS * 1000;

const CO2_SLOT_OWNER_REF: InventoryOwnerRef = {
  kind: 'vessel',
  vesselId: CO2_FILTER_SLOT_OWNER,
};

function formatCountdown(remainingSeconds: number): string {
  const s = Math.max(0, Math.ceil(remainingSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function useDamageControl() {
  const [items, setItems] = useState(() => getFractures());
  const [jobs, setJobs] = useState<readonly PatchJob[]>(() => getPatchJobs());
  useEffect(
    () =>
      subscribeDamageControl(() => {
        setItems(getFractures());
        setJobs(getPatchJobs());
      }),
    []
  );
  return { fractures: items, patchJobs: jobs };
}

function useCO2Filter() {
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

export default function DamageControlHUD() {
  const { fractures, patchJobs } = useDamageControl();
  const { co2Level, co2Spares, noFilterElapsed } = useCO2Filter();
  const [patchCount, setPatchCount] = useState(() => getPatchCount());
  const [co2DropTarget, setCo2DropTarget] = useState(false);
  const [patchDropTarget, setPatchDropTarget] = useState<number | null>(null);
  const [now, setNow] = useState(() => performance.now());
  const rafRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  // Per-frame polling: tick damage control + patch jobs + CO2 filter + sync patch count
  useEffect(() => {
    let running = true;
    lastTimeRef.current = performance.now();
    const loop = () => {
      if (!running) return;
      const now = performance.now();
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      tickDamageControl();
      tickPatchJobs();
      tickCO2Filter(delta);
      setPatchCount(getPatchCount());
      setNow(now);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleCancel = useCallback((fractureId: number) => {
    cancelPatch(fractureId);
    setPatchCount(getPatchCount());
  }, []);

  // ── CO2 filter drag-and-drop ──────────────────────────────────────────────
  const filterInstalled = co2Level !== null;
  const filterDead = co2Level !== null && co2Level <= 0;
  const showCountdown = !filterInstalled || filterDead;
  const countdownRemaining = CO2_NO_FILTER_DEATH_SECONDS - noFilterElapsed;

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

  // ── Fracture drag-and-drop ────────────────────────────────────────────────
  function onPatchDragOver(e: DragEvent, fractureId: number) {
    if (!isCargoDragEvent(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setPatchDropTarget(fractureId);
  }

  function onPatchDragLeave(fractureId: number) {
    setPatchDropTarget((prev) => (prev === fractureId ? null : prev));
  }

  function onPatchDrop(e: DragEvent, fractureId: number) {
    setPatchDropTarget(null);
    e.preventDefault();
    const payload = readCargoDragPayload(e.dataTransfer);
    if (!payload || payload.itemId !== HULL_REPAIR_PATCH_ITEM_ID) return;
    startPatch(fractureId);
    setPatchCount(getPatchCount());
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const co2RowClasses = ['co2-filter-row', !filterInstalled ? 'co2-filter-row--empty' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className="damage-control" aria-label="Damage Control">
      <div className="damage-control-header">
        <span className="hud-title">DMG CTRL</span>
        <span className="damage-control-count">{fractures.length}</span>
        <span className="damage-control-patches">Patches: {patchCount}</span>
      </div>
      <div className={co2RowClasses}>
        <span className="co2-filter-label">CO2 FILTER</span>

        {/* ── Warning icons / countdown (left side) ───────────────────── */}
        {filterInstalled ? (
          <>
            {(co2Level <= CO2_FILTER_WARN_THRESHOLD || co2Level <= 0) && (
              <span className="co2-filter-warn">
                <AlertTriangle size={11} strokeWidth={2} />
              </span>
            )}
            {showCountdown && (
              <span className="co2-filter-countdown">{formatCountdown(countdownRemaining)}</span>
            )}
          </>
        ) : (
          <>
            <span className="co2-filter-warn">
              <AlertTriangle size={11} strokeWidth={2} />
            </span>
            <span className="co2-filter-countdown">{formatCountdown(countdownRemaining)}</span>
          </>
        )}

        {/* ── Right-aligned: percentage chip + slot ───────────────────── */}
        <div className="co2-filter-right">
          {filterInstalled ? (
            <span
              className={`co2-filter-level${
                co2Level <= 0
                  ? ' co2-filter-level--crit'
                  : co2Level <= CO2_FILTER_WARN_THRESHOLD
                    ? ' co2-filter-level--warn'
                    : ''
              }`}
            >
              {Math.round(co2Level)}%
            </span>
          ) : (
            <span className="co2-filter-level co2-filter-level--empty">—</span>
          )}
          <div
            className={`co2-filter-slot${filterInstalled ? ' co2-filter-slot--filled' : ''}${co2DropTarget ? ' co2-filter-slot--drop-target' : ''}`}
            draggable={filterInstalled}
            onDragStart={onCO2DragStart}
            onDragOver={onCO2DragOver}
            onDragLeave={onCO2DragLeave}
            onDrop={onCO2Drop}
            title={
              filterInstalled
                ? `CO2 filter ${Math.round(co2Level)}% — drag to cargo to remove`
                : 'Drag a CO2 filter here from cargo'
            }
          >
            {filterInstalled ? (
              <AirVent size={13} strokeWidth={1.75} />
            ) : (
              <span className="co2-filter-slot__plus">+</span>
            )}
          </div>
        </div>
      </div>
      <div className="damage-control-scroll">
        {fractures.length > 0 &&
          fractures.map((f) => {
            const job = getPatchJobForFracture(f.id);
            const hasJob = !!job;
            const progress =
              job?.status === 'active' ? Math.min(1, (now - job.startedAt) / DURATION_MS) : 0;
            const isDrop = patchDropTarget === f.id;

            return (
              <div key={f.id} className="damage-control-line">
                <span className="damage-control-section">{f.section} breached</span>
                <div className="dc-fracture-right">
                  {!hasJob && <span className="dc-patch-level dc-patch-level--empty">—</span>}
                  {job?.status === 'active' && (
                    <span className="dc-patch-level">{Math.round(progress * 100)}%</span>
                  )}
                  {job?.status === 'queued' && <span className="dc-patch-level">WAIT</span>}
                  <div
                    className={`dc-patch-slot${hasJob ? ' dc-patch-slot--filled' : ''}${isDrop ? ' dc-patch-slot--drop-target' : ''}`}
                    onDragOver={(e) => {
                      if (!hasJob) onPatchDragOver(e, f.id);
                    }}
                    onDragLeave={() => onPatchDragLeave(f.id)}
                    onDrop={(e) => {
                      if (!hasJob) onPatchDrop(e, f.id);
                    }}
                    onClick={() => {
                      if (job?.status === 'queued') handleCancel(f.id);
                    }}
                    title={
                      !hasJob
                        ? 'Drag a hull patch here'
                        : job.status === 'queued'
                          ? 'Click to cancel (refunds patch)'
                          : `Patching ${Math.round(progress * 100)}%`
                    }
                  >
                    {hasJob ? (
                      <Hammer size={13} strokeWidth={1.75} />
                    ) : (
                      <span className="co2-filter-slot__plus">+</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
