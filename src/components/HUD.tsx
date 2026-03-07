import { useState, useRef, useEffect } from 'react';
import { Flashlight, Magnet, HardDrive, Radar } from 'lucide-react';
import { HudButton } from './HudButton';
import { SOLAR_SYSTEM_PLANETS } from '../config/worldConfig';
import { navTargetPosRef, navTargetIdRef } from '../context/NavTarget';
import { proximityScanRangeRef } from '../context/ProximityScan';
import { magneticScanRangeRef } from '../context/MagneticScan';
import { driveSignatureRangeRef } from '../context/DriveSignatureScan';
import { shipPosRef } from '../context/ShipPos';

const NAV_TARGETS = SOLAR_SYSTEM_PLANETS;

// World-unit scan range for each power level (index = level - 1); level 1 = off
const SCAN_RANGES = [0, 500, 1000, 1500, 2000];

interface HUDProps {
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
}

export const HUD = ({
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
}: HUDProps) => {
  const [targetId, setTargetId] = useState(navTargetIdRef.current);
  // Power levels 1–5; 1 = off, 2–5 = increasing power
  // Spotlight starts on (matches spotlightOn initial true in App.tsx)
  const [spotlightPower, setSpotlightPower] = useState(3);
  const [magnetPower, setMagnetPower] = useState(1);
  const [drivePower, setDrivePower] = useState(1);
  const [proximityPower, setProximityPower] = useState(1);

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

  // Remember the last active power level so toggling off then on restores it
  const spotlightLastPower = useRef(3);
  const magnetLastPower = useRef(3);
  const driveLastPower = useRef(3);
  const proximityLastPower = useRef(3);

  const handleSpotlightPower = (level: number) => {
    if (level > 1) spotlightLastPower.current = level;
    setSpotlightPower(level);
    const on = level > 1;
    spotlightOnRef.current = on;
    setSpotlightOn(on);
  };

  const handleMagnetPower = (level: number) => {
    if (level > 1) magnetLastPower.current = level;
    setMagnetPower(level);
    const on = level > 1;
    magneticOnRef.current = on;
    magneticScanRangeRef.current = SCAN_RANGES[level - 1];
    setMagneticOn(on);
  };

  const handleDrivePower = (level: number) => {
    if (level > 1) driveLastPower.current = level;
    setDrivePower(level);
    const on = level > 1;
    driveSignatureOnRef.current = on;
    driveSignatureRangeRef.current = SCAN_RANGES[level - 1];
    setDriveSignatureOn(on);
  };

  const handleProximityPower = (level: number) => {
    if (level > 1) proximityLastPower.current = level;
    setProximityPower(level);
    const on = level > 1;
    proximityScanOnRef.current = on;
    proximityScanRangeRef.current = SCAN_RANGES[level - 1];
    setProximity(on);
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          position: 'fixed',
          top: 0,
          right: 0,
          fontFamily: 'monospace',
          fontSize: 14,
          padding: '6px 14px',
        }}
      >
        <div
          ref={coordsRef}
          style={{ color: 'rgba(0, 200, 255, 0.8)', fontSize: 12, fontFamily: 'monospace' }}
        />
        {/* Nav target selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div
            style={{
              color: 'rgba(0, 200, 255, 0.8)',
              fontSize: 10,
              letterSpacing: '0.12em',
              opacity: 0.8,
            }}
          >
            NAV TARGET
          </div>
          <select
            value={targetId}
            onChange={(e) => {
              const id = e.target.value;
              const def = NAV_TARGETS.find((t) => t.id === id);
              if (!def) return;
              setTargetId(id);
              navTargetIdRef.current = id;
              navTargetPosRef.current.set(...def.position);
            }}
            style={{
              background: 'rgba(0,0,0,0.5)',
              color: 'rgba(0, 200, 255, 0.8)',
              border: '1px solid rgba(0, 200, 255, 0.8)',
              fontFamily: 'monospace',
              fontSize: 12,
              padding: '3px 6px',
              cursor: 'pointer',
              outline: 'none',
              letterSpacing: '0.06em',
            }}
          >
            {NAV_TARGETS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          fontFamily: 'monospace',
          fontSize: 14,
          padding: '6px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          backdropFilter: 'blur(10px)',
        }}
      >
        <HudButton
          icon={Flashlight}
          onClickEvent={() =>
            handleSpotlightPower(spotlightPower > 1 ? 1 : spotlightLastPower.current)
          }
          isActive={spotlightOn}
          power={spotlightPower}
          onPowerChange={handleSpotlightPower}
        />
        <HudButton
          icon={Magnet}
          onClickEvent={() => handleMagnetPower(magnetPower > 1 ? 1 : magnetLastPower.current)}
          isActive={magneticOn}
          power={magnetPower}
          onPowerChange={handleMagnetPower}
        />
        <HudButton
          icon={HardDrive}
          onClickEvent={() => handleDrivePower(drivePower > 1 ? 1 : driveLastPower.current)}
          isActive={driveSignatureOn}
          power={drivePower}
          onPowerChange={handleDrivePower}
        />
        <HudButton
          icon={Radar}
          onClickEvent={() =>
            handleProximityPower(proximityPower > 1 ? 1 : proximityLastPower.current)
          }
          isActive={proximity}
          power={proximityPower}
          onPowerChange={handleProximityPower}
        />
      </div>
    </>
  );
};
