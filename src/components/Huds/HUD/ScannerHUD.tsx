import { useState, useRef, useEffect, type CSSProperties, type ReactNode } from 'react';
import {
  Flashlight,
  Magnet,
  HardDrive,
  Radar,
  Radiation,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { HudButton } from '../HudButton';
import { shipPosRef } from '../../../context/ShipPos';
import './ScannerHUD.css';
import '../HelmetHUD/HelmetHUD.css';
import {
  clampScannerPowerLevel,
  formatScannerPowerDrain,
  getScannerAccentColor,
  getScannerPowerDrain,
  isScannerPowerOn,
  SCANNER_ABBREV,
  SCANNER_DEFAULT_ON_LEVEL,
  SCANNER_OFF_LEVEL,
  SCANNER_RANGE_MODE_ARIA,
  SCANNER_RANGE_MODE_LABELS,
  SCANNER_RANGE_ON_LEVELS,
  scannerPowerLevelRefs,
  syncSpotlightPowerLevel,
  type ScannerElementId,
  type ScannerPowerLevel,
  type ScannerRangeId,
} from '../../../config/scanRanges';
import {
  resetScannerRingHoverState,
  setScannerRingHovered,
} from '../../../context/ScannerRingHover';
import {
  formatScannerContactCount,
  scannerContactCountRefs,
} from '../../../context/ScannerContactCounts';
import { requestOpenScanPicker } from '../../../context/NavHud';
import {
  setDriveScannerState,
  setMagneticScannerState,
  setProximityScannerState,
  setRadiationScannerState,
} from '../../../context/scannerStateMutators';

export const ScannerHUDElements = {
  SPOTLIGHT: 'spotlight',
  MAGNET: 'magnet',
  DRIVE: 'drive',
  PROXIMITY: 'proximity',
  RADIO: 'radio',
  RADIATION: 'radiation',
} as const;

export type ScannerHUDElementId = (typeof ScannerHUDElements)[keyof typeof ScannerHUDElements];

function HelmetScannerRow({
  id,
  abbrev,
  icon: Icon,
  accentColor,
  power,
  isActive,
  disabled,
  highlight,
  contactCount,
  onToggle,
  onPowerChange,
  onHoverChange,
}: {
  id: ScannerElementId;
  abbrev: string;
  icon: LucideIcon;
  accentColor: string;
  power: number;
  isActive: boolean;
  disabled: boolean;
  highlight: boolean;
  contactCount: number | null;
  onToggle: () => void;
  onPowerChange: (level: ScannerPowerLevel) => void;
  onHoverChange: (hovered: boolean) => void;
}) {
  const drain = getScannerPowerDrain(id, power);
  const drainLabel = formatScannerPowerDrain(drain);
  const showContacts = isActive && contactCount !== null;
  const canOpenContacts = showContacts && (contactCount ?? 0) > 0;
  const ringId = id === 'spotlight' ? null : (id as ScannerRangeId);

  return (
    <div
      className={`helmet-scanner-section${disabled ? ' helmet-scanner-row--disabled' : ''}${highlight ? ' helmet-scanner-row--highlight' : ''}${isActive ? ' helmet-scanner-row--on' : ''}`}
      style={{ '--scan-accent': accentColor } as CSSProperties}
      title={id}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <div className="helmet-scanner-section-head">
        <div className="helmet-scanner-section-title">
          <Icon className="helmet-scanner-title-icon" size={12} strokeWidth={2} aria-hidden />
          <span className="helmet-scanner-abbr">{abbrev}</span>
        </div>
        <div className="helmet-scanner-readouts">
          {contactCount !== null ? (
            <button
              type="button"
              className={`helmet-scanner-drain-screen helmet-scanner-cont-btn${showContacts ? ' helmet-scanner-drain-screen--active' : ''}${canOpenContacts ? ' helmet-scanner-cont-btn--clickable' : ''}`}
              title={canOpenContacts ? `Open ${abbrev} contacts` : `${abbrev} contacts in range`}
              aria-label={
                canOpenContacts ? `Open ${abbrev} contacts (${contactCount})` : `${abbrev} contacts`
              }
              disabled={disabled || !canOpenContacts}
              onClick={() => {
                if (!ringId || !canOpenContacts) return;
                requestOpenScanPicker(ringId);
              }}
            >
              <span className="helmet-scanner-drain">
                {showContacts ? formatScannerContactCount(contactCount) : '0'}
              </span>
            </button>
          ) : null}
          <span
            className={`helmet-scanner-drain-screen${drain > 0 ? ' helmet-scanner-drain-screen--active' : ''}`}
            title="Power drain"
          >
            <span className="helmet-scanner-drain">{drainLabel}</span>
          </span>
        </div>
      </div>
      <div className="helmet-scanner-section-crt">
        <div className="helmet-scanner-row">
          <div className="helmet-scanner-switches" role="group" aria-label={`${abbrev} controls`}>
            <button
              type="button"
              className={`helmet-scanner-switch${isActive ? '' : ' helmet-scanner-switch--off'}`}
              disabled={disabled}
              onClick={() => {
                if (isActive) onToggle();
              }}
              aria-label={`${abbrev} power off`}
              aria-pressed={!isActive}
              title="Switch off"
            >
              <span className="helmet-scanner-switch-face" aria-hidden>
                O
              </span>
            </button>
            {SCANNER_RANGE_ON_LEVELS.map((level) => {
              const selected = power === level;
              return (
                <button
                  key={level}
                  type="button"
                  className={`helmet-scanner-switch${selected ? ' helmet-scanner-switch--selected' : ''}${isActive && power >= level ? ' ' : ''}`}
                  disabled={disabled}
                  aria-label={SCANNER_RANGE_MODE_ARIA[level]}
                  aria-pressed={selected}
                  onClick={() => onPowerChange(level)}
                >
                  <span className="helmet-scanner-switch-face" aria-hidden>
                    {SCANNER_RANGE_MODE_LABELS[level]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MechScannerShell({
  children,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  ariaLabel: string;
}) {
  return (
    <div className={`mech-scanner ${className ?? ''}`.trim()} aria-label={ariaLabel}>
      <div className="mech-scanner-bezel">
        <div className="mech-scanner-head">
          <span className="mech-scanner-lamp" aria-hidden />
          <span className="mech-scanner-title">SCAN</span>
          <span className="mech-scanner-sub">SENSORS</span>
        </div>
        <div className="mech-scanner-modules">{children}</div>
      </div>
    </div>
  );
}

type ScannerContactCounts = Record<ScannerRangeId, number>;

function readScannerContactCounts(): ScannerContactCounts {
  return {
    magnet: scannerContactCountRefs.magnet.current,
    drive: scannerContactCountRefs.drive.current,
    proximity: scannerContactCountRefs.proximity.current,
    radio: scannerContactCountRefs.radio.current,
    radiation: scannerContactCountRefs.radiation.current,
  };
}

function contactCountsSignature(counts: ScannerContactCounts): string {
  return `${counts.magnet}|${counts.drive}|${counts.proximity}|${counts.radio}|${counts.radiation}`;
}

function useScannerContactCounts(): ScannerContactCounts {
  const [counts, setCounts] = useState(readScannerContactCounts);
  useEffect(() => {
    let raf = 0;
    let prevSig = contactCountsSignature(counts);
    const tick = () => {
      const next = readScannerContactCounts();
      const sig = contactCountsSignature(next);
      if (sig !== prevSig) {
        prevSig = sig;
        setCounts(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll live refs; seed from initial read only
  }, []);
  return counts;
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
  tutorialMagneticFocus?: boolean;
  focusElements?: string[];
  disableElements?: string[];
  initialPowers?: Partial<Record<ScannerHUDElementId, number>>;
}

interface ButtonDef {
  id: ScannerHUDElementId;
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
  tutorialMagneticFocus = false,
  focusElements = [],
  disableElements = [],
  initialPowers = {},
}: ScannerHUDProps) => {
  void tutorialMagneticFocus;
  const [radiationOn, setRadiationOn] = useState(false);
  const contactCounts = useScannerContactCounts();

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
    [ScannerHUDElements.SPOTLIGHT]: clampScannerPowerLevel(
      initialPowers[ScannerHUDElements.SPOTLIGHT] ?? SCANNER_OFF_LEVEL
    ),
    [ScannerHUDElements.MAGNET]: clampScannerPowerLevel(
      initialPowers[ScannerHUDElements.MAGNET] ?? SCANNER_OFF_LEVEL
    ),
    [ScannerHUDElements.DRIVE]: clampScannerPowerLevel(
      initialPowers[ScannerHUDElements.DRIVE] ?? SCANNER_OFF_LEVEL
    ),
    [ScannerHUDElements.PROXIMITY]: clampScannerPowerLevel(
      initialPowers[ScannerHUDElements.PROXIMITY] ?? SCANNER_OFF_LEVEL
    ),
    [ScannerHUDElements.RADIATION]: clampScannerPowerLevel(
      initialPowers[ScannerHUDElements.RADIATION] ?? SCANNER_OFF_LEVEL
    ),
  };

  useEffect(() => {
    return () => resetScannerRingHoverState();
  }, []);

  const [powers, setPowers] = useState<Record<string, number>>(() =>
    Object.fromEntries(BUTTON_DEFS.map((b) => [b.id, initialPowerById[b.id]]))
  );
  const lastPowers = useRef<Record<string, number>>(
    Object.fromEntries(
      BUTTON_DEFS.map((b) => [
        b.id,
        isScannerPowerOn(initialPowerById[b.id])
          ? initialPowerById[b.id]
          : SCANNER_DEFAULT_ON_LEVEL,
      ])
    )
  );

  const applyPower = (id: string, level: number) => {
    const clamped = clampScannerPowerLevel(level);
    const on = isScannerPowerOn(clamped);
    scannerPowerLevelRefs[id as ScannerElementId].current = on ? clamped : SCANNER_OFF_LEVEL;

    switch (id) {
      case ScannerHUDElements.SPOTLIGHT:
        syncSpotlightPowerLevel(clamped);
        spotlightOnRef.current = on;
        setSpotlightOn(on);
        break;
      case ScannerHUDElements.MAGNET:
        setMagneticScannerState(on, clamped);
        setMagneticOn(on);
        if (clamped === 4) window.dispatchEvent(new CustomEvent('MagnetScannerMaxed'));
        if (!on) window.dispatchEvent(new CustomEvent('MagnetScannerOff'));
        break;
      case ScannerHUDElements.DRIVE:
        setDriveScannerState(on, clamped);
        setDriveSignatureOn(on);
        if (clamped === 4) window.dispatchEvent(new CustomEvent('DriveSignatureAt5'));
        break;
      case ScannerHUDElements.PROXIMITY:
        setProximityScannerState(on, clamped);
        setProximity(on);
        break;
      case ScannerHUDElements.RADIATION:
        setRadiationScannerState(on, clamped);
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
      case ScannerHUDElements.RADIATION:
        return radiationOn;
      default:
        return false;
    }
  };

  const handlePower = (id: string, level: number) => {
    const clamped = clampScannerPowerLevel(level);
    if (isScannerPowerOn(clamped)) lastPowers.current[id] = clamped;
    setPowers((prev) => ({ ...prev, [id]: clamped }));
    applyPower(id, clamped);
  };

  // Keep drain refs aligned with initial HUD powers (config scenes pre-set ranges separately).
  useEffect(() => {
    BUTTON_DEFS.forEach(({ id }) => {
      const level = clampScannerPowerLevel(initialPowerById[id]);
      scannerPowerLevelRefs[id].current = isScannerPowerOn(level) ? level : SCANNER_OFF_LEVEL;
      if (id === ScannerHUDElements.SPOTLIGHT) {
        syncSpotlightPowerLevel(level);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only bookkeeping
  }, []);

  if (layout === 'helmet') {
    return (
      <MechScannerShell className="helmet-scanner-deck" ariaLabel="Sensors">
        {BUTTON_DEFS.map(({ id, ringId, icon }) => {
          const disabled = disableElements.includes(id);
          const highlight = focusElements.includes(id);
          return (
            <HelmetScannerRow
              key={id}
              id={id}
              abbrev={SCANNER_ABBREV[id]}
              icon={icon}
              accentColor={getScannerAccentColor(id)}
              power={powers[id]}
              isActive={getIsActive(id)}
              disabled={disabled}
              highlight={highlight}
              contactCount={ringId ? contactCounts[ringId] : null}
              onHoverChange={(hovered) => {
                if (!ringId) return;
                setScannerRingHovered(ringId, hovered);
              }}
              onToggle={() =>
                handlePower(
                  id,
                  isScannerPowerOn(powers[id]) ? SCANNER_OFF_LEVEL : lastPowers.current[id]
                )
              }
              onPowerChange={(level) => handlePower(id, level)}
            />
          );
        })}
      </MechScannerShell>
    );
  }

  return (
    <MechScannerShell className="button-panel" ariaLabel="Sensors">
      <div className="classic-scanner-grid">
        {BUTTON_DEFS.map(({ id, ringId, icon }) => {
          const drain = getScannerPowerDrain(id, powers[id]);
          return (
            <div
              key={id}
              className={`flex-column blue classic-scanner-cell ${disableElements.includes(id) ? 'hud-button-disabled' : ''}`}
              onMouseEnter={() => {
                if (!ringId) return;
                setScannerRingHovered(ringId, true);
              }}
              onMouseLeave={() => {
                if (!ringId) return;
                setScannerRingHovered(ringId, false);
              }}
            >
              <div className="power-hud-label">
                <span>{id.toUpperCase()}</span>
                <span
                  className={`classic-scanner-drain${drain > 0 ? ' classic-scanner-drain--active' : ''}`}
                >
                  {formatScannerPowerDrain(drain)}
                </span>
              </div>
              <HudButton
                icon={icon}
                name=""
                accentColor={getScannerAccentColor(id)}
                isActive={getIsActive(id)}
                power={powers[id]}
                highlight={focusElements.includes(id)}
                disabled={disableElements.includes(id)}
                onClickEvent={() =>
                  handlePower(
                    id,
                    isScannerPowerOn(powers[id]) ? SCANNER_OFF_LEVEL : lastPowers.current[id]
                  )
                }
                onPowerChange={(level) => handlePower(id, level)}
              />
            </div>
          );
        })}
      </div>
    </MechScannerShell>
  );
};
