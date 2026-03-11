import { memo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import DockingDialog from '../DockingDialog';
import NPCContactDialog, { type NPCHailDetail } from '../NPCContactDialog';

interface DialogLayerProps {
  docked: boolean;
  dockedStation: string | null;
  activeMission: 'kronos4' | 'mars' | 'neptune' | null;
  completedMissions: string[];
  refueling: boolean;
  transferringO2: boolean;
  onRefuel: () => void;
  onTransferO2: () => void;
  onMissionSelect: (mission: 'kronos4' | 'mars' | 'neptune') => void;
  onMissionComplete: () => void;
  npcHail: NPCHailDetail | null;
  setNpcHail: Dispatch<SetStateAction<NPCHailDetail | null>>;
}

const DialogLayer = memo(function DialogLayer({
  docked,
  dockedStation,
  activeMission,
  completedMissions,
  refueling,
  transferringO2,
  onRefuel,
  onTransferO2,
  onMissionSelect,
  onMissionComplete,
  npcHail,
  setNpcHail,
}: DialogLayerProps) {
  return (
    <>
      {npcHail && !docked && (
        <NPCContactDialog detail={npcHail} onDismiss={() => setNpcHail(null)} />
      )}

      {docked && (
        <DockingDialog
          stationId={dockedStation}
          activeMission={activeMission}
          completedMissions={completedMissions}
          refueling={refueling}
          transferringO2={transferringO2}
          onRefuel={onRefuel}
          onTransferO2={onTransferO2}
          onMissionSelect={onMissionSelect}
          onMissionComplete={onMissionComplete}
        />
      )}
    </>
  );
});

export default DialogLayer;
