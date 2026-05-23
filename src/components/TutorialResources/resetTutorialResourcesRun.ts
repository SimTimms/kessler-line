import { clearResourceRates } from '../../context/ResourceRates';
import { spotlightOnRef } from '../../context/SpotlightState';
import { shipPosRef } from '../../context/ShipPos';
import {
  radiationExposureRef,
  radiationOnRef,
  radiationRangeRef,
} from '../../context/RadiationScan';
import { tutorialStepRef } from '../../context/TutorialState';
import {
  shipVelocity,
  setHullIntegrity,
  setFuel,
  setO2,
  setPower,
  shipDestroyed,
  mainEngineDisabled,
} from '../../context/ShipState';

/** Restores ship + tutorial progress after radiation death in the resources tutorial. */
export function resetTutorialResourcesRun() {
  shipVelocity.set(0, 0, 20);
  shipPosRef.current.set(0, 0, 0);
  setHullIntegrity(100);
  setFuel(100);
  setO2(100);
  setPower(100);
  shipDestroyed.current = false;
  mainEngineDisabled.reverseA.current = false;
  mainEngineDisabled.reverseB.current = false;
  radiationExposureRef.current = 0;
  radiationOnRef.current = false;
  radiationRangeRef.current = 0;
  spotlightOnRef.current = false;
  clearResourceRates();
  tutorialStepRef.current = 0;
  window.dispatchEvent(new CustomEvent('RepairShip'));
  window.dispatchEvent(new CustomEvent('TutorialShipReset'));
}
