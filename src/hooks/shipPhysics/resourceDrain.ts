import { resourceRateRefs } from '../../context/ResourceRates';
import {
  o2DrainRateForCrew,
  FUEL_BURN_RATE,
  HULL_BREACH_START_THRESHOLD,
  HULL_BREACH_O2_DRAIN_MULTIPLIER,
} from '../../config/damageConfig';
import { getTotalScannerPowerDrain } from '../../config/scanRanges';
import {
  setVesselFuel,
  setVesselO2,
  setVesselPower,
  type VesselRuntimeState,
} from '../../context/VesselStateStore';
import { PLAYER_VESSEL_ID } from '../../context/PlayerShipState';
import { setFuel, setO2, setPower } from '../../context/ShipState';
import { pushEventLog } from '../../components/Huds/EventLogHUD/EventLogStore';

interface DrainParams {
  vesselId: string;
  vesselState: VesselRuntimeState;
  trackHudRates?: boolean;
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
let powerLowFired = false;
let fuelLowFired = false;
let o2LowFired = false;

const RESOURCE_LOW_THRESHOLD = 20;

const RCS_FUEL_RATE_FACTOR = 0.01;
const RCS_THRUST_MULTIPLIER_CAP = 2;

export function applyResourceDrain({
  vesselId,
  vesselState,
  trackHudRates = true,
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
  const thrustScale = vesselState.thrustMultiplier.current;
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
    const nextFuel = Math.max(0, vesselState.fuel - burnRate * rawDelta);
    if (vesselId === PLAYER_VESSEL_ID) {
      setFuel(nextFuel);
    } else {
      setVesselFuel(vesselId, nextFuel);
    }
  }
  const scannerDrain = getTotalScannerPowerDrain();
  if (scannerDrain > 0) {
    powerRate -= scannerDrain;
    const nextPower = Math.max(0, vesselState.power - scannerDrain * rawDelta);
    if (vesselId === PLAYER_VESSEL_ID) {
      setPower(nextPower);
    } else {
      setVesselPower(vesselId, nextPower);
    }
  }

  const breachO2Multiplier =
    vesselState.hullIntegrity <= HULL_BREACH_START_THRESHOLD
      ? HULL_BREACH_O2_DRAIN_MULTIPLIER
      : 1;
  const o2Drain = o2DrainRateForCrew(vesselState.shipCrew) * breachO2Multiplier;

  if (trackHudRates) {
    resourceRateRefs.power.current = powerRate;
    resourceRateRefs.fuel.current = fuelRate;
    resourceRateRefs.o2.current = -o2Drain;
  }

  const newO2 = Math.max(0, vesselState.o2 - o2Drain * rawDelta);
  if (newO2 === 0 && vesselState.o2 > 0 && !o2DepletedFired) {
    o2DepletedFired = true;
    window.dispatchEvent(new CustomEvent('O2Depleted'));
  }
  if (vesselId === PLAYER_VESSEL_ID) {
    setO2(newO2);
  } else {
    setVesselO2(vesselId, newO2);
  }

  // Low-resource event log entries (player only, fires once per crossing)
  if (vesselId === PLAYER_VESSEL_ID) {
    if (vesselState.power <= RESOURCE_LOW_THRESHOLD && !powerLowFired) {
      powerLowFired = true;
      pushEventLog('res', 'POWER LOW - FIND POWER SOURCE');
    } else if (vesselState.power > RESOURCE_LOW_THRESHOLD) {
      powerLowFired = false;
    }

    if (vesselState.fuel <= RESOURCE_LOW_THRESHOLD && !fuelLowFired) {
      fuelLowFired = true;
      pushEventLog('res', 'FUEL LOW - FIND FUEL SOURCE');
    } else if (vesselState.fuel > RESOURCE_LOW_THRESHOLD) {
      fuelLowFired = false;
    }

    if (newO2 <= RESOURCE_LOW_THRESHOLD && !o2LowFired) {
      o2LowFired = true;
      pushEventLog('res', 'O2 LOW - FIND O2 SOURCE');
    } else if (newO2 > RESOURCE_LOW_THRESHOLD) {
      o2LowFired = false;
    }
  }
}
