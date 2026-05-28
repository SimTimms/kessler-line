import { driveSignatureOnRef } from '../../context/DriveSignatureScan';
import { spotlightOnRef } from '../../context/SpotlightState';
import { resourceRateRefs } from '../../context/ResourceRates';
import { power, fuel, shipCrew, setFuel, setPower, setO2, o2 } from '../../context/ShipState';
import { o2DrainRateForCrew } from '../../config/damageConfig';

interface DrainParams {
  keysHeld: number;
  rawDelta: number;
}

let o2DepletedFired = false;

export function applyResourceDrain({ keysHeld, rawDelta }: DrainParams) {
  let powerRate = 0;
  let fuelRate = 0;

  // Propulsion consumes propellant only; ship power is drained by systems (e.g. scanners).
  if (keysHeld > 0) {
    fuelRate -= keysHeld;
    setFuel(Math.max(0, fuel - keysHeld * rawDelta));
  }
  if (spotlightOnRef.current) {
    powerRate -= 1;
    setPower(Math.max(0, power - rawDelta));
  }
  if (driveSignatureOnRef.current) {
    powerRate -= 2;
    setPower(Math.max(0, power - 2 * rawDelta));
  }

  const o2Drain = o2DrainRateForCrew(shipCrew);

  resourceRateRefs.power.current = powerRate;
  resourceRateRefs.fuel.current = fuelRate;
  resourceRateRefs.o2.current = -o2Drain;

  const newO2 = Math.max(0, o2 - o2Drain * rawDelta);
  if (newO2 === 0 && o2 > 0 && !o2DepletedFired) {
    o2DepletedFired = true;
    window.dispatchEvent(new CustomEvent('O2Depleted'));
  }
  setO2(newO2);
}
