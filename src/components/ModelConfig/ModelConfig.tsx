import { useEffect, useState } from 'react';
import AppContainer from '../App/AppContainer';
import ModelConfigScene from './ModelConfigScene';
import { resetScannerRefs } from '../../context/resetScannerRefs';
import { ScannerHUD, ScannerHUDElements } from '../Huds/HUD/ScannerHUD';
import SharedScannerOverlayHuds from '../Huds/SharedScannerOverlayHuds';
import ContactsHUD from '../ContactsHUD/ContactsHUD';
import DockTransferHUD from '../Huds/DockTransferHUD/DockTransferHUD';
import { clearNavTarget } from '../../context/NavTarget';
import { clearSelectedTarget } from '../../context/TargetSelection';
import { disableAutopilot } from '../../context/AutopilotState';
import { getScannerRange } from '../../config/scanRanges';
import { magneticOnRef, magneticScanRangeRef } from '../../context/MagneticScan';
import { driveSignatureOnRef, driveSignatureRangeRef } from '../../context/DriveSignatureScan';
import { proximityScanOnRef, proximityScanRangeRef } from '../../context/ProximityScan';
import { radioOnRef, radioRangeRef } from '../../context/RadioState';
import { spotlightOnRef } from '../../context/SpotlightState';
import { setNavHudEnabled } from '../../context/NavHud';
import {
  EVENT_COLLISION_TEST_BURST,
  EVENT_COLLISION_TEST_FIRE,
  EVENT_COLLISION_TEST_SET_MODE,
} from '../Debug/CollisionPhysicsTestRig';

const MODEL_CONFIG_SCANNER_INITIAL_POWERS = {
  [ScannerHUDElements.DRIVE]: 2,
  [ScannerHUDElements.PROXIMITY]: 2,
  [ScannerHUDElements.MAGNET]: 2,
  [ScannerHUDElements.RADIO]: 2,
  [ScannerHUDElements.RADIATION]: 1,
  [ScannerHUDElements.SPOTLIGHT]: 1,
} as const;

const MODEL_CONFIG_DISABLED_HUD_ELEMENTS = [
  ScannerHUDElements.SPOTLIGHT,
  ScannerHUDElements.RADIATION,
] as const;

function applyModelConfigScannerDefaults(): void {
  spotlightOnRef.current = false;
  magneticOnRef.current = true;
  magneticScanRangeRef.current = getScannerRange(
    'magnet',
    MODEL_CONFIG_SCANNER_INITIAL_POWERS.magnet
  );
  driveSignatureOnRef.current = true;
  driveSignatureRangeRef.current = getScannerRange(
    'drive',
    MODEL_CONFIG_SCANNER_INITIAL_POWERS.drive
  );
  proximityScanOnRef.current = true;
  proximityScanRangeRef.current = getScannerRange(
    'proximity',
    MODEL_CONFIG_SCANNER_INITIAL_POWERS.proximity
  );
  radioOnRef.current = true;
  radioRangeRef.current = getScannerRange('radio', MODEL_CONFIG_SCANNER_INITIAL_POWERS.radio);
}

export default function ModelConfig() {
  const [spotlightOn, setSpotlightOn] = useState(false);
  const [magneticOn, setMagneticOn] = useState(true);
  const [driveSignatureOn, setDriveSignatureOn] = useState(true);
  const [proximity, setProximity] = useState(true);
  const [radioOn, setRadioOn] = useState(true);
  const [collisionTestActive, setCollisionTestActive] = useState(false);
  const [collisionMeshVisible, setCollisionMeshVisible] = useState(false);

  useEffect(() => {
    clearNavTarget();
    clearSelectedTarget();
    disableAutopilot();
    setNavHudEnabled(false);
    resetScannerRefs();
    applyModelConfigScannerDefaults();
  }, []);

  return (
    <AppContainer>
      <ModelConfigScene showCollisionDebug={collisionMeshVisible} />
      <div
        style={{
          position: 'fixed',
          top: 144,
          left: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '8px 10px',
          border: '1px solid rgba(255, 85, 85, 0.45)',
          background: 'rgba(10, 0, 0, 0.72)',
          color: 'rgba(255, 200, 200, 0.95)',
          fontFamily: 'monospace',
          fontSize: 11,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          pointerEvents: 'auto',
          zIndex: 9999,
        }}
      >
        <div>Collision Test {collisionTestActive ? 'ON' : 'OFF'}</div>
        <div>Collision Mesh {collisionMeshVisible ? 'ON' : 'OFF'}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            style={{
              border: '1px solid rgba(255, 120, 120, 0.55)',
              background: 'rgba(35, 0, 0, 0.8)',
              color: 'rgba(255, 210, 210, 0.95)',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: 10,
              fontFamily: 'inherit',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
            onClick={() => {
              const next = !collisionTestActive;
              setCollisionTestActive(next);
              window.dispatchEvent(
                new CustomEvent(EVENT_COLLISION_TEST_SET_MODE, { detail: { active: next } })
              );
            }}
          >
            {collisionTestActive ? 'Disable' : 'Enable'}
          </button>
          <button
            type="button"
            style={{
              border: '1px solid rgba(255, 120, 120, 0.55)',
              background: 'rgba(35, 0, 0, 0.8)',
              color: 'rgba(255, 210, 210, 0.95)',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: 10,
              fontFamily: 'inherit',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
            onClick={() => {
              const next = !collisionMeshVisible;
              setCollisionMeshVisible(next);
            }}
          >
            Mesh
          </button>
          <button
            type="button"
            style={{
              border: '1px solid rgba(255, 120, 120, 0.55)',
              background: 'rgba(35, 0, 0, 0.8)',
              color: 'rgba(255, 210, 210, 0.95)',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: 10,
              fontFamily: 'inherit',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
            onClick={() => {
              window.dispatchEvent(new CustomEvent(EVENT_COLLISION_TEST_FIRE));
              setCollisionTestActive(true);
            }}
          >
            Fire
          </button>
          <button
            type="button"
            style={{
              border: '1px solid rgba(255, 120, 120, 0.55)',
              background: 'rgba(35, 0, 0, 0.8)',
              color: 'rgba(255, 210, 210, 0.95)',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: 10,
              fontFamily: 'inherit',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
            onClick={() => {
              window.dispatchEvent(new CustomEvent(EVENT_COLLISION_TEST_BURST));
              setCollisionTestActive(true);
            }}
          >
            Burst
          </button>
        </div>
      </div>
      <ScannerHUD
        spotlightOn={spotlightOn}
        setSpotlightOn={setSpotlightOn}
        magneticOn={magneticOn}
        setMagneticOn={setMagneticOn}
        driveSignatureOn={driveSignatureOn}
        setDriveSignatureOn={setDriveSignatureOn}
        proximity={proximity}
        setProximity={setProximity}
        radioOn={radioOn}
        setRadioOn={setRadioOn}
        spotlightOnRef={spotlightOnRef}
        magneticOnRef={magneticOnRef}
        driveSignatureOnRef={driveSignatureOnRef}
        proximityScanOnRef={proximityScanOnRef}
        radioOnRef={radioOnRef}
        disableElements={[...MODEL_CONFIG_DISABLED_HUD_ELEMENTS]}
        initialPowers={MODEL_CONFIG_SCANNER_INITIAL_POWERS}
      />
      <ContactsHUD sceneRadioContactsOnly />
      <DockTransferHUD />
      <SharedScannerOverlayHuds />
    </AppContainer>
  );
}
