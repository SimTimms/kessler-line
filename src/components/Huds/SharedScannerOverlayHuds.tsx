import MagneticHUD from './MagneticHUD';
import DriveSignatureHUD from './DriveSignatureHUD';
import ProximityHUD from '../Proximity/ProximityHUD';
import RadiationHUD from '../RadiationHUD';

interface SharedScannerOverlayHudsProps {
  magneticOn: boolean;
  driveSignatureOn: boolean;
  proximityOn: boolean;
}

/**
 * Shared scanner overlay HUD stack.
 * Keep cross-scene scanner overlay behavior in one place.
 */
export default function SharedScannerOverlayHuds({
  magneticOn,
  driveSignatureOn,
  proximityOn,
}: SharedScannerOverlayHudsProps) {
  return (
    <>
      {magneticOn && <MagneticHUD />}
      {driveSignatureOn && <DriveSignatureHUD />}
      {proximityOn && <ProximityHUD />}
      <RadiationHUD />
    </>
  );
}
