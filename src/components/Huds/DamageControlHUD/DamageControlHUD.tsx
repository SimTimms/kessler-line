import { useState } from 'react';
import { useFrameUpdate } from '../../../hooks/useFrameUpdate';
import {
  getPatchJobForFracture,
  tickDamageControl,
  tickPatchJobs,
} from '../../../context/DamageControlStore';
import { tickCO2Filter } from '../../../context/CO2FilterStore';
import { tickEmergencyBattery } from '../../../context/EmergencyBatteryStore';
import { tickAirCanister } from '../../../context/AirCanisterStore';
import {
  PATCH_DURATION_SECONDS,
  CO2_FILTER_ITEM_ID,
  EMERGENCY_BATTERY_ITEM_ID,
  EMERGENCY_BATTERY_CAPACITY,
  AIR_CANISTER_ITEM_ID,
  AIR_CANISTER_CAPACITY,
} from '../../../config/damageConfig';
import { AirVent, Cylinder, Hammer, Radio, Battery } from 'lucide-react';
import './DamageControlHUD.css';
import ModuleSlot from './ModuleSlot';
import { useCO2Filter, createCO2FilterDragHandlers } from './helpers/co2FilterSlot';
import { useCommsBuffer, createCommsBufferDragHandlers } from './helpers/commsBufferSlot';
import { useAirCanister, createAirCanisterDragHandlers } from './helpers/airCanisterSlots';
import {
  useEmergencyBattery,
  createEmergencyBatteryDragHandlers,
} from './helpers/emergencyBatterySlot';
import { useDamageControl, createPatchDragHandlers } from './helpers/patchSlot';

const DURATION_MS = PATCH_DURATION_SECONDS * 1000;

export default function DamageControlHUD() {
  const { fractures } = useDamageControl();
  const { co2Level } = useCO2Filter();
  const airCanisterLevel = useAirCanister();
  const commsBufferId = useCommsBuffer();
  const batteryLevel = useEmergencyBattery();
  const [co2DropTarget, setCo2DropTarget] = useState(false);
  const [airCanisterDropTarget, setAirCanisterDropTarget] = useState(false);
  const [commsDropTarget, setCommsDropTarget] = useState(false);
  const [batteryDropTarget, setBatteryDropTarget] = useState(false);
  const [patchDropTarget, setPatchDropTarget] = useState<number | null>(null);
  const [now, setNow] = useState(() => performance.now());

  useFrameUpdate((dtMs) => {
    const delta = dtMs / 1000;
    tickDamageControl();
    tickPatchJobs();
    tickCO2Filter(delta);
    tickEmergencyBattery(delta);
    tickAirCanister(delta);
    setNow(performance.now());
  });

  const filterInstalled = co2Level !== null;
  const commsInstalled = commsBufferId !== null;
  const batteryInstalled = batteryLevel !== null;
  const airCanisterInstalled = airCanisterLevel !== null;

  const { onCO2DragStart, onCO2DragOver, onCO2DragLeave, onCO2Drop } = createCO2FilterDragHandlers({
    filterInstalled,
    setCo2DropTarget,
  });

  const {
    onAirCanisterDragStart,
    onAirCanisterDragOver,
    onAirCanisterDragLeave,
    onAirCanisterDrop,
  } = createAirCanisterDragHandlers({
    airCanisterInstalled,
    setAirCanisterDropTarget,
  });

  const { onCommsDragStart, onCommsDragOver, onCommsDragLeave, onCommsDrop } =
    createCommsBufferDragHandlers({ commsInstalled, commsBufferId, setCommsDropTarget });

  const { onBatteryDragStart, onBatteryDragOver, onBatteryDragLeave, onBatteryDrop } =
    createEmergencyBatteryDragHandlers({ batteryInstalled, setBatteryDropTarget });

  const { onPatchDragOver, onPatchDragLeave, onPatchDrop, onPatchCancel } = createPatchDragHandlers(
    {
      setPatchDropTarget,
    }
  );

  return (
    <div className="damage-control" aria-label="Damage Control">
      <div className="damage-control-header">
        <span className="hud-title">ENGINEERING</span>
      </div>
      <ModuleSlot
        moduleInstalled={airCanisterInstalled}
        moduleId={AIR_CANISTER_ITEM_ID}
        moduleCapacity={AIR_CANISTER_CAPACITY}
        moduleCurrentLevel={airCanisterLevel ?? 0}
        moduleDropTarget={airCanisterDropTarget}
        onModuleDragStart={onAirCanisterDragStart}
        onModuleDragOver={onAirCanisterDragOver}
        onModuleDragLeave={onAirCanisterDragLeave}
        onModuleDrop={onAirCanisterDrop}
        moduleIcon={<Cylinder size={13} strokeWidth={1.75} />}
        moduleLabel="EMRG O2"
      />
      <ModuleSlot
        moduleInstalled={filterInstalled}
        moduleId={CO2_FILTER_ITEM_ID}
        moduleCapacity={100}
        moduleCurrentLevel={co2Level ?? 0}
        moduleDropTarget={co2DropTarget}
        onModuleDragStart={onCO2DragStart}
        onModuleDragOver={onCO2DragOver}
        onModuleDragLeave={onCO2DragLeave}
        onModuleDrop={onCO2Drop}
        moduleIcon={<AirVent size={13} strokeWidth={1.75} />}
        moduleLabel="CO2 FILTER"
      />
      <ModuleSlot
        moduleInstalled={commsInstalled}
        moduleId={commsBufferId}
        moduleDropTarget={commsDropTarget}
        onModuleDragStart={onCommsDragStart}
        onModuleDragOver={onCommsDragOver}
        onModuleDragLeave={onCommsDragLeave}
        onModuleDrop={onCommsDrop}
        moduleIcon={<Radio size={13} strokeWidth={1.75} />}
        moduleLabel="COMMS BUF"
      />
      <ModuleSlot
        moduleInstalled={batteryInstalled}
        moduleId={EMERGENCY_BATTERY_ITEM_ID}
        moduleCapacity={EMERGENCY_BATTERY_CAPACITY}
        moduleCurrentLevel={batteryLevel ?? 0}
        moduleDropTarget={batteryDropTarget}
        onModuleDragStart={onBatteryDragStart}
        onModuleDragOver={onBatteryDragOver}
        onModuleDragLeave={onBatteryDragLeave}
        onModuleDrop={onBatteryDrop}
        moduleIcon={<Battery size={13} strokeWidth={1.75} />}
        moduleLabel="EMRG BATT"
      />

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
                      if (job?.status === 'queued') onPatchCancel(f.id);
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
