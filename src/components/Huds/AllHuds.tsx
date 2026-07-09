import HelmetHUD from './HelmetHUD/HelmetHUD';
import SharedScannerOverlayHuds from './SharedScannerOverlayHuds';
import { spotlightOnRef } from '../../context/SpotlightState';
import { magneticOnRef } from '../../context/MagneticScan';
import { driveSignatureOnRef } from '../../context/DriveSignatureScan';
import { proximityScanOnRef } from '../../context/ProximityScan';
import { radioOnRef } from '../../context/RadioState';
import { SANDBOX_PLANETARY_NAV_TARGETS } from '../../config/planetaryNavTargets';
import type { Dispatch, SetStateAction } from 'react';
import type { ScannerHUDElementId } from './HUD/ScannerHUD';

interface AllHudsProps {
  spotlightOn: boolean;
  setSpotlightOn: Dispatch<SetStateAction<boolean>>;
  magneticOn: boolean;
  setMagneticOn: Dispatch<SetStateAction<boolean>>;
  driveSignatureOn: boolean;
  setDriveSignatureOn: Dispatch<SetStateAction<boolean>>;
  proximity: boolean;
  setProximity: Dispatch<SetStateAction<boolean>>;
  radioOn: boolean;
  setRadioOn: Dispatch<SetStateAction<boolean>>;
  activeHudElementsState?: string[];
  disabledHudElementsState?: string[];
  scannerInitialPowers?: Partial<Record<ScannerHUDElementId, number>>;
}

export default function AllHuds({
  spotlightOn,
  setSpotlightOn,
  magneticOn,
  setMagneticOn,
  driveSignatureOn,
  setDriveSignatureOn,
  proximity,
  setProximity,
  radioOn,
  setRadioOn,
  activeHudElementsState,
  disabledHudElementsState,
  scannerInitialPowers,
}: AllHudsProps) {
  return (
    <div>
      <HelmetHUD
        spotlightOn={spotlightOn}
        setSpotlightOn={setSpotlightOn}
        spotlightOnRef={spotlightOnRef}
        magneticOn={magneticOn}
        setMagneticOn={setMagneticOn}
        magneticOnRef={magneticOnRef}
        driveSignatureOn={driveSignatureOn}
        setDriveSignatureOn={setDriveSignatureOn}
        driveSignatureOnRef={driveSignatureOnRef}
        proximity={proximity}
        setProximity={setProximity}
        proximityScanOnRef={proximityScanOnRef}
        radioOn={radioOn}
        setRadioOn={setRadioOn}
        radioOnRef={radioOnRef}
        focusElements={activeHudElementsState}
        disableElements={disabledHudElementsState}
        scannerInitialPowers={scannerInitialPowers}
        sceneRadioContactsOnly
        customPlanetaryTargets={SANDBOX_PLANETARY_NAV_TARGETS}
      />
      <SharedScannerOverlayHuds />
    </div>
  );
}
