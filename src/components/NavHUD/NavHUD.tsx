import { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { NAV_TARGET_DEFS, displayNameForDockedStation } from '../../config/worldConfig';
import { EVENT_REQUEST_UNDOCK } from '../../config/keybindings';
import { isDockingTutorialUndockAllowed } from '../../tutorial/tutorialDockingInputGate';
import { dockingTutorialActiveRef, tutorialStepRef } from '../../context/TutorialState';
import { TUTORIAL_DOCKING_STEPS } from '../../tutorial/tutorialDockingSteps';
import { navTargetPosRef, navTargetIdRef } from '../../context/NavTarget';
import { gravityBodies } from '../../context/GravityRegistry';
import { shipPosRef } from '../../context/ShipPos';
import { orbitStatusRef, shipVelocity } from '../../context/ShipState';
import {
  selectTarget,
  flashTarget,
  clearSelectedTarget,
  selectedTargetName,
  selectedTargetPosition,
  selectedTargetVelocity,
  targetFlashUntil,
  type TargetType,
} from '../../context/TargetSelection';
import { getMagneticTargets } from '../../context/MagneticRegistry';
import { magneticOnRef, magneticScanRangeRef } from '../../context/MagneticScan';
import { getDriveSignatures } from '../../context/DriveSignatureRegistry';
import { driveSignatureOnRef, driveSignatureRangeRef } from '../../context/DriveSignatureScan';
import { KM_PER_UNIT } from '../../config/commsConfig';
import {
  autopilotActive,
  autopilotPhase,
  autopilotStatus,
  enableAutopilot,
  disableAutopilot,
} from '../../context/AutopilotState';
import { NavTargetDialog, type NavTargetItem } from './NavTargetDialog';
import './NavHUD.css';

const NAV_TARGETS = NAV_TARGET_DEFS;
const ORBIT_LABELS = new Map(NAV_TARGET_DEFS.map((p) => [p.id, p.label]));
const _toTargetDir = new THREE.Vector3();

interface ScanContact {
  id: string;
  label: string;
  sublabel: string;
  distance: string;
  type: TargetType;
  getPosition: (v: THREE.Vector3) => THREE.Vector3;
  getVelocity?: (v: THREE.Vector3) => THREE.Vector3;
}

interface TutorialTargetDef {
  id: string;
  label: string;
  getPosition: (v: THREE.Vector3) => THREE.Vector3;
  getVelocity?: (v: THREE.Vector3) => THREE.Vector3;
}

function formatDist(distUnits: number): string {
  const km = distUnits * KM_PER_UNIT;
  if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(2)} Gm`;
  if (km >= 1_000) return `${(km / 1_000).toFixed(1)} Mm`;
  return `${km.toFixed(0)} km`;
}

interface NavHUDProps {
  showNavTarget?: boolean;
  showAutopilot?: boolean;
  showMetrics?: boolean;
  forceNavTargetFlash?: boolean;
  onNavTargetClick?: () => void;
  customGeneralTargets?: TutorialTargetDef[];
  customPlanetaryTargets?: TutorialTargetDef[];
  showDriveContacts?: boolean;
  forcedHighlightContactId?: string;
}

export const NavHUD = ({
  showNavTarget = true,
  showAutopilot = true,
  showMetrics = true,
  forceNavTargetFlash = false,
  onNavTargetClick,
  customGeneralTargets,
  customPlanetaryTargets,
  showDriveContacts = true,
  forcedHighlightContactId,
}: NavHUDProps = {}) => {
  const [targetId, setTargetId] = useState(navTargetIdRef.current);
  const [targetLabel, setTargetLabel] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedObjName, setSelectedObjName] = useState<string | null>(null);
  const [navTargetHighlight, setNavTargetHighlight] = useState(false);
  const [highlightedContactId, setHighlightedContactId] = useState<string | undefined>();
  const [navItems, setNavItems] = useState<NavTargetItem[]>(() =>
    NAV_TARGETS.map((t) => ({ id: t.id, label: t.label })),
  );
  const [generalItems, setGeneralItems] = useState<NavTargetItem[]>([]);
  const [magneticContacts, setMagneticContacts] = useState<ScanContact[]>([]);
  const [driveContacts, setDriveContacts] = useState<ScanContact[]>([]);
  const [isDocked, setIsDocked] = useState(false);
  const [dockedStationId, setDockedStationId] = useState<string | null>(null);
  const isDockedRef = useRef(false);
  const undockBtnRef = useRef<HTMLButtonElement>(null);

  // Coords display — mutated directly to avoid re-renders
  const coordsRef = useRef<HTMLSpanElement>(null!);
  const orbitRef = useRef<HTMLSpanElement>(null!);
  const altRef = useRef<HTMLSpanElement>(null!);
  const periapsisRef = useRef<HTMLSpanElement>(null!);
  const apoapsisRef = useRef<HTMLSpanElement>(null!);
  const apsesTargetRef = useRef<HTMLSpanElement>(null!);
  const approachRef = useRef<HTMLSpanElement>(null!);
  const relativeVelRef = useRef<HTMLSpanElement>(null!);
  const dockingHintRef = useRef<HTMLSpanElement>(null!);
  const autopilotBtnRef = useRef<HTMLButtonElement>(null!);

  const prevNavSigRef = useRef('');
  const prevGeneralSigRef = useRef('');
  const prevMagSigRef = useRef('');
  const prevDriveSigRef = useRef('');
  const scanVec = useRef(new THREE.Vector3());
  const navVec = useRef(new THREE.Vector3());
  const velVec = useRef(new THREE.Vector3());
  const selectedObjNameRef = useRef<string | null>(null);

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

  useEffect(() => {
    let raf: number;
    const tick = () => {
      if (coordsRef.current) {
        const { x, z } = shipPosRef.current;
        coordsRef.current.textContent = `${Math.round(x)}, ${Math.round(z)}`;
      }
      if (orbitRef.current) {
        const { bodyId } = orbitStatusRef.current;
        const label = bodyId ? (ORBIT_LABELS.get(bodyId) ?? bodyId) : '—';
        orbitRef.current.textContent = label;
      }
      if (altRef.current) {
        const { bodyId, surfaceRadius } = orbitStatusRef.current;
        if (bodyId) {
          const body = gravityBodies.get(bodyId);
          if (body) {
            const dx = shipPosRef.current.x - body.position.x;
            const dy = shipPosRef.current.y - body.position.y;
            const dz = shipPosRef.current.z - body.position.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const alt = Math.max(0, dist - surfaceRadius);
            altRef.current.textContent = `${Math.round(alt)}`;
          }
        } else {
          altRef.current.textContent = '—';
        }
      }
      if (periapsisRef.current) {
        const { bodyId, periapsis, surfaceRadius } = orbitStatusRef.current;
        if (bodyId && periapsis > 0) {
          const periAlt = Math.max(0, periapsis - surfaceRadius);
          periapsisRef.current.textContent = `${Math.round(periAlt)}`;
        } else {
          periapsisRef.current.textContent = '—';
        }
      }
      if (apoapsisRef.current) {
        const { bodyId, apoapsis, surfaceRadius } = orbitStatusRef.current;
        if (bodyId && apoapsis > 0) {
          const apoAlt = Math.max(0, apoapsis - surfaceRadius);
          apoapsisRef.current.textContent = `${Math.round(apoAlt)}`;
        } else {
          apoapsisRef.current.textContent = '—';
        }
      }
      if (apsesTargetRef.current) {
        const { bodyId } = orbitStatusRef.current;
        if (bodyId) {
          const idealAlt = gravityBodies.get(bodyId)?.orbitAltitude;
          apsesTargetRef.current.textContent = idealAlt != null ? `[${Math.round(idealAlt)}]` : '—';
        } else {
          apsesTargetRef.current.textContent = '—';
        }
      }
      if (approachRef.current) {
        const { bodyId, periapsis, apoapsis, surfaceRadius, radialVelocity } =
          orbitStatusRef.current;
        if (bodyId && periapsis > 0) {
          const body = gravityBodies.get(bodyId);
          if (body) {
            const dx = shipPosRef.current.x - body.position.x;
            const dy = shipPosRef.current.y - body.position.y;
            const dz = shipPosRef.current.z - body.position.z;
            const currentAlt = Math.max(0, Math.sqrt(dx * dx + dy * dy + dz * dz) - surfaceRadius);
            if (radialVelocity >= 0 && apoapsis > 0) {
              const apoAlt = Math.max(0, apoapsis - surfaceRadius);
              approachRef.current.textContent = `APO +${Math.round(apoAlt - currentAlt)}`;
            } else {
              const periAlt = Math.max(0, periapsis - surfaceRadius);
              approachRef.current.textContent = `PERI -${Math.round(currentAlt - periAlt)}`;
            }
          }
        } else {
          approachRef.current.textContent = '—';
        }
      }
      if (relativeVelRef.current) {
        const hasSelected = selectedTargetName !== null && selectedTargetPosition.lengthSq() > 0.01;
        const hasNavId = navTargetIdRef.current.trim().length > 0;
        const hasTarget = hasSelected || hasNavId;
        let relVelNum = 0;
        if (!hasTarget) {
          relativeVelRef.current.textContent = '—';
          relativeVelRef.current.className = 'hud-value nav-relative-velocity';
        } else {
          const targetPos = hasSelected ? selectedTargetPosition : navTargetPosRef.current;
          const targetVel = hasSelected ? selectedTargetVelocity : _toTargetDir.set(0, 0, 0);
          _toTargetDir.subVectors(targetPos, shipPosRef.current);
          const dist = _toTargetDir.length();
          if (dist < 1e-5) {
            relativeVelRef.current.textContent = '0 m/s';
            relVelNum = 0;
          } else {
            _toTargetDir.multiplyScalar(1 / dist);
            const relVel =
              (shipVelocity.x - targetVel.x) * _toTargetDir.x +
              (shipVelocity.y - targetVel.y) * _toTargetDir.y +
              (shipVelocity.z - targetVel.z) * _toTargetDir.z;
            relVelNum = relVel;
            relativeVelRef.current.textContent = `${relVel >= 0 ? '+' : ''}${relVel.toFixed(1)} m/s`;
          }
          const flash = Date.now() < targetFlashUntil;
          relativeVelRef.current.className = `hud-value nav-relative-velocity${flash ? ' nav-relative-velocity--flash' : ''}`;
        }
        if (dockingHintRef.current) {
          if (!hasTarget) {
            dockingHintRef.current.textContent = '';
            dockingHintRef.current.style.display = 'none';
          } else {
            const contactName = selectedObjNameRef.current ?? selectedTargetName;
            if (contactName === 'Docking Bay' && Math.abs(relVelNum) < 4) {
              dockingHintRef.current.textContent = '[docking velocity]';
              dockingHintRef.current.style.display = '';
            } else {
              dockingHintRef.current.textContent = '';
              dockingHintRef.current.style.display = 'none';
            }
          }
        }
      }
      if (autopilotBtnRef.current) {
        const active = autopilotActive.current;
        autopilotBtnRef.current.textContent = active ? autopilotStatus.current : 'DISENGAGED';
        autopilotBtnRef.current.className = `autopilot-btn ${active ? ' autopilot-active' : ''}`;
      }

      // Nav target distances
      {
        const newNavItems: NavTargetItem[] = customPlanetaryTargets
          ? customPlanetaryTargets.map((def) => {
              const pos = def.getPosition(navVec.current);
              const dist = pos.distanceTo(shipPosRef.current);
              return { id: def.id, label: def.label, distance: formatDist(dist) };
            })
          : NAV_TARGETS.map((def) => {
              let pos: THREE.Vector3;
              if (def.orbit) {
                const parentBody = gravityBodies.get(def.orbit.planetName);
                pos = parentBody ? parentBody.position : navVec.current.set(...def.position);
              } else {
                const gravBody =
                  gravityBodies.get(def.id.charAt(0).toUpperCase() + def.id.slice(1)) ||
                  gravityBodies.get(def.id);
                pos = gravBody ? gravBody.position : navVec.current.set(...def.position);
              }
              const dist = pos.distanceTo(shipPosRef.current);
              return { id: def.id, label: def.label, distance: formatDist(dist) };
            });
        const navSig = newNavItems.map((i) => `${i.id}:${i.distance}`).join('|');
        if (navSig !== prevNavSigRef.current) {
          prevNavSigRef.current = navSig;
          setNavItems(newNavItems);
        }
      }
      if (customGeneralTargets) {
        const newGeneralItems: NavTargetItem[] = customGeneralTargets.map((def) => {
          const pos = def.getPosition(navVec.current);
          const dist = pos.distanceTo(shipPosRef.current);
          return { id: def.id, label: def.label, distance: formatDist(dist) };
        });
        const generalSig = newGeneralItems.map((i) => `${i.id}:${i.distance}`).join('|');
        if (generalSig !== prevGeneralSigRef.current) {
          prevGeneralSigRef.current = generalSig;
          setGeneralItems(newGeneralItems);
        }
      } else if (prevGeneralSigRef.current !== '') {
        prevGeneralSigRef.current = '';
        setGeneralItems([]);
      }

      // Magnetic contacts
      if (magneticOnRef.current) {
        const range = magneticScanRangeRef.current;
        const targets = getMagneticTargets();
        const inRange: ScanContact[] = [];
        for (const t of targets) {
          t.getPosition(scanVec.current);
          const dist = scanVec.current.distanceTo(shipPosRef.current);
          if (dist <= range) {
            inRange.push({
              id: t.id,
              label: t.label,
              sublabel: 'MAGNETIC',
              distance: formatDist(dist),
              type: 'magnetic',
              getPosition: t.getPosition,
              getVelocity: t.getVelocity,
            });
          }
        }
        const sig = inRange.map((c) => `${c.id}:${c.distance}`).sort().join('|');
        if (sig !== prevMagSigRef.current) {
          prevMagSigRef.current = sig;
          setMagneticContacts(inRange);
        }
      } else if (prevMagSigRef.current !== '') {
        prevMagSigRef.current = '';
        setMagneticContacts([]);
      }

      // Drive signature contacts
      if (driveSignatureOnRef.current) {
        const range = driveSignatureRangeRef.current;
        const sigs = getDriveSignatures();
        const inRange: ScanContact[] = [];
        for (const s of sigs) {
          s.getPosition(scanVec.current);
          const dist = scanVec.current.distanceTo(shipPosRef.current);
          if (dist <= range) {
            inRange.push({
              id: s.id,
              label: s.label,
              sublabel: 'DRIVE SIGNATURE',
              distance: formatDist(dist),
              type: 'ship',
              getPosition: s.getPosition,
              getVelocity: s.getVelocity,
            });
          }
        }
        const sig = inRange.map((c) => c.id).sort().join('|');
        if (sig !== prevDriveSigRef.current) {
          prevDriveSigRef.current = sig;
          setDriveContacts(inRange);
        }
      } else if (prevDriveSigRef.current !== '') {
        prevDriveSigRef.current = '';
        setDriveContacts([]);
      }

      if (undockBtnRef.current) {
        const undockTutorialStep =
          dockingTutorialActiveRef.current &&
          TUTORIAL_DOCKING_STEPS[tutorialStepRef.current]?.id === 'docking-undock';
        const pulse = undockTutorialStep && isDockedRef.current;
        undockBtnRef.current.classList.toggle('nav-undock-btn--tutorial-pulse', pulse);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Listen for nav target set by external systems (e.g. docking request approval)
  useEffect(() => {
    const onNavTargetSet = (e: Event) => {
      const { id, label } = (e as CustomEvent<{ id: string; label: string }>).detail;
      setTargetId(id);
      setTargetLabel(label);
    };
    window.addEventListener('NavTargetSet', onNavTargetSet);
    return () => window.removeEventListener('NavTargetSet', onNavTargetSet);
  }, []);

  // Listen for clicked world objects (cargo pods, ships, stations, etc.)
  useEffect(() => {
    const onSelectedTargetChanged = (e: Event) => {
      const { name } = (e as CustomEvent<{ name: string | null; type: string | null }>).detail;
      selectedObjNameRef.current = name;
      setSelectedObjName(name);
    };
    window.addEventListener('SelectedTargetChanged', onSelectedTargetChanged);
    return () => window.removeEventListener('SelectedTargetChanged', onSelectedTargetChanged);
  }, []);

  // Tutorial highlight: pulse the nav target button when requested
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
    if (forceNavTargetFlash) setNavTargetHighlight(true);
  }, [forceNavTargetFlash]);

  // Tutorial highlight: pulse a specific contact item in the dialog
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

  const customGeneralMatch = customGeneralTargets?.find((t) => t.id === targetId);
  const customPlanetaryMatch = customPlanetaryTargets?.find((t) => t.id === targetId);
  const navMatch = NAV_TARGETS.find((t) => t.id === targetId);
  const magneticMatch = magneticContacts.find((c) => c.id === targetId);
  const driveMatch = driveContacts.find((c) => c.id === targetId);
  const resolvedTargetLabel = customGeneralMatch?.label
    ?? customPlanetaryMatch?.label
    ?? magneticMatch?.label
    ?? driveMatch?.label
    ?? (customGeneralTargets || customPlanetaryTargets ? undefined : navMatch?.label)
    ?? targetLabel;
  const displayLabel = selectedObjName ?? (resolvedTargetLabel || 'select a target.');

  const handleSelect = (id: string) => {
    // Standard nav target
    const customGeneralDef = customGeneralTargets?.find((t) => t.id === id);
    if (customGeneralDef) {
      setTargetId(id);
      setTargetLabel(customGeneralDef.label);
      setSelectedObjName(null);
      clearSelectedTarget();
      navTargetIdRef.current = id;
      customGeneralDef.getPosition(navTargetPosRef.current);
      return;
    }
    const customPlanetaryDef = customPlanetaryTargets?.find((t) => t.id === id);
    if (customPlanetaryDef) {
      setTargetId(id);
      setTargetLabel(customPlanetaryDef.label);
      setSelectedObjName(null);
      clearSelectedTarget();
      navTargetIdRef.current = id;
      customPlanetaryDef.getPosition(navTargetPosRef.current);
      return;
    }

    const def = NAV_TARGETS.find((t) => t.id === id);
    if (def) {
      setTargetId(id);
      setTargetLabel('');
      setSelectedObjName(null);
      clearSelectedTarget();
      navTargetIdRef.current = id;
      if (def.orbit) {
        const parentBody = gravityBodies.get(def.orbit.planetName);
        if (parentBody) {
          navTargetPosRef.current.copy(parentBody.position);
        } else {
          navTargetPosRef.current.set(...def.position);
        }
      } else {
        const gravBody =
          gravityBodies.get(id.charAt(0).toUpperCase() + id.slice(1)) || gravityBodies.get(id);
        if (gravBody) {
          navTargetPosRef.current.copy(gravBody.position);
        } else {
          navTargetPosRef.current.set(...def.position);
        }
      }
      if (autopilotActive.current) {
        autopilotPhase.current = 'align';
      }
      return;
    }

    // Scan contact (magnetic or drive)
    const contact =
      magneticContacts.find((c) => c.id === id) ?? driveContacts.find((c) => c.id === id);
    if (contact) {
      setTargetId(id);
      setTargetLabel(contact.label);
      navTargetIdRef.current = id;
      contact.getPosition(navTargetPosRef.current);
      const vel = contact.getVelocity ? contact.getVelocity(velVec.current) : undefined;
      selectTarget(contact.label, vel, navTargetPosRef.current, id, contact.type);
      flashTarget();
      if (autopilotActive.current) {
        autopilotPhase.current = 'align';
      }
      window.dispatchEvent(new CustomEvent('NavScanContactSelected', { detail: { id } }));
    }
  };

  const handleAutopilot = () => {
    if (autopilotActive.current) {
      disableAutopilot();
      window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: false } }));
    } else {
      enableAutopilot();
      window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: true } }));
    }
  };

  const magneticItems: NavTargetItem[] = magneticContacts.map((c) => ({
    id: c.id,
    label: c.label,
    sublabel: c.sublabel,
    distance: c.distance,
  }));
  const driveItems: NavTargetItem[] = driveContacts.map((c) => ({
    id: c.id,
    label: c.label,
    sublabel: c.sublabel,
    distance: c.distance,
  }));

  const requestUndock = () => {
    if (!isDockingTutorialUndockAllowed()) return;
    window.dispatchEvent(new CustomEvent(EVENT_REQUEST_UNDOCK));
  };

  const showNavBar =
    isDocked || showNavTarget || showAutopilot || showMetrics;

  return (
    <>
      {showNavBar && (
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
          {/*
        <div className="hud-metrics nav-metrics">
          <div className="hud-metric">
            <div className="hud-label">X | Z</div>
            <span ref={coordsRef} className="hud-value nav-coords" />
          </div>
        </div>
        */}
          {showNavTarget && (
            <div className="nav-target-group">
              <div className="nav-target-label">Nav Target</div>
              <div className="nav-target-cluster">
                <button
                  type="button"
                  className={`nav-target-btn nav-target-btn--open${navTargetHighlight ? ' nav-target-btn--highlight' : ''}`}
                  onClick={() => {
                    setDialogOpen(true);
                    setNavTargetHighlight(false);
                    onNavTargetClick?.();
                  }}
                >
                  Open
                </button>
                <div className="nav-target-readouts">
                  <span
                    className={`nav-target-current-name${displayLabel === 'select a target.' ? ' nav-target-current-name--empty' : ''}`}
                  >
                    {displayLabel}
                  </span>
                  <div className="nav-target-rel-line">
                    <span className="nav-target-rel-label">Rel Vel</span>
                    <span ref={relativeVelRef} className="hud-value nav-relative-velocity" />
                    <span ref={dockingHintRef} className="nav-target-dock-hint" />
                  </div>
                </div>
              </div>
            </div>
          )}
          {showAutopilot && (
            <div className="nav-target-group">
              <div className="nav-target-label">Autopilot</div>
              <button ref={autopilotBtnRef} className="autopilot-btn" onClick={handleAutopilot}>
                AUTOPILOT
              </button>
            </div>
          )}
          {(showNavTarget || showAutopilot) && showMetrics && <div className="hud-divider" />}

          {showMetrics && (
            <div className="hud-metrics nav-metrics">
              <div className="hud-metric">
                <div className="hud-label">
                  {orbitStatusRef.current.isOrbiting === true ? 'ORBIT' : 'SOI'}
                </div>
                <span ref={orbitRef} className="hud-value nav-orbit" />
              </div>
              <div className="hud-divider" />
              <div className="hud-metric" style={{ minWidth: '50px' }}>
                <div className="hud-label">Altitude</div>
                <span ref={altRef} className="hud-value nav-alt" />
                <span ref={apsesTargetRef} className="hud-value nav-apses-target" />
              </div>
              <div className="hud-divider" />
              <div className="hud-metric">
                <div className="hud-label">Apsis</div>
                <div className="hud-metric-inline">
                  <div className="hud-label">Per</div>
                  <span ref={periapsisRef} className="hud-value nav-periapsis" />
                </div>
                <div className="hud-metric-inline">
                  <div className="hud-label">Apo</div>
                  <span ref={apoapsisRef} className="hud-value nav-apoapsis" />
                </div>
              </div>
              <div className="hud-divider" />
              <div className="hud-metric">
                <div className="hud-label">Approach</div>
                <span ref={approachRef} className="hud-value nav-approach" />
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>
      )}

      {dialogOpen && (
        <NavTargetDialog
          generalItems={generalItems}
          generalSectionLabel="GENERAL CONTACTS"
          navItems={navItems}
          navSectionLabel="PLANETARY CONTACTS"
          magneticItems={magneticItems}
          driveItems={driveItems}
          showDriveItems={showDriveContacts}
          selectedId={targetId}
          highlightId={forcedHighlightContactId ?? highlightedContactId}
          onSelect={handleSelect}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
};
