import type { SelectionItem } from '../../ContactsHUD/ContactsHudDialog/ContactsHudDialog';
import { commsStatus } from '../../../context/HailManager';
import RowHailSlot from './RowHailSlot';
import '../../ContactsHUD/ContactsHudDialog/ContactsHudDialog.css';
import '../EventLogHUD/EventLogHUD.css';

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

// Status drives the row colour; the text itself goes in the row tooltip.
function itemStatusClass(item: SelectionItem): string {
  if (item.statusLine === commsStatus.rejected) return ' comms-contact-row--rejected';
  if (item.statusLine === commsStatus.radioActive) return ' comms-contact-row--radio-active';
  if (item.statusLine === commsStatus.receiving) return ' comms-contact-row--receiving';
  if (item.statusLine === commsStatus.none) return ' comms-contact-row--out-of-range';
  if (item.statusLine === commsStatus.accepted) return ' comms-contact-row--accepted';
  if (item.statusLine === commsStatus.pending) return ' comms-contact-row--pending';
  return '';
}

function renderItem(
  item: SelectionItem,
  onSelect: (id: string) => void,
  onSave?: (id: string) => void
) {
  const incoming = item.statusLine === commsStatus.incoming;
  const title = [item.label, item.sublabel, item.statusLine].filter(Boolean).join(' · ');

  return (
    <div
      key={item.id}
      className={`event-log-line event-log-line--clickable comms-contact-row${itemStatusClass(item)}${
        item.statusIcon ? ' comms-contact-row--unread' : ''
      }`}
      onClick={() => onSelect(item.id)}
      role="button"
      tabIndex={0}
      title={title}
    >
      {item.avatarSrc && <img className="comms-contact-avatar" src={item.avatarSrc} alt="" />}
      <span className="event-log-text">{item.label}</span>
      {item.missionFlag && <span className="comms-contact-flag">{item.missionFlag}</span>}
      {item.statusIcon && <span className="comms-contact-unread">{item.statusIcon}</span>}
      <span className="event-log-distance">{item.sublabel}</span>
      <RowHailSlot label={item.label} incoming={incoming} onAnswer={() => onSelect(item.id)} />
      {onSave && item.saveable && (
        <button
          type="button"
          className="comms-contact-save"
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
            {dockInteriorItems.map((item) => renderItem(item, onSelect))}
          </section>
        )}
        {incomingItems.length > 0 && (
          <section>{incomingItems.map((item) => renderItem(item, onSelect))}</section>
        )}
        {historyItems.length > 0 && (
          <section>{historyItems.map((item) => renderItem(item, onSelect))}</section>
        )}
        {savedItems.length > 0 && (
          <section>
            <div className="chd-section-header">SAVED CONTACTS</div>
            {savedItems.map((item) => renderItem(item, onSelect))}
          </section>
        )}
        {inRangeItems.length > 0 && (
          <section>{inRangeItems.map((item) => renderItem(item, onSelect, onSave))}</section>
        )}
        {empty && <div className="event-log-empty">No contacts</div>}
      </div>
    </div>
  );
}
