import { useState } from 'react';
import { setCargo, clearCargo } from '../context/Inventory';

export type MissionId = 'kronos4' | 'mars' | 'neptune';

export function useMissionState() {
  const [activeMission, setActiveMission] = useState<MissionId | null>(null);
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);

  const onMissionSelect = (mission: MissionId) => {
    if (mission === 'mars') {
      setCargo([{ name: 'Food', quantity: 20 }]);
      setActiveMission('mars');
    } else if (mission === 'neptune') {
      setCargo([{ name: 'Data Cores', quantity: 15 }]);
      setActiveMission('neptune');
    } else if (mission === 'kronos4') {
      setCargo([{ name: 'Sealed Unit (ref. MX-7734)', quantity: 1 }]);
      setActiveMission('kronos4');
    }
  };

  const onMissionComplete = () => {
    clearCargo();
    setActiveMission(null);
    setCompletedMissions((prev) => [...prev, 'kronos4']);
  };

  return {
    activeMission,
    completedMissions,
    onMissionSelect,
    onMissionComplete,
  };
}
