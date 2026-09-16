import {
  shipVelocity,
  setHullIntegrity,
  setFuel,
  setO2,
  setShipCrew,
  shipDestroyed,
  mainEngineDisabled,
  resetAmmo,
} from '../context/ShipState';
import { resetCameraMode } from '../context/CameraMode';
import { SHIP_CREW_CAPACITY } from '../config/dockTransferConfig';
import { shipPosRef } from '../context/ShipPos';

export function resetShipState(forTutorial = false) {
  shipVelocity.set(0, 0, 0);
  shipPosRef.current.set(0, 0, 0);
  setHullIntegrity(100);
  setFuel(100);
  setO2(100);
  setShipCrew(forTutorial ? SHIP_CREW_CAPACITY : 1);
  resetAmmo();
  resetCameraMode('free');
  shipDestroyed.current = false;
  mainEngineDisabled.reverseA.current = false;
  mainEngineDisabled.reverseB.current = false;
}
