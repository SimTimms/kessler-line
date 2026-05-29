import { memo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import PowerHUD from '../PowerHUD/PowerHUD';
import { NavHUD } from '../NavHUD/NavHUD';
import { ScannerHUD } from '../HUD/ScannerHUD';
import ContactsHUD from '../../ContactsHUD/ContactsHUD';
import DockTransferHUD from '../DockTransferHUD/DockTransferHUD';
import './HelmetHUD.css';

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
}

const HelmetHUD = memo(function HelmetHUD({
  disableElements = [],
  focusElements = [],
  sceneRadioContactsOnly = false,
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
        <NavHUD layout="helmet" disableElements={disableElements} focusElements={focusElements} />
        <ScannerHUD
          layout="helmet"
          focusElements={focusElements}
          disableElements={disableElements}
          {...scannerProps}
        />
      </div>
      <ContactsHUD sceneRadioContactsOnly={sceneRadioContactsOnly} />
      <DockTransferHUD />
    </div>
  );
});

export default HelmetHUD;
