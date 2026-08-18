import { memo, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import PowerHUD, { HelmetCargoHUD } from '../PowerHUD/PowerHUD';
import { NavHUD, type TutorialTargetDef } from '../NavHUD/NavHUD';
import { ScannerHUD, type ScannerHUDElementId } from '../HUD/ScannerHUD';
import CommsHUD from '../CommsHUD/CommsHUD';
import AlertsHUD from '../AlertsHUD/AlertsHUD';
import DockTransferHUD from '../DockTransferHUD/DockTransferHUD';
import ShipControlsHUD from '../ShipControlsHUD/ShipControlsHUD';
import CameraHUD from '../CameraHUD/CameraHUD';
import FlightControlsHUD from '../FlightControlsHUD/FlightControlsHUD';
import EventLogHUD from '../EventLogHUD/EventLogHUD';
import DamageControlHUD from '../DamageControlHUD/DamageControlHUD';
import { power as shipPower } from '../../../context/ShipState';
import {
  EVENT_SHIP_POWER_DEPLETED,
  EVENT_SHIP_POWER_RESTORED,
} from '../../../context/shipPowerSystems';
import '../Hud.css';
import './HelmetHUD.css';
import '../ShipControlsHUD/ShipControlsHUD.css';
import SandboxHtmlMiniMap from '../../../components/Minimap/SandboxHtmlMiniMap';
import { KEY_TOGGLE_MINIMAP } from '../../../config/keybindings';

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
  const [showMinimap, setShowMinimap] = useState(true);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== KEY_TOGGLE_MINIMAP || e.repeat) return;
      e.preventDefault();
      setShowMinimap((v) => !v);
    };
    const onOpenMinimap = () => setShowMinimap(true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('open-minimap', onOpenMinimap);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('open-minimap', onOpenMinimap);
    };
  }, []);
  return (
    <div
      className={`helmet-hud${powerOnline ? '' : ' helmet-hud--powerless'}`}
      data-power-online={powerOnline ? 'true' : 'false'}
    >
      <div className="helmet-top-bar">
        <PowerHUD layout="helmet" disableElements={disableElements} focusElements={focusElements} />
      </div>
      <div className="helmet-left-stack">
        <DamageControlHUD />
        <HelmetCargoHUD />
      </div>

      <div className="helmet-center-stack">
        <div className="helmet-minimap-anchor">
          <CameraHUD />
          <SandboxHtmlMiniMap onClose={() => setShowMinimap(false)} showSolarSystem />
        </div>
        <EventLogHUD />
        <ScannerHUD
          layout="helmet"
          focusElements={focusElements}
          disableElements={disableElements}
          initialPowers={scannerInitialPowers}
          {...scannerProps}
        />
        <CommsHUD
          radioOn={radioOn}
          setRadioOn={setRadioOn}
          radioOnRef={radioOnRef}
          disableElements={disableElements}
          focusElements={focusElements}
          initialRadioPower={scannerInitialPowers?.radio}
          sceneRadioContactsOnly={sceneRadioContactsOnly}
        />
        <NavHUD
          layout="helmet"
          disableElements={disableElements}
          focusElements={focusElements}
          customPlanetaryTargets={customPlanetaryTargets}
        />
      </div>
      <div className="helmet-right-stack">
        <ShipControlsHUD thrustLevel={thrustLevel} setThrustLevel={setThrustLevel} />
      </div>
      <AlertsHUD />
      <FlightControlsHUD />
      <DockTransferHUD />
    </div>
  );
});

export default HelmetHUD;
