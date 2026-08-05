import { useState, useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { NAV_TARGET_DEFS, displayNameForDockedStation } from '../../../config/worldConfig';
import { navTargetIdRef, hasNavTarget } from '../../../context/NavTarget';
import { orbitStatusRef } from '../../../context/ShipState';
import {
  NAV_SCAN_PICKER_ORDER,
  getNavScanPickerTheme,
  type NavScanPickerId,
} from '../../../config/navScanPickerConfig';
import type { NavScanContact } from './navScanPickerContacts';
import { useNavHudScanning } from './useNavHudScanning';
import {
  useDockingState,
  useSelectedTarget,
  useTutorialHighlights,
  useNavTargetSync,
  useScanPickerEvents,
  useAutoCloseScanPicker,
} from './useNavHudEvents';
import { toNavTargetItems } from './navHudFormatters';
import {
  handleNavTargetSelect,
  toggleApproachAutopilot,
  toggleVelocityMatch,
  clearAllNavTargets,
  requestUndock,
  type SelectDispatch,
  type ClearNavTargetDispatch,
} from './navHudHandlers';
import { NavTargetDialog } from './NavTargetDialog';
import './NavHUD.css';
import '../HelmetHUD/HelmetHUD.css';
import {
  EVENT_DOCK_PERMISSION_CANDIDATE_CHANGED,
  EVENT_DOCK_PERMISSION_CHANGED,
  getDockPermissionCandidate,
  hasDockPermission,
  type DockPermissionCandidate,
} from '../../../context/DockPermissionState';
import { EVENT_OPEN_COMMS_CONTACT } from '../../../context/CommsUiEvents';

const NAV_TARGETS = NAV_TARGET_DEFS;

export interface TutorialTargetDef {
  id: string;
  label: string;
  getPosition: (v: THREE.Vector3) => THREE.Vector3;
  getVelocity?: (v: THREE.Vector3) => THREE.Vector3;
}

interface NavHUDProps {
  layout?: 'classic' | 'helmet';
  disableElements: string[];
  focusElements: string[];
  onNavTargetClick?: (id: string) => void;
  customGeneralTargets?: TutorialTargetDef[];
  customPlanetaryTargets?: TutorialTargetDef[];
}

export const NavHUD = ({
  layout = 'classic',
  disableElements: _disableElements,
  focusElements,
  onNavTargetClick,
  customGeneralTargets,
  customPlanetaryTargets,
}: NavHUDProps) => {
  // ── State owned by this component ─────────────────────────────────
  const [targetId, setTargetId] = useState(navTargetIdRef.current);
  const [targetLabel, setTargetLabel] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openScanPicker, setOpenScanPicker] = useState<NavScanPickerId | null>(null);
  const [dockPermissionCandidate, setDockPermissionCandidate] =
    useState<DockPermissionCandidate | null>(() => getDockPermissionCandidate());
  const [, bumpDockPermissionVersion] = useState(0);

  const undockBtnRef = useRef<HTMLButtonElement>(null);
  const velVec = useRef(new THREE.Vector3());

  useEffect(() => {
    const onCandidateChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ candidate: DockPermissionCandidate | null }>).detail;
      setDockPermissionCandidate(detail?.candidate ?? null);
    };
    const onPermissionChanged = () => {
      bumpDockPermissionVersion((v) => v + 1);
    };
    window.addEventListener(EVENT_DOCK_PERMISSION_CANDIDATE_CHANGED, onCandidateChanged);
    window.addEventListener(EVENT_DOCK_PERMISSION_CHANGED, onPermissionChanged);
    return () => {
      window.removeEventListener(EVENT_DOCK_PERMISSION_CANDIDATE_CHANGED, onCandidateChanged);
      window.removeEventListener(EVENT_DOCK_PERMISSION_CHANGED, onPermissionChanged);
    };
  }, []);

  // ── State owned by hooks ──────────────────────────────────────────
  const { isDocked, dockedStationId, isDockedRef } = useDockingState();
  const { selectedObjName, selectedObjNameRef, setSelectedObjName } = useSelectedTarget();
  const { navTargetHighlight, setNavTargetHighlight, highlightedContactId } =
    useTutorialHighlights();

  const {
    displayRefs,
    navItems,
    generalItems,
    magneticContacts,
    driveContacts,
    proximityContacts,
    radioContacts,
    radiationContacts,
  } = useNavHudScanning({
    layout,
    focusElements,
    customGeneralTargets,
    customPlanetaryTargets,
    selectedObjNameRef,
    isDockedRef,
    undockBtnRef,
  });

  // ── Event sync hooks ──────────────────────────────────────────────
  useNavTargetSync(setTargetId, setTargetLabel, setSelectedObjName, selectedObjNameRef);
  useScanPickerEvents(setDialogOpen, setOpenScanPicker);

  const contactCounts = useMemo<Record<NavScanPickerId, number>>(
    () => ({
      magnet: magneticContacts.length,
      drive: driveContacts.length,
      proximity: proximityContacts.length,
      radio: radioContacts.length,
      radiation: radiationContacts.length,
    }),
    [magneticContacts, driveContacts, proximityContacts, radioContacts, radiationContacts]
  );
  useAutoCloseScanPicker(openScanPicker, contactCounts, setOpenScanPicker);

  // ── Derived state ─────────────────────────────────────────────────

  const customGeneralMatch = customGeneralTargets?.find((t) => t.id === targetId);
  const customPlanetaryMatch = customPlanetaryTargets?.find((t) => t.id === targetId);
  const navMatch = NAV_TARGETS.find((t) => t.id === targetId);
  const magneticMatch = magneticContacts.find((c) => c.id === targetId);
  const driveMatch = driveContacts.find((c) => c.id === targetId);
  const proximityMatch = proximityContacts.find((c) => c.id === targetId);
  const radioMatch = radioContacts.find((c) => c.id === targetId);
  const radiationMatch = radiationContacts.find((c) => c.id === targetId);

  const resolvedTargetLabel =
    customGeneralMatch?.label ??
    customPlanetaryMatch?.label ??
    magneticMatch?.label ??
    driveMatch?.label ??
    proximityMatch?.label ??
    radioMatch?.label ??
    radiationMatch?.label ??
    (customGeneralTargets || customPlanetaryTargets ? undefined : navMatch?.label) ??
    targetLabel;
  const displayLabel =
    selectedObjName ?? resolvedTargetLabel ?? (hasNavTarget() ? 'select a target.' : '');

  const hasActiveNavTarget = targetId.trim().length > 0;
  const autopilotEnabled = hasActiveNavTarget;

  const magneticItems = toNavTargetItems(magneticContacts);
  const driveItems = toNavTargetItems(driveContacts);

  const scanContactsByPicker: Record<NavScanPickerId, NavScanContact[]> = {
    magnet: magneticContacts,
    drive: driveContacts,
    proximity: proximityContacts,
    radio: radioContacts,
    radiation: radiationContacts,
  };

  const scanTargetActiveByPicker: Record<NavScanPickerId, boolean> = {
    magnet: magneticMatch !== undefined,
    drive: driveMatch !== undefined,
    proximity: proximityMatch !== undefined,
    radio: radioMatch !== undefined,
    radiation: radiationMatch !== undefined,
  };

  const scanPickersWithContacts = NAV_SCAN_PICKER_ORDER.filter(
    (scanId) => scanContactsByPicker[scanId].length > 0
  );

  const totalNavContactCount =
    navItems.length +
    generalItems.length +
    magneticContacts.length +
    driveContacts.length +
    proximityContacts.length +
    radioContacts.length +
    radiationContacts.length;
  const hasDockPermissionRequestTarget =
    dockPermissionCandidate != null && !hasDockPermission(dockPermissionCandidate.stationId);

  // ── Handlers ──────────────────────────────────────────────────────

  const selectDispatch: SelectDispatch = { setTargetId, setTargetLabel, setSelectedObjName };
  const clearDispatch: ClearNavTargetDispatch = {
    ...selectDispatch,
    selectedObjNameRef,
    setOpenScanPicker,
  };

  const handleSelect = (id: string) => {
    const allScanContacts = [
      ...magneticContacts,
      ...driveContacts,
      ...proximityContacts,
      ...radioContacts,
      ...radiationContacts,
    ];
    handleNavTargetSelect(
      id,
      selectDispatch,
      allScanContacts,
      velVec.current,
      customGeneralTargets,
      customPlanetaryTargets
    );
  };

  const handleClearNavTarget = () => clearAllNavTargets(clearDispatch);
  const handleAutopilot = () => toggleApproachAutopilot(autopilotEnabled);
  const handleVelocityMatch = () => toggleVelocityMatch();
  const openDockPermissionComms = () => {
    if (!dockPermissionCandidate) return;
    window.dispatchEvent(
      new CustomEvent(EVENT_OPEN_COMMS_CONTACT, {
        detail: { contactId: dockPermissionCandidate.stationId },
      })
    );
  };

  const openNavTargetDialog = () => {
    setOpenScanPicker(null);
    setDialogOpen(true);
    setNavTargetHighlight(false);
    onNavTargetClick?.(targetId);
  };

  const openScanPickerDialog = (scanId: NavScanPickerId) => {
    setDialogOpen(false);
    setOpenScanPicker(scanId);
  };

  // ── Dialogs ───────────────────────────────────────────────────────

  const scanPickerDialog = openScanPicker ? (
    <NavTargetDialog
      variant={openScanPicker}
      scanItems={toNavTargetItems(scanContactsByPicker[openScanPicker])}
      navItems={[]}
      magneticItems={[]}
      driveItems={[]}
      showDriveItems={false}
      selectedId={targetId}
      highlightId={highlightedContactId}
      onSelect={handleSelect}
      onClose={() => setOpenScanPicker(null)}
    />
  ) : null;

  const navTargetDialog = dialogOpen ? (
    <NavTargetDialog
      generalItems={generalItems}
      generalSectionLabel="GENERAL CONTACTS"
      navItems={navItems}
      navSectionLabel="PLANETARY CONTACTS"
      magneticItems={magneticItems}
      driveItems={driveItems}
      showDriveItems={true}
      selectedId={targetId}
      highlightId={highlightedContactId}
      onSelect={handleSelect}
      onClose={() => setDialogOpen(false)}
    />
  ) : null;

  // ── Render ────────────────────────────────────────────────────────

  if (layout === 'helmet') {
    return (
      <>
        <div className="helmet-nav mech-nav">
          <div className="mech-nav-bezel">
            <div className="mech-nav-head">
              <span className="mech-nav-lamp" aria-hidden />
              <span className="mech-nav-title">NAV</span>
              <span className="mech-nav-sub">CONTACTS</span>
            </div>
            {isDocked ? (
              <div className="helmet-nav-docked">
                <span className="helmet-nav-tag">DOCK</span>
                <span className="helmet-nav-name">
                  {displayNameForDockedStation(dockedStationId)}
                </span>
                <span className="helmet-nav-tag">SPD</span>
                <span ref={displayRefs.speed} className="helmet-nav-speed hud-value" />
                <button
                  ref={undockBtnRef}
                  type="button"
                  className="helmet-nav-btn"
                  onClick={requestUndock}
                >
                  UNDOCK
                </button>
              </div>
            ) : (
              <>
                <div className="helmet-nav-target-line">
                  <div className="helmet-nav-scan-chip helmet-nav-scan-chip--tgt">
                    <span className="helmet-nav-scan-label">TGT</span>
                    <button
                      type="button"
                      className={`helmet-nav-btn helmet-nav-btn--contacts${hasActiveNavTarget ? ' helmet-nav-btn--contacts-filled' : ''}${navTargetHighlight ? ' helmet-nav-btn--highlight' : ''}`}
                      onClick={openNavTargetDialog}
                      title={
                        hasActiveNavTarget
                          ? displayLabel || 'Nav target'
                          : `Select nav target (${totalNavContactCount} contacts)`
                      }
                      aria-label={
                        hasActiveNavTarget ? `Nav target: ${displayLabel}` : 'Open contacts'
                      }
                    >
                      <span className="helmet-nav-btn--contacts-face">
                        {hasActiveNavTarget ? displayLabel || '\u2014' : 'CONTACTS'}
                      </span>
                    </button>
                  </div>
                  {hasActiveNavTarget ? (
                    <button
                      type="button"
                      className="helmet-nav-btn helmet-nav-btn--clear-target"
                      onClick={handleClearNavTarget}
                      title="Clear nav target"
                      aria-label="Clear nav target"
                    >
                      ✕
                    </button>
                  ) : (
                    <div className="helmet-nav-scan-chip">
                      <span className="helmet-nav-scan-label">CON</span>
                      <button
                        type="button"
                        className="helmet-nav-btn helmet-nav-btn--scan"
                        onClick={openNavTargetDialog}
                        title="All contacts"
                        aria-label={`${totalNavContactCount} contacts`}
                      >
                        {totalNavContactCount}
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    className={`helmet-nav-btn helmet-nav-btn--ap${!autopilotEnabled ? ' helmet-nav-btn--disabled' : ''}`}
                    onClick={handleAutopilot}
                    disabled={!autopilotEnabled}
                    title={autopilotEnabled ? 'Autopilot' : 'Set a nav target first'}
                  >
                    AP <span ref={displayRefs.autopilotBtn} className="helmet-ap-state" />
                  </button>
                </div>
                <div className="helmet-nav-row helmet-nav-metrics">
                  <div className="helmet-nav-metric">
                    <span className="helmet-nav-tag">SPD</span>
                    <span ref={displayRefs.speed} className="helmet-nav-speed hud-value" />
                  </div>
                  <div className="helmet-nav-metric helmet-nav-metric--rel">
                    <span className="helmet-nav-tag">Δv</span>
                    <span
                      ref={displayRefs.relativeVel}
                      className="helmet-nav-dv hud-value nav-relative-velocity"
                    />
                    {hasDockPermissionRequestTarget ? (
                      <button
                        type="button"
                        className="helmet-nav-btn nav-dock-permission-btn"
                        onClick={openDockPermissionComms}
                        title={`Request dock permission from ${dockPermissionCandidate?.label ?? 'dock'}`}
                      >
                        REQUEST DOCK PERMISSION
                      </button>
                    ) : (
                      <span ref={displayRefs.dockingHint} className="nav-target-dock-hint" />
                    )}
                  </div>
                </div>
                <span ref={displayRefs.orbitLine} className="helmet-nav-orbit" />
              </>
            )}
          </div>
        </div>
        {navTargetDialog}
        {scanPickerDialog}
      </>
    );
  }

  return (
    <>
      <div className="hud-bar-wrapper ">
        <div className="hud-bar">
          {isDocked ? (
            <div className="nav-target-group nav-docked-group">
              <div className="nav-target-label">Docked with</div>
              <div className="nav-docked-cluster">
                <span className="nav-docked-station-name">
                  {displayNameForDockedStation(dockedStationId)}
                </span>
                <button
                  ref={undockBtnRef}
                  type="button"
                  className="nav-target-btn nav-undock-btn"
                  onClick={requestUndock}
                >
                  Undock
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="nav-target-group">
                <div className="nav-target-label">Nav Target</div>
                <div className="nav-target-cluster">
                  <button
                    type="button"
                    className={`nav-target-btn nav-target-btn--open${navTargetHighlight ? ' nav-target-btn--highlight' : ''}`}
                    onClick={openNavTargetDialog}
                  >
                    Open
                  </button>
                  {hasActiveNavTarget ? (
                    <button
                      type="button"
                      className="nav-target-btn nav-target-btn--clear-target"
                      onClick={handleClearNavTarget}
                      title="Clear nav target"
                      aria-label="Clear nav target"
                    >
                      ✕
                    </button>
                  ) : (
                    scanPickersWithContacts.map((scanId) => {
                      const count = scanContactsByPicker[scanId].length;
                      const theme = getNavScanPickerTheme(scanId);
                      return (
                        <div key={scanId} className="nav-scan-chip">
                          <span className="nav-scan-label">{theme.abbrev}</span>
                          <button
                            type="button"
                            className={`nav-target-btn nav-target-btn--scan${scanTargetActiveByPicker[scanId] ? ' nav-target-btn--scan-active' : ''}`}
                            onClick={() => openScanPickerDialog(scanId)}
                            title={theme.pickerTitle}
                            aria-label={`${theme.abbrev}: ${count} ${theme.pickerTitle.toLowerCase()}`}
                          >
                            {count}
                          </button>
                        </div>
                      );
                    })
                  )}
                  <div className="nav-target-readouts">
                    <span
                      className={`nav-target-current-name${!displayLabel ? ' nav-target-current-name--empty' : ''}`}
                    >
                      {displayLabel}
                    </span>
                    <div className="nav-target-rel-line">
                      <span className="nav-target-rel-label">Rel Vel</span>
                      <span
                        ref={displayRefs.relativeVel}
                        className="hud-value nav-relative-velocity"
                      />
                      {hasDockPermissionRequestTarget ? (
                        <button
                          type="button"
                          className="nav-target-btn nav-dock-permission-btn"
                          onClick={openDockPermissionComms}
                          title={`Request dock permission from ${dockPermissionCandidate?.label ?? 'dock'}`}
                        >
                          Request dock permission
                        </button>
                      ) : (
                        <span ref={displayRefs.dockingHint} className="nav-target-dock-hint" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="nav-target-group">
                <div className="nav-target-label">Autopilot</div>
                <button type="button" className="autopilot-btn" onClick={handleAutopilot}>
                  <span ref={displayRefs.autopilotBtn}>AUTOPILOT</span>
                </button>
              </div>
              <div className="nav-target-group">
                <div className="nav-target-label">Relative</div>
                <button
                  type="button"
                  className="autopilot-btn autopilot-btn--velocity-match"
                  onClick={handleVelocityMatch}
                >
                  MATCH VEL
                </button>
              </div>
              <div className="hud-divider" />

              <div className="hud-metrics nav-metrics">
                <div className="hud-metric">
                  <div className="hud-label">
                    {orbitStatusRef.current.isOrbiting === true ? 'ORBIT' : 'SOI'}
                  </div>
                  <span ref={displayRefs.orbit} className="hud-value nav-orbit" />
                </div>
                <div className="hud-divider" />
                <div className="hud-metric" style={{ minWidth: '50px' }}>
                  <div className="hud-label">Altitude</div>
                  <span ref={displayRefs.alt} className="hud-value nav-alt" />
                  <span ref={displayRefs.apsesTarget} className="hud-value nav-apses-target" />
                </div>
                <div className="hud-divider" />
                <div className="hud-metric">
                  <div className="hud-label">Apsis</div>
                  <div className="hud-metric-inline">
                    <div className="hud-label">Per</div>
                    <span ref={displayRefs.periapsis} className="hud-value nav-periapsis" />
                  </div>
                  <div className="hud-metric-inline">
                    <div className="hud-label">Apo</div>
                    <span ref={displayRefs.apoapsis} className="hud-value nav-apoapsis" />
                  </div>
                </div>
                <div className="hud-divider" />
                <div className="hud-metric">
                  <div className="hud-label">Approach</div>
                  <span ref={displayRefs.approach} className="hud-value nav-approach" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {navTargetDialog}
      {scanPickerDialog}
    </>
  );
};
