import { memo, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { hudShakeOffset } from '../../context/HudShake';
import PowerHUD from '../PowerHUD/PowerHUD';
import MagneticHUD from '../MagneticHUD';
import DriveSignatureHUD from '../DriveSignatureHUD';
import RadiationHUD from '../RadiationHUD';
import ProximityHUD from '../Proximity/ProximityHUD';
import MiniMap from '../Minimap/MiniMap';
import { HUD } from '../HUD/HUD';
import { NavHUD } from '../NavHUD/NavHUD';
import CinematicOverlay from '../Cinematic/CinematicOverlay';
import ContactsHUD from '../ContactsHUD/ContactsHUD';
import RadioChatterStream from '../Radio/RadioChatterStream';
import { spotlightOnRef } from '../Combat/LaserRay';
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
  useEffect(() => {
    let raf: number;
    const tick = () => {
      const { x, y } = hudShakeOffset;
      document.body.style.transform =
        x === 0 && y === 0 ? '' : `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.transform = '';
    };
  }, []);

  return (
    <>
      <PowerHUD />
      <MagneticHUD />
      <DriveSignatureHUD />
      <ProximityHUD />
      <RadiationHUD />
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
      <ContactsHUD />
      <RadioChatterStream />
    </>
  );
});

export default HudLayer;
