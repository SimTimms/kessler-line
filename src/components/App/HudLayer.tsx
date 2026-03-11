import { memo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import PowerHUD from '../PowerHUD';
import MagneticHUD from '../MagneticHUD';
import DriveSignatureHUD from '../DriveSignatureHUD';
import ProximityHUD from '../ProximityHUD';
import MiniMap from '../MiniMap';
import { HUD } from '../HUD/HUD';
import { NavHUD } from '../NavHUD/NavHUD';
import { RadioHUD } from '../RadioHUD/RadioHUD';
import { spotlightOnRef } from '../LaserRay';
import { magneticOnRef } from '../../context/MagneticScan';
import { driveSignatureOnRef } from '../../context/DriveSignatureScan';
import { proximityScanOnRef } from '../../context/ProximityScan';
import { radioOnRef } from '../../context/RadioState';

interface HudLayerProps {
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
  showMinimap: boolean;
}

const HudLayer = memo(function HudLayer({
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
  showMinimap,
}: HudLayerProps) {
  return (
    <>
      <PowerHUD />
      <MagneticHUD />
      <DriveSignatureHUD />
      <ProximityHUD />
      {showMinimap && <MiniMap />}

      <HUD
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
      />
      <NavHUD />
      <RadioHUD />
    </>
  );
});

export default HudLayer;
