import { useEffect, useState } from 'react';
import {
  activeMissionRef,
  completedMissionsRef,
  declinedMissionsRef,
} from '../context/MissionState';

export function useMissionJournal() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const handler = () => rerender((n) => n + 1);
    window.addEventListener('MissionStateChanged', handler);
    return () => window.removeEventListener('MissionStateChanged', handler);
  }, []);

  return {
    activeMissions: activeMissionRef.current,
    completedMissions: completedMissionsRef.current,
    declinedMissions: declinedMissionsRef.current,
  };
}
