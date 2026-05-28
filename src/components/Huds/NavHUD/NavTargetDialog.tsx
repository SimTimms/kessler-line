import { useEffect, useRef, type CSSProperties } from 'react';
import {
  getNavScanPickerTheme,
  isNavScanPickerVariant,
  type NavScanPickerId,
} from '../../../config/navScanPickerConfig';
import { playDialogOpen, playDialogSelect } from '../../../sound/SoundManager';
import './NavTargetDialog.css';

export interface NavTargetItem {
  id: string;
  label: string;
  sublabel?: string;
  distance?: string;
}

export type NavTargetDialogVariant = 'full' | NavScanPickerId | 'magnetic-only';

interface NavTargetDialogProps {
  variant?: NavTargetDialogVariant;
  /** Single list for scan picker variants (`magnetic-only` → magnet). */
  scanItems?: NavTargetItem[];
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

function resolveScanPickerId(variant: NavTargetDialogVariant): NavScanPickerId | null {
  if (variant === 'full') return null;
  if (variant === 'magnetic-only') return 'magnet';
  return isNavScanPickerVariant(variant) ? variant : null;
}

export function NavTargetDialog({
  variant = 'full',
  scanItems,
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
  const scanPickerId = resolveScanPickerId(variant);
  const scanOnly = scanPickerId !== null;
  const pickerItems =
    scanItems ??
    (scanPickerId === 'magnet'
      ? magneticItems
      : scanPickerId === 'drive'
        ? driveItems
        : []);

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

  const theme = scanPickerId ? getNavScanPickerTheme(scanPickerId) : null;
  const dialogClass = scanOnly
    ? `ntd-dialog ntd-dialog--scan ntd-dialog--scan-${scanPickerId}`
    : 'ntd-dialog';
  const title = scanOnly ? theme!.title : 'SELECT NAV TARGET';

  return (
    <div className="ntd-backdrop" onClick={onClose}>
      <div
        className={dialogClass}
        onClick={(e) => e.stopPropagation()}
        style={theme ? ({ '--ntd-scan-color': theme.color } as CSSProperties) : undefined}
      >
        {theme && (
          <span className="ntd-scan-brand" aria-hidden>
            {theme.headerBrand}
          </span>
        )}
        <div className="ntd-title">{title}</div>
        <div className="ntd-list">
          {!scanOnly && generalItems.length > 0 && (
            <section>
              <div className="ntd-section-header">{generalSectionLabel}</div>
              {generalItems.map(renderItem)}
            </section>
          )}
          {!scanOnly && navItems.length > 0 && (
            <section>
              <div className="ntd-section-header">{navSectionLabel}</div>
              {navItems.map(renderItem)}
            </section>
          )}
          {scanOnly ? (
            <>
              {pickerItems.length > 0 ? pickerItems.map(renderItem) : null}
              {pickerItems.length === 0 && (
                <div className="ntd-empty">{theme!.emptyMessage}</div>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
        <button className="ntd-close" onClick={onClose}>
          ✕ CLOSE
        </button>
      </div>
    </div>
  );
}
