import { driveSignatureOnRef } from '../../context/DriveSignatureScan';
import { spotlightOnRef } from '../../context/SpotlightState';
import { resourceRateRefs } from '../../context/ResourceRates';
import { power, fuel, shipCrew, setFuel, setPower, setO2, o2, thrustMultiplier } from '../../context/ShipState';
import { o2DrainRateForCrew, FUEL_BURN_RATE } from '../../config/damageConfig';

interface DrainParams {
  fwd: boolean;
  rev: boolean;
  yawLeft: boolean;
  yawRight: boolean;
  strL: boolean;
  strR: boolean;
  radOut: boolean;
  radIn: boolean;
  rawDelta: number;
}

let o2DepletedFired = false;

const RCS_FUEL_RATE_FACTOR = 0.01;
const RCS_THRUST_MULTIPLIER_CAP = 2;

export function applyResourceDrain({
  fwd,
  rev,
  yawLeft,
  yawRight,
  strL,
  strR,
  radOut,
  radIn,
  rawDelta,
}: DrainParams) {
  let powerRate = 0;
  let fuelRate = 0;

  // Propulsion consumes propellant only; ship power is drained by systems (e.g. scanners).
  // Main forward burn uses full thrust scale. RCS/reverse are capped and very cheap.
  const thrustScale = thrustMultiplier.current;
  const cappedRcsScale = Math.min(thrustScale, RCS_THRUST_MULTIPLIER_CAP);
  const mainAxes = fwd ? 1 : 0;
  const rcsAxes =
    (rev ? 1 : 0) +
    (yawLeft ? 1 : 0) +
    (yawRight ? 1 : 0) +
    (strL ? 1 : 0) +
    (strR ? 1 : 0) +
    (radOut ? 1 : 0) +
    (radIn ? 1 : 0);

  const burnRate =
    mainAxes * thrustScale * FUEL_BURN_RATE +
    rcsAxes * cappedRcsScale * FUEL_BURN_RATE * RCS_FUEL_RATE_FACTOR;

  if (burnRate > 0) {
    fuelRate -= burnRate;
    setFuel(Math.max(0, fuel - burnRate * rawDelta));
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
