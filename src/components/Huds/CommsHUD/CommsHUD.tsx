import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AudioLines, RadioTower } from 'lucide-react';
import ContactsHUD from '../../ContactsHUD/ContactsHUD';
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
} from '../../../config/scanRanges';
import {
  formatScannerContactCount,
  scannerContactCountRefs,
} from '../../../context/ScannerContactCounts';
import { setRadioScannerState } from '../../../context/scannerStateMutators';
import { setScannerRingHovered } from '../../../context/ScannerRingHover';
import {
  EVENT_PAD_SCAN_ENDED,
  EVENT_PAD_SCAN_STARTED,
  padScanActiveRef,
} from '../../../context/PadScanState';
import {
  areShipSystemsForcedOffline,
  EVENT_SHIP_POWER_DEPLETED,
} from '../../../context/shipPowerSystems';
import { power as shipPower } from '../../../context/ShipState';
import '../HUD/ScannerHUD.css';
import './CommsHUD.css';

const PAD_SCAN_WAVE_BARS = 12;
const RADIO_ID = 'radio' as const;

function usePadScanActive(): boolean {
  const [active, setActive] = useState(() => padScanActiveRef.current);
  useEffect(() => {
    const onStart = () => setActive(true);
    const onEnd = () => setActive(false);
    window.addEventListener(EVENT_PAD_SCAN_STARTED, onStart);
    window.addEventListener(EVENT_PAD_SCAN_ENDED, onEnd);
    return () => {
      window.removeEventListener(EVENT_PAD_SCAN_STARTED, onStart);
      window.removeEventListener(EVENT_PAD_SCAN_ENDED, onEnd);
    };
  }, []);
  return active;
}

function useRadioContactCount(): number {
  const [count, setCount] = useState(() => scannerContactCountRefs.radio.current);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const next = scannerContactCountRefs.radio.current;
      setCount((prev) => (prev === next ? prev : next));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return count;
}

function PadScanWaveform({ active }: { active: boolean }) {
  return (
    <div
      className={`helmet-pad-scan${active ? ' helmet-pad-scan--active' : ''}`}
      title={active ? 'Inbound pad scan' : 'Pad link'}
      aria-label={active ? 'Receiving pad scan' : 'Pad link idle'}
    >
      <div className="helmet-pad-scan-icon" aria-hidden>
        <RadioTower size={15} strokeWidth={1.75} />
      </div>
      <div className="helmet-pad-scan-wave" aria-hidden>
        {Array.from({ length: PAD_SCAN_WAVE_BARS }, (_, i) => (
          <span
            key={i}
            className="helmet-pad-scan-bar"
            style={{ animationDelay: `${i * 0.07}s` }}
          />
        ))}
      </div>
      <span className="helmet-pad-scan-label">{active ? 'RX' : 'LNK'}</span>
    </div>
  );
}

export interface CommsHUDProps {
  radioOn: boolean;
  setRadioOn: (on: boolean) => void;
  radioOnRef: React.RefObject<boolean>;
  disableElements?: string[];
  focusElements?: string[];
  initialRadioPower?: number;
  sceneRadioContactsOnly?: boolean;
}

export default function CommsHUD({
  radioOn,
  setRadioOn,
  radioOnRef,
  disableElements = [],
  focusElements = [],
  initialRadioPower,
  sceneRadioContactsOnly = false,
}: CommsHUDProps) {
  const padScanActive = usePadScanActive();
  const contactCount = useRadioContactCount();
  const lastPower = useRef(
    clampScannerPowerLevel(
      isScannerPowerOn(initialRadioPower ?? SCANNER_OFF_LEVEL)
        ? (initialRadioPower as number)
        : SCANNER_DEFAULT_ON_LEVEL
    )
  );
  const [power, setPower] = useState(() =>
    clampScannerPowerLevel(initialRadioPower ?? SCANNER_OFF_LEVEL)
  );

  const disabled = disableElements.includes(RADIO_ID);
  const highlight = focusElements.includes(RADIO_ID);
  const isActive = radioOn && isScannerPowerOn(power);
  const accentColor = getScannerAccentColor(RADIO_ID);
  const drain = getScannerPowerDrain(RADIO_ID, power);
  const drainLabel = formatScannerPowerDrain(drain);
  const showContacts = isActive;
  const abbrev = SCANNER_ABBREV.radio;

  useEffect(() => {
    const level = clampScannerPowerLevel(power);
    scannerPowerLevelRefs.radio.current = isScannerPowerOn(level) ? level : SCANNER_OFF_LEVEL;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount bookkeeping only
  }, []);

  function applyPower(level: number) {
    const clamped = clampScannerPowerLevel(level);
    const on = isScannerPowerOn(clamped);
    if (on && (areShipSystemsForcedOffline() || shipPower <= 0)) return;
    if (on) lastPower.current = clamped;
    scannerPowerLevelRefs.radio.current = on ? clamped : SCANNER_OFF_LEVEL;
    setPower(clamped);
    setRadioScannerState(on, clamped);
    radioOnRef.current = on;
    setRadioOn(on);
  }

  useEffect(() => {
    const shutDown = () => applyPower(SCANNER_OFF_LEVEL);
    window.addEventListener(EVENT_SHIP_POWER_DEPLETED, shutDown);
    if (areShipSystemsForcedOffline() || shipPower <= 0) {
      shutDown();
    }
    return () => window.removeEventListener(EVENT_SHIP_POWER_DEPLETED, shutDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + depletion sync only
  }, []);

  return (
    <ContactsHUD sceneRadioContactsOnly={sceneRadioContactsOnly}>
      {({ open, hasIncoming }) => (
        <div className="mech-comms mech-scanner" aria-label="Communications">
          <div className="mech-comms-bezel">
            <div className="mech-comms-head">
              <span className="mech-comms-lamp" aria-hidden />
              <span className="mech-comms-title">COMMS</span>
              <span className="mech-comms-sub">RADIO</span>
            </div>

            <div className="mech-comms-body">
              <div
                className={`helmet-scanner-section mech-comms-radio${disabled ? ' helmet-scanner-row--disabled' : ''}${highlight ? ' helmet-scanner-row--highlight' : ''}${isActive ? ' helmet-scanner-row--on' : ''}`}
                style={{ '--scan-accent': accentColor } as CSSProperties}
                title="radio"
                onMouseEnter={() => setScannerRingHovered('radio', true)}
                onMouseLeave={() => setScannerRingHovered('radio', false)}
              >
                <div className="helmet-scanner-section-head">
                  <div className="helmet-scanner-section-title">
                    <AudioLines
                      className="helmet-scanner-title-icon"
                      size={12}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="helmet-scanner-abbr">{abbrev}</span>
                  </div>
                  <div className="helmet-scanner-readouts">
                    <button
                      type="button"
                      className={`helmet-scanner-drain-screen helmet-scanner-cont-btn helmet-scanner-cont-btn--clickable${showContacts ? ' helmet-scanner-drain-screen--active' : ''}${hasIncoming ? ' mech-comms-cont--incoming' : ''}`}
                      title="Open contacts"
                      aria-label={
                        showContacts
                          ? `Open contacts (${formatScannerContactCount(contactCount)})`
                          : 'Open contacts'
                      }
                      disabled={disabled}
                      onClick={open}
                    >
                      <span className="helmet-scanner-drain">
                        {showContacts ? formatScannerContactCount(contactCount) : '0'}
                      </span>
                    </button>
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
                    <div className="helmet-scanner-switches" role="group" aria-label="RAD controls">
                      <button
                        type="button"
                        className={`helmet-scanner-switch${isActive ? '' : ' helmet-scanner-switch--off'}`}
                        disabled={disabled}
                        onClick={() => {
                          if (isActive) applyPower(SCANNER_OFF_LEVEL);
                        }}
                        aria-label="RAD power off"
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
                            className={`helmet-scanner-switch${selected ? ' helmet-scanner-switch--selected' : ''}`}
                            disabled={disabled}
                            aria-label={SCANNER_RANGE_MODE_ARIA[level]}
                            aria-pressed={selected}
                            onClick={() => applyPower(level)}
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

              <div className="mech-comms-pad">
                <PadScanWaveform active={padScanActive} />
              </div>

              {hasIncoming && (
                <button
                  type="button"
                  className="mech-comms-hail"
                  onClick={open}
                  title="Accept incoming hail"
                  aria-label="Incoming hail — click to open"
                >
                  <div className="mech-comms-hail-icon" aria-hidden>
                    <RadioTower size={15} strokeWidth={1.75} />
                  </div>
                  <div className="mech-comms-hail-wave" aria-hidden>
                    {Array.from({ length: PAD_SCAN_WAVE_BARS }, (_, i) => (
                      <span
                        key={i}
                        className="mech-comms-hail-bar"
                        style={{ animationDelay: `${i * 0.07}s` }}
                      />
                    ))}
                  </div>
                  <span className="mech-comms-hail-label">INCOMING HAIL</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ContactsHUD>
  );
}
