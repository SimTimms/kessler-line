import { driveSignatureOnRef } from '../../context/DriveSignatureScan';
import { power, fuel, setFuel, setPower, setO2, o2 } from '../../context/ShipState';

interface DrainParams {
  keysHeld: number;
  rawDelta: number;
}

export function applyResourceDrain({ keysHeld, rawDelta }: DrainParams) {
  if (keysHeld > 0) {
    setPower(Math.max(0, power - keysHeld * rawDelta));
    setFuel(Math.max(0, fuel - keysHeld * rawDelta));
  }
  if (driveSignatureOnRef.current) {
    setPower(Math.max(0, power - 2 * rawDelta));
  }

  setO2(Math.max(0, o2 - 1 * rawDelta));
}
