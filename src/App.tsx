import './App.css';
import { AppShell } from './components/App';
import { useAppLifecycle, useAppState } from './hooks';
function App() {
  useAppLifecycle();
  const { hud, docking, npcHail, setNpcHail, beacon, mission, thrust } = useAppState();

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
      npcHail={npcHail}
      setNpcHail={setNpcHail}
      beaconActivated={beacon.beaconActivated}
      listeningToMessage={beacon.listeningToMessage}
      setListeningToMessage={beacon.setListeningToMessage}
      activeAudioRef={beacon.activeAudioRef}
      thrustLevel={thrust.thrustLevel}
      setThrustLevel={thrust.setThrustLevel}
    />
  );
}

export default App;
