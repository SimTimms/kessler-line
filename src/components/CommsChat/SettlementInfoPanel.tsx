import { useEffect, useState } from 'react';
import { getSettlementByObjectId } from '../../context/SettlementTracker';
import {
  getSettlementInfoSnapshot,
  getSettlementResourceLevelClass,
  type SettlementInfoSnapshot,
} from '../../narrative/settlementInfo';

interface SettlementInfoPanelProps {
  objectId: string;
}

function StatRow({
  label,
  value,
  levelClass,
}: {
  label: string;
  value: string;
  levelClass?: string;
}) {
  return (
    <div className="comms-settlement-stat">
      <span className="comms-settlement-stat-label">{label}</span>
      <span
        className={`comms-settlement-stat-value${levelClass ? ` comms-settlement-stat-value--${levelClass}` : ''}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function SettlementInfoPanel({ objectId }: SettlementInfoPanelProps) {
  const [snapshot, setSnapshot] = useState<SettlementInfoSnapshot | null>(() => {
    const runtime = getSettlementByObjectId(objectId);
    return runtime ? getSettlementInfoSnapshot(runtime) : null;
  });

  useEffect(() => {
    const sync = () => {
      const runtime = getSettlementByObjectId(objectId);
      setSnapshot(runtime ? getSettlementInfoSnapshot(runtime) : null);
    };
    sync();
    window.addEventListener('SettlementUpdated', sync);
    return () => window.removeEventListener('SettlementUpdated', sync);
  }, [objectId]);

  if (!snapshot) {
    return (
      <div className="comms-settlement-info">
        <div className="comms-settlement-empty">— NO STATION DATA —</div>
      </div>
    );
  }

  const statusClass =
    snapshot.status === 'dead' || snapshot.status === 'starving' || snapshot.status === 'desperate'
      ? 'critical'
      : snapshot.status === 'strained'
        ? 'low'
        : 'ok';

  return (
    <div className="comms-settlement-info">
      <div className="comms-settlement-section">
        <div className="comms-settlement-section-title">STATUS</div>
        <StatRow label="CONDITION" value={snapshot.statusLabel} levelClass={statusClass} />
        <StatRow label="FACTION" value={snapshot.faction.toUpperCase()} />
        <StatRow label="STATIONS" value={String(snapshot.stationCount)} />
        <StatRow
          label="POPULATION"
          value={`${snapshot.population} / ${snapshot.initialPopulation}`}
          levelClass={snapshot.population <= 0 ? 'critical' : snapshot.population < snapshot.initialPopulation ? 'low' : 'ok'}
        />
        <StatRow
          label="VIOLENCE"
          value={`${snapshot.violence}%`}
          levelClass={snapshot.violence >= 60 ? 'critical' : snapshot.violence >= 35 ? 'low' : 'ok'}
        />
      </div>

      <div className="comms-settlement-section">
        <div className="comms-settlement-section-title">RESOURCES</div>
        <StatRow
          label="FOOD"
          value={`${snapshot.foodPct}%`}
          levelClass={getSettlementResourceLevelClass(snapshot.foodPct)}
        />
        <StatRow
          label="WATER"
          value={`${snapshot.waterPct}%`}
          levelClass={getSettlementResourceLevelClass(snapshot.waterPct)}
        />
        <StatRow
          label="AIR"
          value={`${snapshot.airPct}%`}
          levelClass={getSettlementResourceLevelClass(snapshot.airPct)}
        />
      </div>
    </div>
  );
}
