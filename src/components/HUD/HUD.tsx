import { useState, useRef, useEffect } from 'react';
import {
  Flashlight,
  Magnet,
  HardDrive,
  Radar,
  AudioLines,
  Radiation,
  Music,
  Axis3D,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { HudButton } from '../HudButton';
import { proximityScanRangeRef } from '../../context/ProximityScan';
import { magneticScanRangeRef } from '../../context/MagneticScan';
import { driveSignatureRangeRef } from '../../context/DriveSignatureScan';
import { radioRangeRef } from '../../context/RadioState';
import { shipPosRef } from '../../context/ShipPos';
import './HUD.css';

// World-unit scan range for each power level (index = level - 1); level 1 = off
const SCAN_RANGES = [0, 500, 1000, 1500, 2000];
const DRIVE_SIGNATURE_RANGES = [0, 2000, 5000, 20000, 40000];
const MAGNETIC_RANGES = [0, 2000, 5000, 20000, 40000];

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
  radioOn: boolean;
  setRadioOn: (on: boolean) => void;
  radioOnRef: React.RefObject<boolean>;
}

interface ButtonDef {
  id: string;
  icon: LucideIcon;
  initialPower: number;
  isActive: boolean;
  /** Called whenever power changes. `on` = level > 1. */
  onSideEffect: (on: boolean, level: number) => void;
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
  radioOn,
  setRadioOn,
  radioOnRef,
}: HUDProps) => {
  // ── Background music ──────────────────────────────────────────────────────
  const [musicOn, setMusicOn] = useState(false);
  const audio1Ref = useRef<HTMLAudioElement | null>(null);
  const audio2Ref = useRef<HTMLAudioElement | null>(null);
  const audio3Ref = useRef<HTMLAudioElement | null>(null);
  const audio4Ref = useRef<HTMLAudioElement | null>(null);
  const musicActiveRef = useRef(false);

  useEffect(() => {
    const a1 = new Audio('/piano.mp3');
    const a2 = new Audio('/piano-2.mp3');
    const a3 = new Audio('/piano-3.mp3');
    const a4 = new Audio('/cello-piano.mp3');
    audio1Ref.current = a1;
    audio1Ref.current.volume = 0.15;
    audio2Ref.current = a2;
    audio2Ref.current.volume = 0.15;
    audio3Ref.current = a3;
    audio3Ref.current.volume = 0.15;
    audio4Ref.current = a4;
    audio4Ref.current.volume = 0.15;
    const onA1End = () => {
      if (musicActiveRef.current) a2.play();
    };
    const onA2End = () => {
      if (musicActiveRef.current) a3.play();
    };
    const onA3End = () => {
      if (musicActiveRef.current) a4.play();
    };
    const onA4End = () => {
      if (musicActiveRef.current) a1.play();
    };
    a1.addEventListener('ended', onA1End);
    a2.addEventListener('ended', onA2End);
    a3.addEventListener('ended', onA3End);
    a4.addEventListener('ended', onA4End);
    return () => {
      a1.removeEventListener('ended', onA1End);
      a2.removeEventListener('ended', onA2End);
      a3.removeEventListener('ended', onA3End);
      a4.removeEventListener('ended', onA4End);
      a1.pause();
      a2.pause();
      a3.pause();
      a4.pause();
    };
  }, []);

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
      id: 'spotlight',
      icon: Flashlight,
      initialPower: 3,
      isActive: spotlightOn,
      onSideEffect: (on) => {
        spotlightOnRef.current = on;
        setSpotlightOn(on);
      },
    },
    {
      id: 'magnet',
      icon: Magnet,
      initialPower: 1,
      isActive: magneticOn,
      onSideEffect: (on, level) => {
        magneticOnRef.current = on;
        magneticScanRangeRef.current = MAGNETIC_RANGES[level - 1];
        setMagneticOn(on);
      },
    },
    {
      id: 'drive',
      icon: HardDrive,
      initialPower: 1,
      isActive: driveSignatureOn,
      onSideEffect: (on, level) => {
        driveSignatureOnRef.current = on;
        driveSignatureRangeRef.current = DRIVE_SIGNATURE_RANGES[level - 1];
        setDriveSignatureOn(on);
      },
    },
    {
      id: 'proximity',
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
      id: 'radio',
      icon: AudioLines,
      initialPower: 1,
      isActive: radioOn,
      onSideEffect: (on, level) => {
        radioOnRef.current = on;
        radioRangeRef.current = SCAN_RANGES[level - 1] * 5;
        setRadioOn(on);
      },
    },
    {
      id: 'radiation',
      icon: Radiation,
      initialPower: 1,
      isActive: false,
      onSideEffect: () => {},
    },
    {
      id: 'music',
      icon: Music,
      initialPower: 1,
      isActive: musicOn,
      onSideEffect: (on) => {
        musicActiveRef.current = on;
        setMusicOn(on);
        if (on) {
          audio4Ref.current?.play();
        } else {
          audio1Ref.current?.pause();
          audio2Ref.current?.pause();
          if (audio1Ref.current) audio1Ref.current.currentTime = 0;
          if (audio2Ref.current) audio2Ref.current.currentTime = 0;
        }
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
    <>
      <div className="button-panel">
        {buttonDefs.map(({ id, icon, isActive, onSideEffect }) => (
          <HudButton
            key={id}
            icon={icon}
            isActive={isActive}
            power={powers[id]}
            onClickEvent={() =>
              handlePower(id, powers[id] > 1 ? 1 : lastPowers.current[id], onSideEffect)
            }
            onPowerChange={(level) => handlePower(id, level, onSideEffect)}
          />
        ))}
      </div>
    </>
  );
};
