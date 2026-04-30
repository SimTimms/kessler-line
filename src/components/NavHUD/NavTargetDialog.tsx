import { useEffect, useRef } from 'react';
import { playDialogOpen, playDialogSelect } from '../../sound/SoundManager';
import './NavTargetDialog.css';

export interface NavTargetItem {
  id: string;
  label: string;
  sublabel?: string;
  distance?: string;
}

interface NavTargetDialogProps {
  generalItems?: NavTargetItem[];
  generalSectionLabel?: string;
  navItems: NavTargetItem[];
  navSectionLabel?: string;
  magneticItems: NavTargetItem[];
  driveItems: NavTargetItem[];
  showDriveItems?: boolean;
  selectedId?: string;
  highlightId?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function NavTargetDialog({
  generalItems = [],
  generalSectionLabel = 'GENERAL CONTACTS',
  navItems,
  navSectionLabel = 'NAV TARGETS',
  magneticItems,
  driveItems,
  showDriveItems = true,
  selectedId,
  highlightId,
  onSelect,
  onClose,
}: NavTargetDialogProps) {
  const soundFired = useRef(false);
  useEffect(() => {
    if (!soundFired.current) {
      soundFired.current = true;
      playDialogOpen();
    }
  }, []);

  function renderItem(item: NavTargetItem) {
    return (
      <button
        key={item.id}
        className={`ntd-item${item.id === selectedId ? ' ntd-item--active' : ''}${item.id === highlightId ? ' ntd-item--highlight' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          playDialogSelect();
          onSelect(item.id);
          onClose();
        }}
      >
        <span className="ntd-item-content">
          <span className="ntd-item-label">{item.label}</span>
          {item.sublabel && <span className="ntd-item-sublabel">{item.sublabel}</span>}
        </span>
        {item.distance && <span className="ntd-item-distance">{item.distance}</span>}
      </button>
    );
  }

  return (
    <div className="ntd-backdrop" onClick={onClose}>
      <div className="ntd-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="ntd-title">SELECT NAV TARGET</div>
        <div className="ntd-list">
          {generalItems.length > 0 && (
            <section>
              <div className="ntd-section-header">{generalSectionLabel}</div>
              {generalItems.map(renderItem)}
            </section>
          )}
          {navItems.length > 0 && (
            <section>
              <div className="ntd-section-header">{navSectionLabel}</div>
              {navItems.map(renderItem)}
            </section>
          )}
          {magneticItems.length > 0 && (
            <section>
              <div className="ntd-section-header">MAGNETIC CONTACTS</div>
              {magneticItems.map(renderItem)}
            </section>
          )}
          {showDriveItems && driveItems.length > 0 && (
            <section>
              <div className="ntd-section-header">DRIVE CONTACTS</div>
              {driveItems.map(renderItem)}
            </section>
          )}
        </div>
        <button className="ntd-close" onClick={onClose}>
          ✕ CLOSE
        </button>
      </div>
    </div>
  );
}
