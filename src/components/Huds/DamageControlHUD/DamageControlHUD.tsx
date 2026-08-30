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
  getInstalledBufferId,
  subscribeCommsBuffer,
  installBufferFromCargo,
} from '../../../context/CommsBufferStore';
import {
  getInstalledBatteryLevel,
  subscribeEmergencyBattery,
  tickEmergencyBattery,
  installBatteryFromCargo,
} from '../../../context/EmergencyBatteryStore';
import {
  PATCH_DURATION_SECONDS,
  CO2_FILTER_WARN_THRESHOLD,
  CO2_FILTER_ITEM_ID,
  CO2_NO_FILTER_DEATH_SECONDS,
  HULL_REPAIR_PATCH_ITEM_ID,
  COMMS_BUFFER_ITEM_ID,
  EMERGENCY_BATTERY_ITEM_ID,
  EMERGENCY_BATTERY_CAPACITY,
} from '../../../config/damageConfig';
import {
  isCargoDragEvent,
  readCargoDragPayload,
  writeCargoDragPayload,
  type CargoDragPayload,
} from '../PowerHUD/Cargo/cargoHoldHelpers';
import { CO2_FILTER_SLOT_OWNER, COMMS_BUFFER_SLOT_OWNER, EMERGENCY_BATTERY_SLOT_OWNER } from '../PowerHUD/Cargo/CargoHoldPanel';
import type { InventoryOwnerRef } from '../../../context/InventoryStore';
import { AlertTriangle, AirVent, Hammer, Radio, Battery } from 'lucide-react';
import './DamageControlHUD.css';

const DURATION_MS = PATCH_DURATION_SECONDS * 1000;

const CO2_SLOT_OWNER_REF: InventoryOwnerRef = {
  kind: 'vessel',
  vesselId: CO2_FILTER_SLOT_OWNER,
};

const COMMS_BUFFER_SLOT_OWNER_REF: InventoryOwnerRef = {
  kind: 'vessel',
  vesselId: COMMS_BUFFER_SLOT_OWNER,
};

const BATTERY_SLOT_OWNER_REF: InventoryOwnerRef = {
  kind: 'vessel',
  vesselId: EMERGENCY_BATTERY_SLOT_OWNER,
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

function useCommsBuffer() {
  const [bufferId, setBufferId] = useState(() => getInstalledBufferId());
  useEffect(
    () => subscribeCommsBuffer(() => setBufferId(getInstalledBufferId())),
    []
  );
  return bufferId;
}

function useEmergencyBattery() {
  const [level, setLevel] = useState(() => getInstalledBatteryLevel());
  useEffect(
    () => subscribeEmergencyBattery(() => setLevel(getInstalledBatteryLevel())),
    []
  );
  return level;
}

export default function DamageControlHUD() {
  const { fractures, patchJobs } = useDamageControl();
  const { co2Level, co2Spares, noFilterElapsed } = useCO2Filter();
  const commsBufferId = useCommsBuffer();
  const batteryLevel = useEmergencyBattery();
  const [patchCount, setPatchCount] = useState(() => getPatchCount());
  const [co2DropTarget, setCo2DropTarget] = useState(false);
  const [commsDropTarget, setCommsDropTarget] = useState(false);
  const [batteryDropTarget, setBatteryDropTarget] = useState(false);
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
      tickEmergencyBattery(delta);
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

  // ── Comms buffer drag-and-drop ────────────────────────────────────────────
  const commsInstalled = commsBufferId !== null;

  function onCommsDragStart(e: DragEvent) {
    if (!commsInstalled) return;
    const payload: CargoDragPayload = {
      itemId: COMMS_BUFFER_ITEM_ID,
      quantity: 1,
      from: COMMS_BUFFER_SLOT_OWNER_REF,
      salvagedBy: commsBufferId,
    };
    writeCargoDragPayload(e.dataTransfer, payload);
  }

  function onCommsDragOver(e: DragEvent) {
    if (!isCargoDragEvent(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setCommsDropTarget(true);
  }

  function onCommsDragLeave() {
    setCommsDropTarget(false);
  }

  function onCommsDrop(e: DragEvent) {
    setCommsDropTarget(false);
    e.preventDefault();
    const payload = readCargoDragPayload(e.dataTransfer);
    if (!payload || payload.itemId !== COMMS_BUFFER_ITEM_ID) return;
    // Don't accept drops from the comms buffer slot itself
    if (payload.from.kind === 'vessel' && payload.from.vesselId === COMMS_BUFFER_SLOT_OWNER) return;
    if (!payload.salvagedBy) return;
    installBufferFromCargo(payload.salvagedBy);
  }

  // ── Emergency battery drag-and-drop ──────────────────────────────────────
  const batteryInstalled = batteryLevel !== null;

  function onBatteryDragStart(e: DragEvent) {
    if (!batteryInstalled) return;
    const payload: CargoDragPayload = {
      itemId: EMERGENCY_BATTERY_ITEM_ID,
      quantity: 1,
      from: BATTERY_SLOT_OWNER_REF,
    };
    writeCargoDragPayload(e.dataTransfer, payload);
  }

  function onBatteryDragOver(e: DragEvent) {
    if (!isCargoDragEvent(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setBatteryDropTarget(true);
  }

  function onBatteryDragLeave() {
    setBatteryDropTarget(false);
  }

  function onBatteryDrop(e: DragEvent) {
    setBatteryDropTarget(false);
    e.preventDefault();
    const payload = readCargoDragPayload(e.dataTransfer);
    if (!payload || payload.itemId !== EMERGENCY_BATTERY_ITEM_ID) return;
    // Don't accept drops from the battery slot itself
    if (payload.from.kind === 'vessel' && payload.from.vesselId === EMERGENCY_BATTERY_SLOT_OWNER) return;
    installBatteryFromCargo();
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
      <div className={`comms-buffer-row${!commsInstalled ? ' comms-buffer-row--empty' : ''}`}>
        <span className="comms-buffer-label">COMMS BUF</span>
        <div className="comms-buffer-right">
          {commsInstalled ? (
            <span className="comms-buffer-id">
              {commsBufferId === 'player-ship' ? 'SELF' : commsBufferId}
            </span>
          ) : (
            <span className="comms-buffer-id comms-buffer-id--empty">—</span>
          )}
          <div
            className={`comms-buffer-slot${commsInstalled ? ' comms-buffer-slot--filled' : ''}${commsDropTarget ? ' comms-buffer-slot--drop-target' : ''}`}
            draggable={commsInstalled}
            onDragStart={onCommsDragStart}
            onDragOver={onCommsDragOver}
            onDragLeave={onCommsDragLeave}
            onDrop={onCommsDrop}
            title={
              commsInstalled
                ? `Comms buffer: ${commsBufferId === 'player-ship' ? 'SELF' : commsBufferId} — drag to cargo to remove`
                : 'Drag a comms buffer here from cargo'
            }
          >
            {commsInstalled ? (
              <Radio size={13} strokeWidth={1.75} />
            ) : (
              <span className="co2-filter-slot__plus">+</span>
            )}
          </div>
        </div>
      </div>
      <div className={`emrg-battery-row${!batteryInstalled ? ' emrg-battery-row--empty' : ''}`}>
        <span className="emrg-battery-label">EMRG BATT</span>
        <div className="emrg-battery-right">
          {batteryInstalled ? (
            <span className={`emrg-battery-level${batteryLevel <= 0 ? ' emrg-battery-level--depleted' : ''}`}>
              {Math.round(batteryLevel)}/{EMERGENCY_BATTERY_CAPACITY}
            </span>
          ) : (
            <span className="emrg-battery-level emrg-battery-level--empty">—</span>
          )}
          <div
            className={`emrg-battery-slot${batteryInstalled ? ' emrg-battery-slot--filled' : ''}${batteryDropTarget ? ' emrg-battery-slot--drop-target' : ''}`}
            draggable={batteryInstalled}
            onDragStart={onBatteryDragStart}
            onDragOver={onBatteryDragOver}
            onDragLeave={onBatteryDragLeave}
            onDrop={onBatteryDrop}
            title={
              batteryInstalled
                ? `Emergency battery ${Math.round(batteryLevel)}/${EMERGENCY_BATTERY_CAPACITY} — drag to cargo to remove`
                : 'Drag an emergency battery here from cargo'
            }
          >
            {batteryInstalled ? (
              <Battery size={13} strokeWidth={1.75} />
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
