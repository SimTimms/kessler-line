import { driveSignatureOnRef } from '../../context/DriveSignatureScan';
import { power, fuel, setFuel, setPower, setO2, o2 } from '../../context/ShipState';
import { O2_DRAIN_RATE } from '../../config/damageConfig';

interface DrainParams {
  keysHeld: number;
  rawDelta: number;
}

let o2DepletedFired = false;

export function applyResourceDrain({ keysHeld, rawDelta }: DrainParams) {
  if (keysHeld > 0) {
    setPower(Math.max(0, power - keysHeld * rawDelta));
    setFuel(Math.max(0, fuel - keysHeld * rawDelta));
  }
  if (driveSignatureOnRef.current) {
    setPower(Math.max(0, power - 2 * rawDelta));
  }

  const newO2 = Math.max(0, o2 - O2_DRAIN_RATE * rawDelta);
  if (newO2 === 0 && o2 > 0 && !o2DepletedFired) {
    o2DepletedFired = true;
    window.dispatchEvent(new CustomEvent('O2Depleted'));
  }
  setO2(newO2);
}
