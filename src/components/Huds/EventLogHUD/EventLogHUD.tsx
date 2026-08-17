import { useCallback, useEffect, useState } from 'react';
import {
  getEventLog,
  subscribeEventLog,
  deleteEventLogEntry,
  clearEventLog,
  isClickableScannerType,
  EVENT_LOG_TAG_LABEL,
  VISIBLE_ENTRIES,
  type EventLogEntry,
} from './EventLogStore';
import { getContactsByScanner, getPlanetItems, subscribeContactStore } from './ContactStore';
import type { ScannerRangeId } from '../../../config/scanRanges';
import type { NavScanContact } from '../NavHUD/navScanPickerContacts';
import type { NavTargetItem } from '../NavHUD/NavTargetDialog';
import { requestOpenScanPicker } from '../../../context/NavHud';
import './EventLogHUD.css';

type TabId = 'log' | ScannerRangeId | 'nav';

const TAB_ORDER: { id: TabId; label: string }[] = [
  { id: 'log', label: 'LOG' },
  { id: 'magnet', label: 'MAG' },
  { id: 'proximity', label: 'PRX' },
  { id: 'drive', label: 'DRV' },
  { id: 'radio', label: 'RAD' },
  { id: 'radiation', label: 'RDN' },
  { id: 'nav', label: 'NAV' },
];

export const EVENT_LOG_CONTACT_SELECT = 'EventLogContactSelect';

function useEventLog(): readonly EventLogEntry[] {
  const [items, setItems] = useState(() => getEventLog());
  useEffect(() => subscribeEventLog(() => setItems(getEventLog())), []);
  return items;
}

function useContactStore(): {
  contacts: Record<ScannerRangeId, NavScanContact[]>;
  planets: NavTargetItem[];
} {
  const [contacts, setContacts] = useState(() => getContactsByScanner());
  const [planets, setPlanets] = useState(() => getPlanetItems());
  useEffect(
    () =>
      subscribeContactStore(() => {
        setContacts(getContactsByScanner());
        setPlanets(getPlanetItems());
      }),
    []
  );
  return { contacts, planets };
}

function tabCount(
  tabId: TabId,
  contacts: Record<ScannerRangeId, NavScanContact[]>,
  planets: NavTargetItem[],
  logItems: readonly EventLogEntry[]
): number | undefined {
  if (tabId === 'log') return logItems.length > 0 ? logItems.length : undefined;
  if (tabId === 'nav') return planets.length > 0 ? planets.length : undefined;
  const list = contacts[tabId as ScannerRangeId];
  return list && list.length > 0 ? list.length : undefined;
}

export default function EventLogHUD() {
  const allItems = useEventLog();
  const visible = allItems.slice(0, VISIBLE_ENTRIES);
  const { contacts, planets } = useContactStore();
  const [activeTab, setActiveTab] = useState<TabId>('log');

  const handleDelete = useCallback((e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteEventLogEntry(id);
  }, []);

  const handlePurge = useCallback(() => {
    clearEventLog();
  }, []);

  const handleLineClick = useCallback((entry: EventLogEntry) => {
    if (isClickableScannerType(entry.type)) {
      requestOpenScanPicker(entry.type);
    }
  }, []);

  const handleContactClick = useCallback((id: string) => {
    window.dispatchEvent(new CustomEvent(EVENT_LOG_CONTACT_SELECT, { detail: { id } }));
  }, []);

  return (
    <div className="event-log" aria-label="Event Log" aria-live="polite">
      <div className="event-log-header">
        <div className="event-log-tabs">
          {TAB_ORDER.map((tab) => {
            const count = tabCount(tab.id, contacts, planets, allItems);
            return (
              <button
                key={tab.id}
                className={`event-log-tab${activeTab === tab.id ? ' event-log-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {<span className="event-log-tab-count">{count ? count : 0}</span>}
              </button>
            );
          })}
        </div>
        {activeTab === 'log' && allItems.length > 0 && (
          <button className="event-log-purge" onClick={handlePurge} title="Purge all logs">
            Purge
          </button>
        )}
      </div>
      <div className="event-log-scroll">
        {activeTab === 'log' &&
          visible.map((entry) => {
            const clickable = isClickableScannerType(entry.type);
            return (
              <div
                key={entry.id}
                className={`event-log-line ${clickable ? ' event-log-line--clickable' : ''}`}
                onClick={clickable ? () => handleLineClick(entry) : undefined}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                title={clickable ? `Open ${EVENT_LOG_TAG_LABEL[entry.type]} contacts` : undefined}
              >
                <span className="event-log-text event-tag">
                  {EVENT_LOG_TAG_LABEL[entry.type]} |{' '}
                </span>
                <span className="event-log-text">{entry.text}</span>
                <button
                  className="event-log-delete"
                  onClick={(e) => handleDelete(e, entry.id)}
                  title="Delete entry"
                  aria-label="Delete log entry"
                >
                  -
                </button>
              </div>
            );
          })}

        {activeTab !== 'log' && activeTab !== 'nav' && (
          <>
            {contacts[activeTab].length === 0 ? (
              <div className="event-log-empty">No contacts</div>
            ) : (
              contacts[activeTab].map((c) => (
                <div
                  key={c.id}
                  className="event-log-line event-log-line--clickable"
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
          </>
        )}

        {activeTab === 'nav' && (
          <>
            {planets.length === 0 ? (
              <div className="event-log-empty">No planets</div>
            ) : (
              planets.map((p) => (
                <div
                  key={p.id}
                  className="event-log-line event-log-line--clickable"
                  onClick={() => handleContactClick(p.id)}
                  role="button"
                  tabIndex={0}
                  title={`Select ${p.label}`}
                >
                  <span className="event-log-text">{p.label}</span>
                  <span className="event-log-distance">{p.distance}</span>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
