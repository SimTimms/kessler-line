import { useEffect } from 'react';
import {
  registerSettlementForObject,
  unregisterSettlementForObject,
} from '../context/SettlementTracker';

/** Attach a settlement simulation to a world object by its scannable / radio id. */
export function useRegisterSettlement(objectId: string): void {
  useEffect(() => {
    registerSettlementForObject(objectId);
    return () => unregisterSettlementForObject(objectId);
  }, [objectId]);
}
