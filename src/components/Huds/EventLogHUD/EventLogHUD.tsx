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
import { requestOpenScanPicker } from '../../../context/NavHud';
import './EventLogHUD.css';

function useEventLog(): readonly EventLogEntry[] {
  const [items, setItems] = useState(() => getEventLog());
  useEffect(() => subscribeEventLog(() => setItems(getEventLog())), []);
  return items;
}

export default function EventLogHUD() {
  const allItems = useEventLog();
  const visible = allItems.slice(0, VISIBLE_ENTRIES);

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

  return (
    <div className="event-log" aria-label="Event Log" aria-live="polite">
      <div className="event-log-header">
        <span className="hud-title">Log</span>
        {allItems.length > 0 && (
          <button className="event-log-purge" onClick={handlePurge} title="Purge all logs">
            Purge
          </button>
        )}
      </div>
      <div className="event-log-scroll">
        {visible.map((entry) => {
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
              <span className="event-log-text event-tag">{EVENT_LOG_TAG_LABEL[entry.type]} | </span>
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
      </div>
    </div>
  );
}
