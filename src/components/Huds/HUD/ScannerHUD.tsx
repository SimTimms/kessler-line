import { useState, useRef, useEffect } from 'react';
import { Flashlight, Magnet, HardDrive, Radar, AudioLines, Radiation } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { HudButton } from '../HudButton';
import { proximityScanRangeRef } from '../../../context/ProximityScan';
import { magneticScanRangeRef } from '../../../context/MagneticScan';
import { driveSignatureRangeRef } from '../../../context/DriveSignatureScan';
import { radioRangeRef } from '../../../context/RadioState';
import { shipPosRef } from '../../../context/ShipPos';
import './ScannerHUD.css';
import {
  SCAN_RANGES,
  DRIVE_SIGNATURE_RANGES,
  MAGNETIC_RANGES,
  RADIO_RANGES,
  RADIATION_RANGES,
} from '../../../config/scanRanges';
import { radiationOnRef, radiationRangeRef } from '../../../context/RadiationScan';
// World-unit scan range for each power level (index = level - 1); level 1 = off

export const ScannerHUDElements = {
  SPOTLIGHT: 'spotlight',
  MAGNET: 'magnet',
  DRIVE: 'drive',
  PROXIMITY: 'proximity',
  RADIO: 'radio',
  RADIATION: 'radiation',
} as const;

export type ScannerHUDElementId = (typeof ScannerHUDElements)[keyof typeof ScannerHUDElements];
interface ScannerHUDProps {
  spotlightOn: boolean;
  setSpotlightOn: (on: boolean) => void;
  spotlightOnRef: React.RefObject<boolean>;
  magneticOn: boolean;
  setMagneticOn: (on: boolean) => void;
  magneticOnRef: React.RefObject<boolean>;
  driveSignatureOn: boolean;
  setDriveSignatureOn: (on: boolean) => void;
  driveSignatureOnRef: React.RefObject<boolean>;
  proximity: boolean;
  setProximity: (on: boolean) => void;
  proximityScanOnRef: React.RefObject<boolean>;
  radioOn: boolean;
  setRadioOn: (on: boolean) => void;
  radioOnRef: React.RefObject<boolean>;
  tutorialMagneticFocus?: boolean;
  focusElements?: string[];
  disableElements?: string[];
}

interface ButtonDef {
  id: string;
  icon: LucideIcon;
  initialPower: number;
  isActive: boolean;
  /** Called whenever power changes. `on` = level > 1. */
  onSideEffect: (on: boolean, level: number) => void;
}

export const ScannerHUD = ({
  spotlightOn,
  setSpotlightOn,
  spotlightOnRef,
  magneticOn,
  setMagneticOn,
  magneticOnRef,
  driveSignatureOn,
  setDriveSignatureOn,
  driveSignatureOnRef,
  proximity,
  setProximity,
  proximityScanOnRef,
  radioOn,
  setRadioOn,
  radioOnRef,
  tutorialMagneticFocus = false,
  focusElements = [],
  disableElements = [],
}: ScannerHUDProps) => {
  const [radiationOn, setRadiationOn] = useState(false);

  // Coords display — mutated directly to avoid re-renders
  const coordsRef = useRef<HTMLDivElement>(null!);
  useEffect(() => {
    let raf: number;
    const tick = () => {
      if (coordsRef.current) {
        const { x, z } = shipPosRef.current;
        coordsRef.current.textContent = `${Math.round(x)}, ${Math.round(z)}`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Button definitions ────────────────────────────────────────────────────
  // To add a new HUD button, append an entry here. No other changes needed.
  const buttonDefs: ButtonDef[] = [
    {
      id: ScannerHUDElements.SPOTLIGHT,
      icon: Flashlight,
      initialPower: 1,
      isActive: spotlightOn,
      onSideEffect: (on) => {
        spotlightOnRef.current = on;
        setSpotlightOn(on);
      },
    },
    {
      id: ScannerHUDElements.MAGNET,
      icon: Magnet,
      initialPower: 1,
      isActive: magneticOn,
      onSideEffect: (on, level) => {
        magneticOnRef.current = on;
        magneticScanRangeRef.current = MAGNETIC_RANGES[level - 1];
        setMagneticOn(on);
        if (level === 5) window.dispatchEvent(new CustomEvent('MagnetScannerMaxed'));
        if (!on) window.dispatchEvent(new CustomEvent('MagnetScannerOff'));
      },
    },
    {
      id: ScannerHUDElements.DRIVE,
      icon: HardDrive,
      initialPower: 1,
      isActive: driveSignatureOn,
      onSideEffect: (on, level) => {
        driveSignatureOnRef.current = on;
        driveSignatureRangeRef.current = DRIVE_SIGNATURE_RANGES[level - 1];
        setDriveSignatureOn(on);
        if (level === 5) window.dispatchEvent(new CustomEvent('DriveSignatureAt5'));
      },
    },
    {
      id: ScannerHUDElements.PROXIMITY,
      icon: Radar,
      initialPower: 1,
      isActive: proximity,
      onSideEffect: (on, level) => {
        proximityScanOnRef.current = on;
        proximityScanRangeRef.current = SCAN_RANGES[level - 1];
        setProximity(on);
      },
    },
    {
      id: ScannerHUDElements.RADIO,
      icon: AudioLines,
      initialPower: 1,
      isActive: radioOn,
      onSideEffect: (on, level) => {
        radioOnRef.current = on;
        radioRangeRef.current = RADIO_RANGES[level - 1] * 5;
        setRadioOn(on);
      },
    },
    {
      id: ScannerHUDElements.RADIATION,
      icon: Radiation,
      initialPower: 1,
      isActive: radiationOn,
      onSideEffect: (on, level) => {
        radiationOnRef.current = on;
        radiationRangeRef.current = RADIATION_RANGES[level - 1];
        setRadiationOn(on);
      },
    },
  ];

  // ── Single shared power state + last-power memory ─────────────────────────
  const [powers, setPowers] = useState<Record<string, number>>(() =>
    Object.fromEntries(buttonDefs.map((b) => [b.id, b.initialPower]))
  );
  // Stores the last non-off level so toggling back on restores it; starts at 3
  const lastPowers = useRef<Record<string, number>>(
    Object.fromEntries(buttonDefs.map((b) => [b.id, 3]))
  );

  const handlePower = (id: string, level: number, onSideEffect: ButtonDef['onSideEffect']) => {
    if (level > 1) lastPowers.current[id] = level;
    setPowers((prev) => ({ ...prev, [id]: level }));
    onSideEffect(level > 1, level);
  };

  return (
    <div className="button-panel">
      {buttonDefs.map(({ id, icon, isActive, onSideEffect }) => (
        <div
          className={`flex-column blue ${disableElements.includes(id) ? 'hud-button-disabled' : ''}`}
        >
          <div className="power-hud-label">{id.toUpperCase()}</div>
          <HudButton
            key={id}
            icon={icon}
            name={''}
            isActive={isActive}
            power={powers[id]}
            highlight={focusElements.includes(id)}
            disabled={disableElements.includes(id)}
            onClickEvent={() =>
              handlePower(id, powers[id] > 1 ? 1 : lastPowers.current[id], onSideEffect)
            }
            onPowerChange={(level) => handlePower(id, level, onSideEffect)}
          />
        </div>
      ))}
    </div>
  );
};
