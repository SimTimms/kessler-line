import { memo } from 'react';
import DockingDialog from '../WorldObjects/DockingDialog';
import StationCrewPanel from '../Station/StationCrewPanel';
import type { MissionId } from '../../hooks/useMissionState';
import { hasDockablePartner } from '../../context/DockablePartnerStore';
import { getStationResidents } from '../../narrative/stationCharacters';

interface DialogLayerProps {
  docked: boolean;
  dockedStation: string | null;
  activeMission: MissionId | null;
  completedMissions: string[];
  refueling: boolean;
  transferringO2: boolean;
  onRefuel: () => void;
  onTransferO2: () => void;
  onMissionSelect: (mission: MissionId) => void;
  onMissionComplete: () => void;
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
}: DialogLayerProps) {
  const showStationDialog = docked && !hasDockablePartner(dockedStation);
  const showCrew = docked && getStationResidents(dockedStation).length > 0;

  return (
    <>
      {showStationDialog && (
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
      {showCrew && <StationCrewPanel key={dockedStation} dockedStation={dockedStation} />}
    </>
  );
});

export default DialogLayer;
