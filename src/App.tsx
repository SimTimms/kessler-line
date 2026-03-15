import './App.css';
import { AppShell } from './components/App';
import { useAppLifecycle, useAppState } from './hooks';
import { resumeAudioContext } from './sound/SoundManager';
import { useCallback, useState } from 'react';
function App() {
  useAppLifecycle();
  const { hud, docking, npcHail, setNpcHail, beacon, mission, thrust } = useAppState();
  const [hasStarted, setHasStarted] = useState(false);
  const handleStart = useCallback(() => {
    resumeAudioContext();
    setHasStarted(true);
  }, []);

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
      showStartOverlay={!hasStarted}
      onStart={handleStart}
    />
  );
}

export default App;
