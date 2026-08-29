import type { SelectionItem } from '../../ContactsHUD/ContactsHudDialog/ContactsHudDialog';
import { commsStatus } from '../../../context/HailManager';
import '../../ContactsHUD/ContactsHudDialog/ContactsHudDialog.css';

interface ContactsPanelProps {
  savedItems: SelectionItem[];
  inRangeItems: SelectionItem[];
  incomingItems: SelectionItem[];
  historyItems: SelectionItem[];
  dockInteriorItems: SelectionItem[];
  dockInteriorLabel?: string;
  onSave: (id: string) => void;
  onSelect: (id: string) => void;
}

function itemStatusClass(item: SelectionItem): string {
  if (item.statusLine === commsStatus.incoming) return ' chd-item-content--incoming';
  if (item.statusLine === commsStatus.rejected) return ' chd-item-content--rejected';
  if (item.statusLine === commsStatus.radioActive) return ' chd-item-content--radio-active';
  if (item.statusLine === commsStatus.none) return ' chd-item-content--out-of-range';
  if (item.statusLine === commsStatus.accepted) return ' chd-item-content--accepted';
  if (item.statusLine === commsStatus.pending) return ' chd-item-content--pending';
  return '';
}

function renderItem(
  item: SelectionItem,
  onSelect: (id: string) => void,
  onSave?: (id: string) => void,
  isDockInterior = false,
) {
  const cls = `chd-item${item.statusIcon ? ' chd-item--unread' : ''}${itemStatusClass(item)}`;
  return (
    <div key={item.id} className={`chd-item-row${isDockInterior ? ' chd-item-row--docked' : ''}`}>
      <button
        className={cls}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(item.id);
        }}
      >
        {item.avatarSrc ? <img className="chd-item-avatar" src={item.avatarSrc} /> : null}
        <span className="chd-item-content">
          <span className="chd-item-label">{item.label}</span>
          {item.sublabel && <span className="chd-item-sublabel">{item.sublabel}</span>}
          {item.statusLine && (
            <span
              className={`chd-item-status-line${item.statusPulse ? ' chd-item-status-line--pulse' : ''}`}
            >
              {item.statusLine}
            </span>
          )}
        </span>
        {item.missionFlag && (
          <span className="chd-mission-flag">{item.missionFlag}</span>
        )}
      </button>
      {onSave && item.saveable && (
        <button
          className="chd-save-btn"
          title="Save contact"
          onClick={(e) => {
            e.stopPropagation();
            onSave(item.id);
          }}
        >
          [+]
        </button>
      )}
    </div>
  );
}

export default function ContactsPanel({
  savedItems,
  inRangeItems,
  incomingItems,
  historyItems,
  dockInteriorItems,
  dockInteriorLabel,
  onSave,
  onSelect,
}: ContactsPanelProps) {
  const empty =
    savedItems.length === 0 &&
    inRangeItems.length === 0 &&
    incomingItems.length === 0 &&
    historyItems.length === 0 &&
    dockInteriorItems.length === 0;

  return (
    <div className="comms-contacts-panel">
      <div className="comms-contacts-panel-scroll">
        {dockInteriorItems.length > 0 && (
          <section className="chd-section chd-section--dock-interior">
            <div className="chd-section-header">
              {dockInteriorLabel ? `ABOARD · ${dockInteriorLabel}` : 'DOCK INTERIOR'}
            </div>
            {dockInteriorItems.map((item) => renderItem(item, onSelect, undefined, true))}
          </section>
        )}
        {incomingItems.length > 0 && (
          <section>
            <div className="chd-section-header">INCOMING HAIL</div>
            {incomingItems.map((item) => renderItem(item, onSelect))}
          </section>
        )}
        {historyItems.length > 0 && (
          <section>
            <div className="chd-section-header">HISTORY</div>
            {historyItems.map((item) => renderItem(item, onSelect))}
          </section>
        )}
        {savedItems.length > 0 && (
          <section>
            <div className="chd-section-header">SAVED CONTACTS</div>
            {savedItems.map((item) => renderItem(item, onSelect))}
          </section>
        )}
        {inRangeItems.length > 0 && (
          <section>
            <div className="chd-section-header">IN RANGE</div>
            {inRangeItems.map((item) => renderItem(item, onSelect, onSave))}
          </section>
        )}
        {empty && <div className="event-log-empty">No contacts</div>}
      </div>
    </div>
  );
}
