import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioLines, RadioTower } from 'lucide-react';
import ContactsHUD from '../../ContactsHUD/ContactsHUD';
import JournalPanel from './JournalPanel';
import ContactsPanel from './ContactsPanel';
import HistoryPanel from './HistoryPanel';
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
import { activeMissionRef } from '../../../context/MissionState';
import { getContactsByScanner, subscribeContactStore } from '../EventLogHUD/ContactStore';
import { EVENT_OPEN_COMMS_CONTACT } from '../../../context/CommsUiEvents';
import type { NavScanContact } from '../NavHUD/navScanPickerContacts';
import '../HUD/ScannerHUD.css';
import './CommsHUD.css';

type CommsTabId = 'radio' | 'journal' | 'contacts' | 'messages';

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

function useRadioContacts(): NavScanContact[] {
  const [contacts, setContacts] = useState(() => getContactsByScanner().radio);
  useEffect(() => subscribeContactStore(() => setContacts(getContactsByScanner().radio)), []);
  return contacts;
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
  const radioContacts = useRadioContacts();
  const [activeTab, setActiveTab] = useState<CommsTabId>('radio');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
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

  const selectedContact = radioContacts.find((c) => c.id === selectedContactId) ?? null;

  // Clear selection if the selected contact goes out of range
  useEffect(() => {
    if (selectedContactId && !radioContacts.some((c) => c.id === selectedContactId)) {
      setSelectedContactId(null);
    }
  }, [radioContacts, selectedContactId]);

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

  const handleContactClick = useCallback((id: string) => {
    setSelectedContactId((prev) => (prev === id ? null : id));
  }, []);

  const handleHail = useCallback(() => {
    if (!selectedContactId) return;
    window.dispatchEvent(
      new CustomEvent(EVENT_OPEN_COMMS_CONTACT, { detail: { contactId: selectedContactId } })
    );
    setSelectedContactId(null);
  }, [selectedContactId]);

  return (
    <ContactsHUD sceneRadioContactsOnly={sceneRadioContactsOnly}>
      {({ open, hasIncoming, savedItems, inRangeItems, incomingItems, historyItems, dockInteriorItems, dockInteriorLabel, onSave, onSelect }) => (
        <div className="event-log" style={{ minWidth: '260px' }} aria-label="Communications">
          <div className="event-log-header">
            <button
              type="button"
              className={`event-log-tab${activeTab === 'radio' ? ' event-log-tab--active' : ''}${hasIncoming && activeTab !== 'radio' ? ' comms-tab--pulse' : ''}`}
              onClick={() => setActiveTab('radio')}
            >
              RADIO
            </button>
            <button
              type="button"
              className={`event-log-tab${activeTab === 'journal' ? ' event-log-tab--active' : ''}`}
              onClick={() => setActiveTab('journal')}
            >
              JOURNAL
              {activeMissionRef.current.length > 0 && (
                <span className="comms-tab-badge">{activeMissionRef.current.length}</span>
              )}
            </button>
            <button
              type="button"
              className={`event-log-tab${activeTab === 'messages' ? ' event-log-tab--active' : ''}`}
              onClick={() => setActiveTab('messages')}
            >
              MESSAGES
            </button>
            <button
              type="button"
              className={`event-log-tab${activeTab === 'contacts' ? ' event-log-tab--active' : ''}`}
              onClick={() => setActiveTab('contacts')}
            >
              CONTACTS
            </button>
          </div>
          {activeTab === 'radio' && (
            <>
              <div className="comms-layout">
                {/* Left: power controls */}
                <div className="comms-power">
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
                    {/*  <PadScanWaveform active={padScanActive} />*/}
                  </div>
                </div>

                {/* Right: radio contacts list */}
                <div className="comms-contacts">
                  <div className="comms-contacts-scroll">
                    {radioContacts.length === 0 ? (
                      <div className="event-log-empty">No contacts</div>
                    ) : (
                      radioContacts.map((c) => (
                        <div
                          key={c.id}
                          className={`event-log-line event-log-line--clickable${c.id === selectedContactId ? ' event-log-line--selected' : ''}`}
                          onClick={() => handleContactClick(c.id)}
                          role="button"
                          tabIndex={0}
                          title={`Select ${c.label}`}
                        >
                          <span className="event-log-text">{c.label}</span>
                          <span className="event-log-distance">{c.distance}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              {!hasIncoming ? (
                <button
                  type="button"
                  className={`mech-comms-hail-btn ${selectedContact ? '' : 'mech-comms-hail-btn--inactive'}`}
                  onClick={handleHail}
                  title={selectedContact ? `Hail ${selectedContact.label}` : '-'}
                  aria-label={selectedContact ? `Hail ${selectedContact.label}` : 'No contact selected'}
                >
                  <div className="mech-comms-hail-btn-icon" aria-hidden>
                    <RadioTower size={15} strokeWidth={1.75} />
                  </div>
                  <span className="mech-comms-hail-btn-label">
                    {selectedContact ? `HAIL ${selectedContact.label}` : 'No Contact Selected'}
                  </span>
                </button>
              ) : hasIncoming ? (
                <button
                  type="button"
                  className="mech-comms-hail-btn mech-comms-hail-btn--incoming"
                  onClick={open}
                  title="Accept incoming hail"
                  aria-label="Incoming hail — click to open"
                >
                  <div className="mech-comms-hail-btn-icon" aria-hidden>
                    <RadioTower size={15} strokeWidth={1.75} />
                  </div>
                  <div className="mech-comms-hail-btn-wave" aria-hidden>
                    {Array.from({ length: PAD_SCAN_WAVE_BARS }, (_, i) => (
                      <span
                        key={i}
                        className="mech-comms-hail-btn-bar"
                        style={{ animationDelay: `${i * 0.07}s` }}
                      />
                    ))}
                  </div>
                  <span className="mech-comms-hail-btn-label">INCOMING HAIL</span>
                </button>
              ) : null}
            </>
          )}
          {activeTab === 'journal' && <JournalPanel />}
          {activeTab === 'messages' && <HistoryPanel />}
          {activeTab === 'contacts' && (
            <ContactsPanel
              savedItems={savedItems}
              inRangeItems={inRangeItems}
              incomingItems={incomingItems}
              historyItems={historyItems}
              dockInteriorItems={dockInteriorItems}
              dockInteriorLabel={dockInteriorLabel}
              onSave={onSave}
              onSelect={onSelect}
            />
          )}
        </div>
      )}
    </ContactsHUD>
  );
}
