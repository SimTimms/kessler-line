import { AppShell } from './index';
import { GAME_MODES } from '../../config/gameModes';
import type { useAppState } from '../../hooks/useAppState';
import type { useGameModeHandlers } from '../../hooks/useGameModeHandlers';
import StartOverlay from './StartOverlay';
import TutorialMovement from '../TutorialMovement/TutorialMovement';
import TutorialResources from '../TutorialResources/TutorialResources';
import TutorialAir from '../TutorialAir/TutorialAir';
import TutorialRadio from '../TutorialRadio/TutorialRadio';
import TutorialOrbital from '../TutorialOrbital/TutorialOrbital';
import Sandbox from '../Sandbox/Sandbox';
import ModelConfig from '../ModelConfig/ModelConfig';
import LandingPadConfig from '../LandingPadConfig/LandingPadConfig';
import InventoryConfig from '../InventoryConfig/InventoryConfig';
import SalvageConfig from '../SalvageConfig/SalvageConfig';
import DroneConfig from '../DroneConfig/DroneConfig';
import LongDistanceTravelConfig from '../LongDistanceTravelConfig/LongDistanceTravelConfig';
import CombatConfig from '../CombatConfig/CombatConfig';
import HudConfig from '../HudConfig/HudConfig';
import NarrativeConfig from '../NarrativeConfig/NarrativeConfig';
import ShipNavigationConfig from '../ShipNavigationConfig/ShipNavigationConfig';
import EmptyScene from '../EmptyScene/EmptyScene';

type ModeRouterProps = ReturnType<typeof useGameModeHandlers> & ReturnType<typeof useAppState>;

export default function ModeRouter({
  mode,
  tutorialMode,
  showShipTitle,
  narrativeLoadSave,
  handleStart,
  handleTutorialSelect,
  handleNarrativeLoad,
  handleTutorialComplete,
  handleShipTitleDone,
  hud,
  docking,
  beacon,
  mission,
  thrust,
}: ModeRouterProps) {
  switch (mode) {
    case GAME_MODES.menu:
      return <StartOverlay onStart={handleStart} onTutorialSelect={handleTutorialSelect} onNarrativeLoad={handleNarrativeLoad} />;
    case GAME_MODES.modelConfig:
      return <ModelConfig />;
    case GAME_MODES.shipNavigationConfig:
      return <ShipNavigationConfig />;
    case GAME_MODES.shipConfig:
      return <LandingPadConfig />;
    case GAME_MODES.inventoryConfig:
      return <InventoryConfig />;
    case GAME_MODES.salvageConfig:
      return <SalvageConfig />;
    case GAME_MODES.droneConfig:
      return <DroneConfig />;
    case GAME_MODES.longDistanceTravelConfig:
      return <LongDistanceTravelConfig />;
    case GAME_MODES.combatConfig:
      return <CombatConfig />;
    case GAME_MODES.hudConfig:
      return <HudConfig />;
    case GAME_MODES.narrativeConfig:
      return <NarrativeConfig loadSave={narrativeLoadSave} />;
    case GAME_MODES.emptyScene:
      return <EmptyScene />;
    case GAME_MODES.sandbox:
      return <Sandbox />;
    case GAME_MODES.tutorial:
      return <TutorialMovement onComplete={handleTutorialComplete} tutorialMode={tutorialMode} />;
    case GAME_MODES.resources:
      return <TutorialResources onComplete={handleTutorialComplete} tutorialMode={tutorialMode} />;
    case GAME_MODES.airManagement:
      return <TutorialAir onComplete={handleTutorialComplete} />;
    case GAME_MODES.radioManagement:
      return <TutorialRadio onComplete={handleTutorialComplete} />;
    case GAME_MODES.orbitalManagement:
      return <TutorialOrbital onComplete={handleTutorialComplete} />;
    case GAME_MODES.game:
      return (
        <AppShell
          spotlightOn={hud.spotlightOn}
          setSpotlightOn={hud.setSpotlightOn}
          magneticOn={hud.magneticOn}
          setMagneticOn={hud.setMagneticOn}
          driveSignatureOn={hud.driveSignatureOn}
          setDriveSignatureOn={hud.setDriveSignatureOn}
          proximity={hud.proximity}
          setProximity={hud.setProximity}
          radioOn={hud.radioOn}
          setRadioOn={hud.setRadioOn}
          showMinimap={hud.showMinimap}
          docked={docking.docked}
          dockedStation={docking.dockedStation}
          activeMission={mission.activeMission}
          completedMissions={mission.completedMissions}
          refueling={docking.refueling}
          transferringO2={docking.transferringO2}
          onRefuel={docking.onRefuel}
          onTransferO2={docking.onTransferO2}
          onMissionSelect={mission.onMissionSelect}
          onMissionComplete={mission.onMissionComplete}
          beaconActivated={beacon.beaconActivated}
          listeningToMessage={beacon.listeningToMessage}
          setListeningToMessage={beacon.setListeningToMessage}
          activeAudioRef={beacon.activeAudioRef}
          thrustLevel={thrust.thrustLevel}
          setThrustLevel={thrust.setThrustLevel}
          showStartOverlay={false}
          onStart={handleStart}
          onTutorial={() => handleTutorialSelect(GAME_MODES.tutorial)}
          showShipTitle={showShipTitle}
          onShipTitleDone={handleShipTitleDone}
        />
      );
  }
}
