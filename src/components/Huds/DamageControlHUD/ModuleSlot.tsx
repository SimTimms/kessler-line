interface ModuleSlotProps {
  moduleInstalled: boolean;
  moduleId: string | undefined | null;
  moduleDropTarget: boolean;
  moduleCapacity?: number;
  moduleCurrentLevel?: number;
  onModuleDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onModuleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onModuleDragLeave: () => void;
  onModuleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  moduleIcon: React.ReactNode;
  moduleLabel: string | undefined | null;
}
export default function ModuleSlot({
  moduleInstalled,
  moduleId,
  moduleDropTarget,
  moduleCapacity,
  moduleCurrentLevel,
  onModuleDragStart,
  onModuleDragOver,
  onModuleDragLeave,
  onModuleDrop,
  moduleIcon,
  moduleLabel,
}: ModuleSlotProps) {
  return (
    <div className={`comms-buffer-row${!moduleInstalled ? ' comms-buffer-row--empty' : ''}`}>
      <span className="comms-buffer-label">{moduleLabel}</span>
      <div className="comms-buffer-right">
        {moduleInstalled && moduleCapacity && moduleCurrentLevel ? (
          <span
            className={`emrg-battery-level${moduleCurrentLevel <= 0 ? ' emrg-battery-level--depleted' : ''}`}
          >
            {Math.round(moduleCurrentLevel)}/{moduleCapacity}
          </span>
        ) : (
          <span className="emrg-battery-level emrg-battery-level--empty">—</span>
        )}

        <div
          className={`comms-buffer-slot${moduleInstalled ? ' comms-buffer-slot--filled' : ''}${moduleDropTarget ? ' comms-buffer-slot--drop-target' : ''}`}
          draggable={moduleInstalled}
          onDragStart={onModuleDragStart}
          onDragOver={onModuleDragOver}
          onDragLeave={onModuleDragLeave}
          onDrop={onModuleDrop}
          title={
            moduleInstalled
              ? `${moduleLabel}: ${moduleId === 'player-ship' ? 'SELF' : moduleId} — drag to cargo to remove`
              : `Drag ${moduleLabel} here from cargo`
          }
        >
          {moduleInstalled ? moduleIcon : <span className="co2-filter-slot__plus">+</span>}
        </div>
      </div>
    </div>
  );
}
