import { memo, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import PowerHUD from '../PowerHUD/PowerHUD';
import { NavHUD, type TutorialTargetDef } from '../NavHUD/NavHUD';
import { ScannerHUD, type ScannerHUDElementId } from '../HUD/ScannerHUD';
import CommsHUD from '../CommsHUD/CommsHUD';
import AlertsHUD from '../AlertsHUD/AlertsHUD';
import DockTransferHUD from '../DockTransferHUD/DockTransferHUD';
import ShipControlsHUD from '../ShipControlsHUD/ShipControlsHUD';
import { power as shipPower } from '../../../context/ShipState';
import {
  EVENT_SHIP_POWER_DEPLETED,
  EVENT_SHIP_POWER_RESTORED,
} from '../../../context/shipPowerSystems';
import './HelmetHUD.css';
import '../ShipControlsHUD/ShipControlsHUD.css';

function useShipPowerOnline(): boolean {
  const [online, setOnline] = useState(() => shipPower > 0);
  useEffect(() => {
    const onDepleted = () => setOnline(false);
    const onRestored = () => setOnline(true);
    window.addEventListener(EVENT_SHIP_POWER_DEPLETED, onDepleted);
    window.addEventListener(EVENT_SHIP_POWER_RESTORED, onRestored);
    setOnline(shipPower > 0);
    return () => {
      window.removeEventListener(EVENT_SHIP_POWER_DEPLETED, onDepleted);
      window.removeEventListener(EVENT_SHIP_POWER_RESTORED, onRestored);
    };
  }, []);
  return online;
}

export interface HelmetHUDProps {
  spotlightOn: boolean;
  setSpotlightOn: Dispatch<SetStateAction<boolean>>;
  spotlightOnRef: React.RefObject<boolean>;
  magneticOn: boolean;
  setMagneticOn: Dispatch<SetStateAction<boolean>>;
  magneticOnRef: React.RefObject<boolean>;
  driveSignatureOn: boolean;
  setDriveSignatureOn: Dispatch<SetStateAction<boolean>>;
  driveSignatureOnRef: React.RefObject<boolean>;
  proximity: boolean;
  setProximity: Dispatch<SetStateAction<boolean>>;
  proximityScanOnRef: React.RefObject<boolean>;
  radioOn: boolean;
  setRadioOn: Dispatch<SetStateAction<boolean>>;
  radioOnRef: React.RefObject<boolean>;
  disableElements?: string[];
  focusElements?: string[];
  /** Contacts HUD: only show radio sources present in the scene. */
  sceneRadioContactsOnly?: boolean;
  /** Replace default solar-system nav targets (e.g. orbital tutorial: Luna + Sol only). */
  customPlanetaryTargets?: TutorialTargetDef[];
  thrustLevel?: number;
  setThrustLevel?: Dispatch<SetStateAction<number>>;
  scannerInitialPowers?: Partial<Record<ScannerHUDElementId, number>>;
}

const HelmetHUD = memo(function HelmetHUD({
  disableElements = [],
  focusElements = [],
  sceneRadioContactsOnly = false,
  customPlanetaryTargets,
  thrustLevel,
  setThrustLevel,
  scannerInitialPowers,
  radioOn,
  setRadioOn,
  radioOnRef,
  ...scannerProps
}: HelmetHUDProps) {
  const powerOnline = useShipPowerOnline();

  return (
    <div
      className={`helmet-hud${powerOnline ? '' : ' helmet-hud--powerless'}`}
      data-power-online={powerOnline ? 'true' : 'false'}
    >
      <div className="helmet-sensor-stack">
        <PowerHUD
          layout="helmet"
          disableElements={disableElements}
          focusElements={focusElements}
        />
        <NavHUD
          layout="helmet"
          disableElements={disableElements}
          focusElements={focusElements}
          customPlanetaryTargets={customPlanetaryTargets}
        />
        <ScannerHUD
          layout="helmet"
          focusElements={focusElements}
          disableElements={disableElements}
          initialPowers={scannerInitialPowers}
          {...scannerProps}
        />
      </div>
      <ShipControlsHUD thrustLevel={thrustLevel} setThrustLevel={setThrustLevel} />
      <CommsHUD
        radioOn={radioOn}
        setRadioOn={setRadioOn}
        radioOnRef={radioOnRef}
        disableElements={disableElements}
        focusElements={focusElements}
        initialRadioPower={scannerInitialPowers?.radio}
        sceneRadioContactsOnly={sceneRadioContactsOnly}
      />
      <AlertsHUD />
      <DockTransferHUD />
    </div>
  );
});

export default HelmetHUD;
