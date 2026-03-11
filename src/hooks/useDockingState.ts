import { useState, useEffect } from 'react';
import { isRefueling, isTransferringO2 } from '../components/Ship/Spaceship';

export function useDockingState() {
  const [docked, setDocked] = useState(false);
  const [dockedStation, setDockedStation] = useState<string | null>(null);
  const [refueling, setRefueling] = useState(false);
  const [transferringO2, setTransferringO2] = useState(false);

  useEffect(() => {
    const onDocked = (e: Event) => {
      const detail = (e as CustomEvent<{ stationId: string | null }>).detail;
      setDocked(true);
      setDockedStation(detail?.stationId ?? null);
    };
    const onUndocked = () => {
      setDocked(false);
      setDockedStation(null);
      setRefueling(false);
      setTransferringO2(false);
      isRefueling.current = false;
      isTransferringO2.current = false;
    };
    window.addEventListener('ShipDocked', onDocked);
    window.addEventListener('ShipUndocked', onUndocked);
    return () => {
      window.removeEventListener('ShipDocked', onDocked);
      window.removeEventListener('ShipUndocked', onUndocked);
    };
  }, []);

  return {
    docked,
    dockedStation,
    refueling,
    transferringO2,
    onRefuel: () => {
      const next = !refueling;
      setRefueling(next);
      isRefueling.current = next;
    },
    onTransferO2: () => {
      const next = !transferringO2;
      setTransferringO2(next);
      isTransferringO2.current = next;
    },
  };
}
