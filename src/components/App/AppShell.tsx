import { memo } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import AppContainer from './AppContainer';
import AppStyles from './AppStyles';
import SceneLayer from './SceneLayer';
import OverlayLayer from './OverlayLayer';
import HudLayer from './HudLayer';
import DialogLayer from './DialogLayer';
import AudioLayer from './AudioLayer';
import ControlLayer from './ControlLayer';
import StartOverlay from './StartOverlay';
import ShipTitleCard from './ShipTitleCard';
import BackgroundHum from './BackgroundHum';
import { DeathOverlay } from '../Ship/DeathOverlay';
import DebugCascadePanel from './DebugCascadePanel';
import GraphicsSettings from './GraphicsSettings';
import type { MissionId } from '../../hooks/useMissionState';

interface AppShellProps {
  spotlightOn: boolean;
  setSpotlightOn: Dispatch<SetStateAction<boolean>>;
  magneticOn: boolean;
  setMagneticOn: Dispatch<SetStateAction<boolean>>;
  driveSignatureOn: boolean;
  setDriveSignatureOn: Dispatch<SetStateAction<boolean>>;
  proximity: boolean;
  setProximity: Dispatch<SetStateAction<boolean>>;
  radioOn: boolean;
  setRadioOn: Dispatch<SetStateAction<boolean>>;
  showMinimap: boolean;
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
  beaconActivated: boolean;
  listeningToMessage: boolean;
  setListeningToMessage: Dispatch<SetStateAction<boolean>>;
  activeAudioRef: MutableRefObject<HTMLAudioElement | null>;
  thrustLevel: number;
  setThrustLevel: Dispatch<SetStateAction<number>>;
  showStartOverlay: boolean;
  onStart: () => void;
  showShipTitle: boolean;
  onShipTitleDone: () => void;
}

const AppShell = memo(function AppShell(props: AppShellProps) {
  const {
    spotlightOn,
    setSpotlightOn,
    magneticOn,
    setMagneticOn,
    driveSignatureOn,
    setDriveSignatureOn,
    proximity,
    setProximity,
    radioOn,
    setRadioOn,
    showMinimap,
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
    beaconActivated,
    listeningToMessage,
    setListeningToMessage,
    activeAudioRef,
    thrustLevel,
    setThrustLevel,
    showStartOverlay,
    onStart,
    showShipTitle,
    onShipTitleDone,
  } = props;

  return (
    <AppContainer>
      <SceneLayer />
      <OverlayLayer />
      <HudLayer
        spotlightOn={spotlightOn}
        setSpotlightOn={setSpotlightOn}
        magneticOn={magneticOn}
        setMagneticOn={setMagneticOn}
        driveSignatureOn={driveSignatureOn}
        setDriveSignatureOn={setDriveSignatureOn}
        proximity={proximity}
        setProximity={setProximity}
        radioOn={radioOn}
        setRadioOn={setRadioOn}
        showMinimap={showMinimap}
      />
      <DialogLayer
        docked={docked}
        dockedStation={dockedStation}
        activeMission={activeMission}
        completedMissions={completedMissions}
        refueling={refueling}
        transferringO2={transferringO2}
        onRefuel={onRefuel}
        onTransferO2={onTransferO2}
        onMissionSelect={onMissionSelect}
        onMissionComplete={onMissionComplete}
      />
      <AudioLayer
        beaconActivated={beaconActivated}
        listeningToMessage={listeningToMessage}
        setListeningToMessage={setListeningToMessage}
        activeAudioRef={activeAudioRef}
      />
      <ControlLayer thrustLevel={thrustLevel} setThrustLevel={setThrustLevel} />
      {showStartOverlay ? <StartOverlay onStart={onStart} /> : <BackgroundHum />}
      {showShipTitle && <ShipTitleCard onDone={onShipTitleDone} />}
      <DeathOverlay />
      {/* <DebugCascadePanel /> */}
      <GraphicsSettings />
      <AppStyles />
    </AppContainer>
  );
});

export default AppShell;
