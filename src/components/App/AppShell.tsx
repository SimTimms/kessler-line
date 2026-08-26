import { memo } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import AppContainer from './AppContainer';
//import SceneLayer from './SceneLayer';
import OverlayLayer from './OverlayLayer';
import HudLayer from './HudLayer';
import DialogLayer from './DialogLayer';
import AudioLayer from './AudioLayer';
import NavHudKeyBinding from './NavHudKeyBinding';
import StartOverlay from './StartOverlay';
import ShipTitleCard from './ShipTitleCard';
import { LoadingScreen } from './LoadingScreen';
import BackgroundHum from './BackgroundHum';
import { DeathOverlay } from '../Ship/DeathOverlay';
import DebugCascadePanel from './DebugCascadePanel';
import GraphicsSettings from './GraphicsSettings';

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
  docked: boolean;
  dockedStation: string | null;
  beaconActivated: boolean;
  listeningToMessage: boolean;
  setListeningToMessage: Dispatch<SetStateAction<boolean>>;
  activeAudioRef: MutableRefObject<HTMLAudioElement | null>;
  thrustLevel: number;
  setThrustLevel: Dispatch<SetStateAction<number>>;
  showStartOverlay: boolean;
  onStart: () => void;
  onTutorial: () => void;
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
    docked,
    dockedStation,
    beaconActivated,
    listeningToMessage,
    setListeningToMessage,
    activeAudioRef,
    thrustLevel,
    setThrustLevel,
    showStartOverlay,
    onStart,
    onTutorial,
    showShipTitle,
    onShipTitleDone,
  } = props;

  return (
    <AppContainer>
      <NavHudKeyBinding />
      {/*<SceneLayer />*/}
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
        thrustLevel={thrustLevel}
        setThrustLevel={setThrustLevel}
      />
      <DialogLayer
        docked={docked}
        dockedStation={dockedStation}
      />
      <AudioLayer
        beaconActivated={beaconActivated}
        listeningToMessage={listeningToMessage}
        setListeningToMessage={setListeningToMessage}
        activeAudioRef={activeAudioRef}
      />
      {showStartOverlay ? (
        <StartOverlay onStart={onStart} onTutorialSelect={onTutorial} />
      ) : (
        <BackgroundHum />
      )}
      {showShipTitle && <ShipTitleCard onDone={onShipTitleDone} />}
      <DeathOverlay />
      {/* Loading screen sits above everything; self-removes when all stages complete */}
      <LoadingScreen />
      {/* <DebugCascadePanel /> */}
      <GraphicsSettings />
    </AppContainer>
  );
});

export default AppShell;
