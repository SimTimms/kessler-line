import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { Flashlight, Magnet, HardDrive, Radar, AudioLines, Radiation } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { HudButton } from '../HudButton';
import { shipPosRef } from '../../../context/ShipPos';
import './ScannerHUD.css';
import '../HelmetHUD/HelmetHUD.css';
import {
  getScannerAccentColor,
  SCANNER_ABBREV,
  type ScannerRangeId,
} from '../../../config/scanRanges';
import {
  resetScannerRingHoverState,
  setScannerRingHovered,
} from '../../../context/ScannerRingHover';
import {
  setDriveScannerState,
  setMagneticScannerState,
  setProximityScannerState,
  setRadioScannerState,
  setRadiationScannerState,
} from '../../../context/scannerStateMutators';
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

const POWER_LEVELS = [1, 2, 3, 4, 5] as const;
const MIN_POWER_LEVEL = 1;
const MAX_POWER_LEVEL = 5;

function clampPowerLevel(level: number): number {
  return Math.max(MIN_POWER_LEVEL, Math.min(MAX_POWER_LEVEL, Math.round(level)));
}

function HelmetScannerRow({
  id,
  abbrev,
  icon: Icon,
  accentColor,
  power,
  isActive,
  disabled,
  highlight,
  onToggle,
  onPowerChange,
  onHoverChange,
}: {
  id: string;
  abbrev: string;
  icon: LucideIcon;
  accentColor: string;
  power: number;
  isActive: boolean;
  disabled: boolean;
  highlight: boolean;
  onToggle: () => void;
  onPowerChange: (level: number) => void;
  onHoverChange: (hovered: boolean) => void;
}) {
  const levelDisplay = power > 1 ? String(power) : '—';

  return (
    <div
      className={`helmet-scanner-row${disabled ? ' helmet-scanner-row--disabled' : ''}${highlight ? ' helmet-scanner-row--highlight' : ''}${isActive ? ' helmet-scanner-row--on' : ''}`}
      style={{ '--scan-accent': accentColor } as CSSProperties}
      title={id}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <button
        type="button"
        className="helmet-scanner-icon"
        disabled={disabled}
        onClick={onToggle}
        aria-label={`${abbrev} sensor`}
        aria-pressed={isActive}
      >
        <Icon size={15} strokeWidth={1.75} />
      </button>
      <div className="helmet-scanner-levels" role="group" aria-label={`${abbrev} power`}>
        {POWER_LEVELS.map((level) => {
          const lit = power > 1 && level <= power;
          return (
            <button
              key={level}
              type="button"
              className={`helmet-seg helmet-seg--h${lit ? ' helmet-seg--lit' : ''}`}
              disabled={disabled}
              aria-label={`Level ${level}`}
              onClick={() => onPowerChange(level)}
            />
          );
        })}
      </div>
      <span className="helmet-scanner-lv" aria-hidden>
        {levelDisplay}
      </span>
      <span className="helmet-scanner-abbr">{abbrev}</span>
    </div>
  );
}

interface ScannerHUDProps {
  layout?: 'classic' | 'helmet';
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
  initialPowers?: Partial<Record<ScannerHUDElementId, number>>;
}

interface ButtonDef {
  id: string;
  ringId: ScannerRangeId | null;
  icon: LucideIcon;
}

const BUTTON_DEFS: ButtonDef[] = [
  {
    id: ScannerHUDElements.SPOTLIGHT,
    ringId: null,
    icon: Flashlight,
  },
  {
    id: ScannerHUDElements.MAGNET,
    ringId: 'magnet',
    icon: Magnet,
  },
  {
    id: ScannerHUDElements.DRIVE,
    ringId: 'drive',
    icon: HardDrive,
  },
  {
    id: ScannerHUDElements.PROXIMITY,
    ringId: 'proximity',
    icon: Radar,
  },
  {
    id: ScannerHUDElements.RADIO,
    ringId: 'radio',
    icon: AudioLines,
  },
  {
    id: ScannerHUDElements.RADIATION,
    ringId: 'radiation',
    icon: Radiation,
  },
];

export const ScannerHUD = ({
  layout = 'classic',
  spotlightOn,
  setSpotlightOn,
  spotlightOnRef,
  magneticOn,
  setMagneticOn,
  driveSignatureOn,
  setDriveSignatureOn,
  proximity,
  setProximity,
  radioOn,
  setRadioOn,
  tutorialMagneticFocus = false,
  focusElements = [],
  disableElements = [],
  initialPowers = {},
}: ScannerHUDProps) => {
  void tutorialMagneticFocus;
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

  const initialPowerById: Record<string, number> = {
    [ScannerHUDElements.SPOTLIGHT]: clampPowerLevel(initialPowers[ScannerHUDElements.SPOTLIGHT] ?? 1),
    [ScannerHUDElements.MAGNET]: clampPowerLevel(initialPowers[ScannerHUDElements.MAGNET] ?? 1),
    [ScannerHUDElements.DRIVE]: clampPowerLevel(initialPowers[ScannerHUDElements.DRIVE] ?? 1),
    [ScannerHUDElements.PROXIMITY]: clampPowerLevel(initialPowers[ScannerHUDElements.PROXIMITY] ?? 1),
    [ScannerHUDElements.RADIO]: clampPowerLevel(initialPowers[ScannerHUDElements.RADIO] ?? 1),
    [ScannerHUDElements.RADIATION]: clampPowerLevel(initialPowers[ScannerHUDElements.RADIATION] ?? 1),
  };

  useEffect(() => {
    return () => resetScannerRingHoverState();
  }, []);

  // ── Single shared power state + last-power memory ─────────────────────────
  const [powers, setPowers] = useState<Record<string, number>>(() =>
    Object.fromEntries(BUTTON_DEFS.map((b) => [b.id, initialPowerById[b.id]]))
  );
  // Stores the last non-off level so toggling back on restores it; starts at 3
  const lastPowers = useRef<Record<string, number>>(
    Object.fromEntries(BUTTON_DEFS.map((b) => [b.id, initialPowerById[b.id] > 1 ? initialPowerById[b.id] : 3]))
  );

  const applyPower = (id: string, level: number) => {
    const on = level > 1;
    switch (id) {
      case ScannerHUDElements.SPOTLIGHT:
        spotlightOnRef.current = on;
        setSpotlightOn(on);
        break;
      case ScannerHUDElements.MAGNET:
        setMagneticScannerState(on, level);
        setMagneticOn(on);
        if (level === 5) window.dispatchEvent(new CustomEvent('MagnetScannerMaxed'));
        if (!on) window.dispatchEvent(new CustomEvent('MagnetScannerOff'));
        break;
      case ScannerHUDElements.DRIVE:
        setDriveScannerState(on, level);
        setDriveSignatureOn(on);
        if (level === 5) window.dispatchEvent(new CustomEvent('DriveSignatureAt5'));
        break;
      case ScannerHUDElements.PROXIMITY:
        setProximityScannerState(on, level);
        setProximity(on);
        break;
      case ScannerHUDElements.RADIO:
        setRadioScannerState(on, level);
        setRadioOn(on);
        break;
      case ScannerHUDElements.RADIATION:
        setRadiationScannerState(on, level);
        setRadiationOn(on);
        break;
      default:
        break;
    }
  };

  const getIsActive = (id: string): boolean => {
    switch (id) {
      case ScannerHUDElements.SPOTLIGHT:
        return spotlightOn;
      case ScannerHUDElements.MAGNET:
        return magneticOn;
      case ScannerHUDElements.DRIVE:
        return driveSignatureOn;
      case ScannerHUDElements.PROXIMITY:
        return proximity;
      case ScannerHUDElements.RADIO:
        return radioOn;
      case ScannerHUDElements.RADIATION:
        return radiationOn;
      default:
        return false;
    }
  };

  const handlePower = (id: string, level: number) => {
    if (level > 1) lastPowers.current[id] = level;
    setPowers((prev) => ({ ...prev, [id]: level }));
    applyPower(id, level);
  };

  if (layout === 'helmet') {
    return (
      <div className="helmet-scanner-deck" aria-label="Sensors">
        <div className="helmet-scanner-deck-head">SCAN</div>
        <div className="helmet-scanner-grid">
          {BUTTON_DEFS.map(({ id, ringId, icon }) => {
            const disabled = disableElements.includes(id);
            const highlight = focusElements.includes(id);
            return (
              <HelmetScannerRow
                key={id}
                id={id}
                abbrev={SCANNER_ABBREV[id] ?? id.slice(0, 3).toUpperCase()}
                icon={icon}
                accentColor={getScannerAccentColor(id)}
                power={powers[id]}
                isActive={getIsActive(id)}
                disabled={disabled}
                highlight={highlight}
                onHoverChange={(hovered) => {
                  if (!ringId) return;
                  setScannerRingHovered(ringId, hovered);
                }}
                onToggle={() => handlePower(id, powers[id] > 1 ? 1 : lastPowers.current[id])}
                onPowerChange={(level) => handlePower(id, level)}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="button-panel">
      {BUTTON_DEFS.map(({ id, ringId, icon }) => (
        <div
          key={id}
          className={`flex-column blue ${disableElements.includes(id) ? 'hud-button-disabled' : ''}`}
          onMouseEnter={() => {
            if (!ringId) return;
            setScannerRingHovered(ringId, true);
          }}
          onMouseLeave={() => {
            if (!ringId) return;
            setScannerRingHovered(ringId, false);
          }}
        >
          <div className="power-hud-label">{id.toUpperCase()}</div>
          <HudButton
            icon={icon}
            name=""
            accentColor={getScannerAccentColor(id)}
            isActive={getIsActive(id)}
            power={powers[id]}
            highlight={focusElements.includes(id)}
            disabled={disableElements.includes(id)}
            onClickEvent={() => handlePower(id, powers[id] > 1 ? 1 : lastPowers.current[id])}
            onPowerChange={(level) => handlePower(id, level)}
          />
        </div>
      ))}
    </div>
  );
};
