import { useEffect, useRef, useState } from 'react';
import { AudioLines, RadioTower } from 'lucide-react';
import ContactsHUD from '../../ContactsHUD/ContactsHUD';
import {
  clampScannerPowerLevel,
  formatScannerPowerDrain,
  getScannerPowerDrain,
  isScannerPowerOn,
  SCANNER_DEFAULT_ON_LEVEL,
  SCANNER_OFF_LEVEL,
  SCANNER_POWER_LEVELS,
  SCANNER_RANGE_MODE_ARIA,
  SCANNER_RANGE_MODE_LABELS,
  scannerPowerLevelRefs,
} from '../../../config/scanRanges';
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
  void radioOn;
  const padScanActive = usePadScanActive();
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
  const drain = getScannerPowerDrain(RADIO_ID, power);
  const drainLabel = formatScannerPowerDrain(drain);

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
        <div className="mech-comms" aria-label="Communications">
          <div className="scanner-columns">
            <div
              className={`scanner-col${disabled ? ' scanner-col--disabled' : ''}${highlight ? ' scanner-col--highlight' : ''}`}
              onMouseEnter={() => setScannerRingHovered('radio', true)}
              onMouseLeave={() => setScannerRingHovered('radio', false)}
            >
              <div className="scanner-col-icon" title="Radio">
                <AudioLines size={14} strokeWidth={2} aria-hidden />
              </div>
              <span
                className={`resource-bar-rate${drain > 0 ? ' resource-bar-rate--loss' : ''}`}
                title="Power drain"
              >
                {drainLabel}
              </span>
              <div className="scanner-power-btns" role="group" aria-label="Radio power">
                {SCANNER_POWER_LEVELS.map((level) => {
                  const selected = power === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      className={`scanner-power-btn${selected ? ' scanner-power-btn--selected' : ''}`}
                      disabled={disabled}
                      aria-label={SCANNER_RANGE_MODE_ARIA[level]}
                      aria-pressed={selected}
                      onClick={() => applyPower(level)}
                    >
                      {SCANNER_RANGE_MODE_LABELS[level]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <PadScanWaveform active={padScanActive} />
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
      )}
    </ContactsHUD>
  );
}
