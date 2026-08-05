import { useState, useEffect, useCallback } from 'react';
import { setCargo, clearCargo } from '../context/Inventory';
import {
  activeMissionRef,
  completedMissionsRef,
  setActiveMission as setActiveMissionRef,
  addCompletedMission,
} from '../context/MissionState';

export type { MissionId } from '../context/MissionState';
import type { MissionId } from '../context/MissionState';

export function useMissionState() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const handler = () => rerender((n) => n + 1);
    window.addEventListener('MissionStateChanged', handler);
    return () => window.removeEventListener('MissionStateChanged', handler);
  }, []);

  const onMissionSelect = useCallback((mission: MissionId) => {
    if (mission === 'mars') {
      setCargo([{ name: 'Food', quantity: 20 }]);
      setActiveMissionRef('mars');
    } else if (mission === 'neptune') {
      setCargo([{ name: 'Data Cores', quantity: 15 }]);
      setActiveMissionRef('neptune');
    } else if (mission === 'kronos4') {
      setCargo([{ name: 'Sealed Unit (ref. MX-7734)', quantity: 1 }]);
      setActiveMissionRef('kronos4');
    }
  }, []);

  const onMissionComplete = useCallback(() => {
    clearCargo();
    addCompletedMission('kronos4');
    setActiveMissionRef(null);
  }, []);

  return {
    activeMission: activeMissionRef.current,
    completedMissions: completedMissionsRef.current,
    onMissionSelect,
    onMissionComplete,
  };
}
