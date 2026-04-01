import { useHudToggles } from './useHudToggles';
import { useDockingState } from './useDockingState';
import { useBeaconAudio } from './useBeaconAudio';
import { useMissionState } from './useMissionState';
import { useThrustLevel } from './useThrustLevel';

export function useAppState() {
  const hud = useHudToggles();
  const docking = useDockingState();
  const beacon = useBeaconAudio();
  const mission = useMissionState();
  const thrust = useThrustLevel(1);

  return {
    hud,
    docking,
    beacon,
    mission,
    thrust,
  };
}
