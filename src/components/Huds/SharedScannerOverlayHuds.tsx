import MagneticHUD from './MagneticHUD';
import DriveSignatureHUD from './DriveSignatureHUD';
import ProximityHUD from '../Proximity/ProximityHUD';
import RadiationHUD from '../RadiationHUD';

/**
 * Shared scanner overlay HUD stack.
 * Keep cross-scene scanner overlay behavior in one place.
 */
export default function SharedScannerOverlayHuds() {
  return (
    <>
      <MagneticHUD />
      <DriveSignatureHUD />
      <ProximityHUD />
      <RadiationHUD />
    </>
  );
}
