import { useHudToggles } from './useHudToggles';
import { useDockingState } from './useDockingState';
import { useNpcHail } from './useNpcHail';
import { useBeaconAudio } from './useBeaconAudio';
import { useMissionState } from './useMissionState';
import { useThrustLevel } from './useThrustLevel';

export function useAppState() {
  const hud = useHudToggles();
  const docking = useDockingState();
  const { npcHail, setNpcHail } = useNpcHail(docking.docked);
  const beacon = useBeaconAudio();
  const mission = useMissionState();
  const thrust = useThrustLevel(1);

  return {
    hud,
    docking,
    npcHail,
    setNpcHail,
    beacon,
    mission,
    thrust,
  };
}
