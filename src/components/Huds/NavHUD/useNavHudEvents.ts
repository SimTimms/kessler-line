import { useState, useRef, useEffect } from 'react';
import {
  isNavScanPickerVariant,
  type NavScanPickerId,
} from '../../../config/navScanPickerConfig';
import { EVENT_OPEN_SCAN_PICKER } from '../../../context/NavHud';

// ── Docking state ─────────────────────────────────────────────────────

export interface DockingState {
  isDocked: boolean;
  dockedStationId: string | null;
  isDockedRef: React.MutableRefObject<boolean>;
}

/** Tracks ship docking state via ShipDocked / ShipUndocked window events. */
export function useDockingState(): DockingState {
  const [isDocked, setIsDocked] = useState(false);
  const [dockedStationId, setDockedStationId] = useState<string | null>(null);
  const isDockedRef = useRef(false);

  useEffect(() => {
    const onDocked = (e: Event) => {
      const detail = (e as CustomEvent<{ stationId: string | null }>).detail;
      isDockedRef.current = true;
      setIsDocked(true);
      setDockedStationId(detail?.stationId ?? null);
    };
    const onUndocked = () => {
      isDockedRef.current = false;
      setIsDocked(false);
      setDockedStationId(null);
    };
    window.addEventListener('ShipDocked', onDocked);
    window.addEventListener('ShipUndocked', onUndocked);
    return () => {
      window.removeEventListener('ShipDocked', onDocked);
      window.removeEventListener('ShipUndocked', onUndocked);
    };
  }, []);

  return { isDocked, dockedStationId, isDockedRef };
}

// ── Selected world object ─────────────────────────────────────────────

export interface SelectedTargetState {
  selectedObjName: string | null;
  selectedObjNameRef: React.MutableRefObject<string | null>;
  setSelectedObjName: (name: string | null) => void;
}

/** Tracks the currently-clicked world object via SelectedTargetChanged events. */
export function useSelectedTarget(): SelectedTargetState {
  const [selectedObjName, setSelectedObjName] = useState<string | null>(null);
  const selectedObjNameRef = useRef<string | null>(null);

  useEffect(() => {
    const onSelectedTargetChanged = (e: Event) => {
      const { name } = (e as CustomEvent<{ name: string | null; type: string | null }>).detail;
      selectedObjNameRef.current = name;
      setSelectedObjName(name);
    };
    window.addEventListener('SelectedTargetChanged', onSelectedTargetChanged);
    return () => window.removeEventListener('SelectedTargetChanged', onSelectedTargetChanged);
  }, []);

  return { selectedObjName, selectedObjNameRef, setSelectedObjName };
}

// ── Tutorial highlights ───────────────────────────────────────────────

export interface TutorialHighlightState {
  navTargetHighlight: boolean;
  setNavTargetHighlight: (v: boolean) => void;
  highlightedContactId: string | undefined;
}

/** Tracks tutorial highlight pulses for nav target button and contact list items. */
export function useTutorialHighlights(): TutorialHighlightState {
  const [navTargetHighlight, setNavTargetHighlight] = useState(false);
  const [highlightedContactId, setHighlightedContactId] = useState<string | undefined>();

  useEffect(() => {
    const onStart = () => setNavTargetHighlight(true);
    const onStop = () => setNavTargetHighlight(false);
    window.addEventListener('NavTargetHighlightStart', onStart);
    window.addEventListener('NavTargetHighlightStop', onStop);
    return () => {
      window.removeEventListener('NavTargetHighlightStart', onStart);
      window.removeEventListener('NavTargetHighlightStop', onStop);
    };
  }, []);

  useEffect(() => {
    const onStart = (e: Event) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      setHighlightedContactId(id);
    };
    const onStop = () => setHighlightedContactId(undefined);
    window.addEventListener('NavContactHighlightStart', onStart);
    window.addEventListener('NavContactHighlightStop', onStop);
    return () => {
      window.removeEventListener('NavContactHighlightStart', onStart);
      window.removeEventListener('NavContactHighlightStop', onStop);
    };
  }, []);

  return { navTargetHighlight, setNavTargetHighlight, highlightedContactId };
}

// ── Nav target sync (external set/clear) ──────────────────────────────

/** Syncs nav target from external NavTargetSet / NavTargetCleared window events. */
export function useNavTargetSync(
  setTargetId: (id: string) => void,
  setTargetLabel: (label: string) => void,
  setSelectedObjName: (name: string | null) => void,
  selectedObjNameRef: { current: string | null },
): void {
  useEffect(() => {
    const onNavTargetSet = (e: Event) => {
      const { id, label } = (e as CustomEvent<{ id: string; label: string }>).detail;
      setTargetId(id);
      setTargetLabel(label);
    };
    const onNavTargetCleared = () => {
      setTargetId('');
      setTargetLabel('');
      setSelectedObjName(null);
      selectedObjNameRef.current = null;
    };
    window.addEventListener('NavTargetSet', onNavTargetSet);
    window.addEventListener('NavTargetCleared', onNavTargetCleared);
    return () => {
      window.removeEventListener('NavTargetSet', onNavTargetSet);
      window.removeEventListener('NavTargetCleared', onNavTargetCleared);
    };
  }, []);
}

// ── Scan picker events ────────────────────────────────────────────────

/** Opens a filtered scan-contact picker when requested externally. */
export function useScanPickerEvents(
  setDialogOpen: (v: boolean) => void,
  setOpenScanPicker: (v: NavScanPickerId | null) => void,
): void {
  useEffect(() => {
    const onOpenScanPicker = (e: Event) => {
      const { scanId } = (e as CustomEvent<{ scanId: string }>).detail ?? {};
      if (!scanId || !isNavScanPickerVariant(scanId)) return;
      setDialogOpen(false);
      setOpenScanPicker(scanId);
    };
    window.addEventListener(EVENT_OPEN_SCAN_PICKER, onOpenScanPicker);
    return () => window.removeEventListener(EVENT_OPEN_SCAN_PICKER, onOpenScanPicker);
  }, []);
}

// ── Auto-close empty scan picker ──────────────────────────────────────

/** Closes the scan picker dialog when its contact list drops to zero. */
export function useAutoCloseScanPicker(
  openScanPicker: NavScanPickerId | null,
  contactCounts: Record<NavScanPickerId, number>,
  setOpenScanPicker: (v: NavScanPickerId | null) => void,
): void {
  useEffect(() => {
    if (!openScanPicker) return;
    if (contactCounts[openScanPicker] === 0) {
      setOpenScanPicker(null);
    }
  }, [openScanPicker, contactCounts]);
}
