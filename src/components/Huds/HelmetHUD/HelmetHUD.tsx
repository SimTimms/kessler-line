import { memo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import PowerHUD from '../PowerHUD/PowerHUD';
import { NavHUD, type TutorialTargetDef } from '../NavHUD/NavHUD';
import { ScannerHUD } from '../HUD/ScannerHUD';
import ContactsHUD from '../../ContactsHUD/ContactsHUD';
import DockTransferHUD from '../DockTransferHUD/DockTransferHUD';
import ShipControlsHUD from '../ShipControlsHUD/ShipControlsHUD';
import './HelmetHUD.css';
import '../ShipControlsHUD/ShipControlsHUD.css';

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
}

const HelmetHUD = memo(function HelmetHUD({
  disableElements = [],
  focusElements = [],
  sceneRadioContactsOnly = false,
  customPlanetaryTargets,
  thrustLevel,
  setThrustLevel,
  ...scannerProps
}: HelmetHUDProps) {
  return (
    <div className="helmet-hud">
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
        <div className="helmet-scanner-controls-row">
          <ScannerHUD
            layout="helmet"
            focusElements={focusElements}
            disableElements={disableElements}
            {...scannerProps}
          />
          <ShipControlsHUD thrustLevel={thrustLevel} setThrustLevel={setThrustLevel} />
        </div>
      </div>
      <ContactsHUD sceneRadioContactsOnly={sceneRadioContactsOnly} />
      <DockTransferHUD />
    </div>
  );
});

export default HelmetHUD;
