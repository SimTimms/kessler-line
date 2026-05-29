import { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import {
  NAV_TARGET_DEFS,
  displayNameForDockedStation,
} from '../../../config/worldConfig';
import { EVENT_REQUEST_UNDOCK } from '../../../config/keybindings';
import { isDockingTutorialUndockAllowed } from '../../../tutorial/tutorialDockingInputGate';
import { dockingTutorialActiveRef, tutorialStepRef } from '../../../context/TutorialState';
import { TUTORIAL_DOCKING_STEPS } from '../../../tutorial/tutorialDockingSteps';
import { navTargetPosRef, navTargetIdRef, hasNavTarget, clearNavTarget } from '../../../context/NavTarget';
import { gravityBodies } from '../../../context/GravityRegistry';
import { shipPosRef } from '../../../context/ShipPos';
import { getShipSpeedMps, orbitStatusRef, shipVelocity } from '../../../context/ShipState';
import { velocityLevel } from '../PowerHUD/PowerHUDHelpers';
import {
  selectTarget,
  flashTarget,
  clearSelectedTarget,
  selectedTargetName,
  selectedTargetPosition,
  selectedTargetVelocity,
  targetFlashUntil,
} from '../../../context/TargetSelection';
import { getCollidables } from '../../../context/CollisionRegistry';
import { getRadioBroadcasts } from '../../../context/RadioBroadcastRegistry';
import { getMagneticTargets } from '../../../context/MagneticRegistry';
import { magneticOnRef, magneticScanRangeRef } from '../../../context/MagneticScan';
import { getDriveSignatures } from '../../../context/DriveSignatureRegistry';
import { driveSignatureOnRef, driveSignatureRangeRef } from '../../../context/DriveSignatureScan';
import { proximityScanOnRef, proximityScanRangeRef } from '../../../context/ProximityScan';
import { radioOnRef, radioRangeRef } from '../../../context/RadioState';
import { radiationOnRef, radiationRangeRef } from '../../../context/RadiationScan';
import { activeRadiationZonesRef } from '../../../context/ActiveRadiationZones';
import { SHIP_COLLISION_ID } from '../../../context/ShipState';
import {
  NAV_SCAN_PICKER_ORDER,
  getNavScanPickerTheme,
  type NavScanPickerId,
} from '../../../config/navScanPickerConfig';
import {
  resolveRadiationZoneWorldPosition,
  horizontalDistanceToRadiationZone,
} from '../../../utils/radiationZonePosition';
import { humanizeCollidableId, type NavScanContact } from './navScanPickerContacts';
import { KM_PER_UNIT } from '../../../config/commsConfig';
import {
  autopilotActive,
  autopilotMode,
  autopilotPhase,
  autopilotStatus,
  enableAutopilot,
  enableVelocityMatchAutopilot,
  disableAutopilot,
} from '../../../context/AutopilotState';
import { NavTargetDialog, type NavTargetItem } from './NavTargetDialog';
import './NavHUD.css';
import '../HelmetHUD/HelmetHUD.css';

const NAV_TARGETS = NAV_TARGET_DEFS;
const ORBIT_LABELS = new Map(NAV_TARGET_DEFS.map((p) => [p.id, p.label]));
const _toTargetDir = new THREE.Vector3();

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

function contactListSignature(contacts: { id: string; distance: string }[]): string {
  return contacts
    .map((c) => `${c.id}:${c.distance}`)
    .sort()
    .join('|');
}

function toNavTargetItems(contacts: NavScanContact[]): NavTargetItem[] {
  return contacts.map((c) => ({
    id: c.id,
    label: c.label,
    sublabel: c.sublabel,
    distance: c.distance,
  }));
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
  disableElements,
  focusElements,
  onNavTargetClick,
  customGeneralTargets,
  customPlanetaryTargets,
}: NavHUDProps) => {
  const [targetId, setTargetId] = useState(navTargetIdRef.current);
  const [targetLabel, setTargetLabel] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openScanPicker, setOpenScanPicker] = useState<NavScanPickerId | null>(null);
  const [selectedObjName, setSelectedObjName] = useState<string | null>(null);
  const [navTargetHighlight, setNavTargetHighlight] = useState(false);
  const [highlightedContactId, setHighlightedContactId] = useState<string | undefined>();
  const [navItems, setNavItems] = useState<NavTargetItem[]>(() =>
    NAV_TARGETS.map((t) => ({ id: t.id, label: t.label }))
  );
  const [generalItems, setGeneralItems] = useState<NavTargetItem[]>([]);
  const [magneticContacts, setMagneticContacts] = useState<NavScanContact[]>([]);
  const [driveContacts, setDriveContacts] = useState<NavScanContact[]>([]);
  const [proximityContacts, setProximityContacts] = useState<NavScanContact[]>([]);
  const [radioContacts, setRadioContacts] = useState<NavScanContact[]>([]);
  const [radiationContacts, setRadiationContacts] = useState<NavScanContact[]>([]);
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
  const autopilotBtnRef = useRef<HTMLSpanElement>(null!);
  const velocityMatchBtnRef = useRef<HTMLButtonElement>(null!);
  const orbitLineRef = useRef<HTMLSpanElement>(null!);
  const speedRef = useRef<HTMLSpanElement>(null!);

  const prevNavSigRef = useRef('');
  const prevGeneralSigRef = useRef('');
  const prevMagSigRef = useRef('');
  const prevDriveSigRef = useRef('');
  const prevProximitySigRef = useRef('');
  const prevRadioSigRef = useRef('');
  const prevRadiationSigRef = useRef('');
  const radioPosVec = useRef(new THREE.Vector3());
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
        const active = autopilotActive.current && autopilotMode.current === 'approach';
        const helmetAp = autopilotBtnRef.current.closest('.helmet-nav');
        autopilotBtnRef.current.textContent = active
          ? helmetAp
            ? 'ON'
            : autopilotStatus.current
          : helmetAp
            ? 'OFF'
            : 'DISENGAGED';
        const btn = autopilotBtnRef.current.parentElement;
        if (btn instanceof HTMLButtonElement) {
          if (helmetAp) {
            btn.classList.toggle('helmet-nav-btn--active', active);
          } else {
            btn.className = `autopilot-btn ${active ? ' autopilot-active' : ''}`;
          }
        }
      }
      if (layout === 'helmet' && speedRef.current) {
        const speedMps = getShipSpeedMps();
        speedRef.current.textContent = `${speedMps.toFixed(1)} m/s`;
        const level = velocityLevel(speedMps);
        speedRef.current.className = `helmet-nav-speed hud-value${level === 'red' ? ' helmet-nav-speed--crit' : level === 'orange' ? ' helmet-nav-speed--warn' : ''}${focusElements.includes('velocity') ? ' helmet-nav-speed--highlight' : ''}`;
      }
      if (layout === 'helmet' && orbitLineRef.current) {
        const { bodyId, isOrbiting } = orbitStatusRef.current;
        if (!bodyId) {
          orbitLineRef.current.textContent = '';
          orbitLineRef.current.style.display = 'none';
        } else {
          const label = ORBIT_LABELS.get(bodyId) ?? bodyId;
          const alt = altRef.current?.textContent ?? '—';
          const peri = periapsisRef.current?.textContent ?? '—';
          const apo = apoapsisRef.current?.textContent ?? '—';
          const prefix = isOrbiting === true ? 'ORB' : 'SOI';
          orbitLineRef.current.textContent = `${prefix} ${label} · ALT ${alt} · PE ${peri} · AP ${apo}`;
          orbitLineRef.current.style.display = '';
        }
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
        const inRange: NavScanContact[] = [];
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
        const sig = contactListSignature(inRange);
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
        const inRange: NavScanContact[] = [];
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
        const sig = contactListSignature(inRange);
        if (sig !== prevDriveSigRef.current) {
          prevDriveSigRef.current = sig;
          setDriveContacts(inRange);
        }
      } else if (prevDriveSigRef.current !== '') {
        prevDriveSigRef.current = '';
        setDriveContacts([]);
      }

      // Proximity contacts (collidables in range)
      if (proximityScanOnRef.current) {
        const range = proximityScanRangeRef.current;
        const inRange: NavScanContact[] = [];
        for (const c of getCollidables()) {
          if (c.id === SHIP_COLLISION_ID) continue;
          c.getWorldPosition(scanVec.current);
          const dist = scanVec.current.distanceTo(shipPosRef.current);
          if (dist <= range) {
            const getPosition = (target: THREE.Vector3) => c.getWorldPosition(target);
            inRange.push({
              id: c.id,
              label: humanizeCollidableId(c.id),
              sublabel: 'PROXIMITY',
              distance: formatDist(dist),
              type: 'default',
              getPosition,
              getVelocity: c.getWorldVelocity,
            });
          }
        }
        const sig = contactListSignature(inRange);
        if (sig !== prevProximitySigRef.current) {
          prevProximitySigRef.current = sig;
          setProximityContacts(inRange);
        }
      } else if (prevProximitySigRef.current !== '') {
        prevProximitySigRef.current = '';
        setProximityContacts([]);
      }

      // Radio broadcasts in range (scene-registered only)
      if (radioOnRef.current) {
        const range = radioRangeRef.current;
        const inRange: NavScanContact[] = [];
        for (const entry of getRadioBroadcasts()) {
          entry.getPosition(radioPosVec.current);
          const dist = radioPosVec.current.distanceTo(shipPosRef.current);
          if (dist <= range) {
            inRange.push({
              id: entry.id,
              label: entry.label,
              sublabel: 'RADIO BEACON',
              distance: formatDist(dist),
              type: 'default',
              getPosition: (target) => entry.getPosition(target),
            });
          }
        }
        const sig = contactListSignature(inRange);
        if (sig !== prevRadioSigRef.current) {
          prevRadioSigRef.current = sig;
          setRadioContacts(inRange);
        }
      } else if (prevRadioSigRef.current !== '') {
        prevRadioSigRef.current = '';
        setRadioContacts([]);
      }

      // Radiation sources in range
      if (radiationOnRef.current) {
        const range = radiationRangeRef.current;
        const inRange: NavScanContact[] = [];
        for (const zone of activeRadiationZonesRef.current) {
          if (!resolveRadiationZoneWorldPosition(zone, scanVec.current)) continue;
          const dist = horizontalDistanceToRadiationZone(shipPosRef.current, scanVec.current);
          if (dist <= range) {
            inRange.push({
              id: zone.id,
              label: zone.label,
              sublabel: 'RADIATION',
              distance: formatDist(dist),
              type: 'default',
              getPosition: (target) => {
                if (resolveRadiationZoneWorldPosition(zone, target)) return target;
                return target.set(0, 0, 0);
              },
            });
          }
        }
        const sig = contactListSignature(inRange);
        if (sig !== prevRadiationSigRef.current) {
          prevRadiationSigRef.current = sig;
          setRadiationContacts(inRange);
        }
      } else if (prevRadiationSigRef.current !== '') {
        prevRadiationSigRef.current = '';
        setRadiationContacts([]);
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
  }, [layout, focusElements]);

  // Listen for nav target set by external systems (e.g. docking request approval)
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
      magneticContacts.find((c) => c.id === id) ??
      driveContacts.find((c) => c.id === id) ??
      proximityContacts.find((c) => c.id === id) ??
      radioContacts.find((c) => c.id === id) ??
      radiationContacts.find((c) => c.id === id);
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
    if (!autopilotEnabled) return;
    if (autopilotActive.current && autopilotMode.current === 'approach') {
      disableAutopilot();
      window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: false } }));
    } else {
      enableAutopilot();
      window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: true } }));
    }
  };

  const handleVelocityMatch = () => {
    const hasVel = selectedTargetName !== null && selectedTargetVelocity.lengthSq() > 1e-8;
    if (!hasVel) return;
    if (autopilotActive.current && autopilotMode.current === 'velocityMatch') {
      disableAutopilot();
      window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: false } }));
    } else {
      enableVelocityMatchAutopilot();
      window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: true } }));
    }
  };

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

  useEffect(() => {
    if (!openScanPicker) return;
    const counts: Record<NavScanPickerId, number> = {
      magnet: magneticContacts.length,
      drive: driveContacts.length,
      proximity: proximityContacts.length,
      radio: radioContacts.length,
      radiation: radiationContacts.length,
    };
    if (counts[openScanPicker] === 0) {
      setOpenScanPicker(null);
    }
  }, [
    openScanPicker,
    magneticContacts,
    driveContacts,
    proximityContacts,
    radioContacts,
    radiationContacts,
  ]);

  const requestUndock = () => {
    if (!isDockingTutorialUndockAllowed()) return;
    window.dispatchEvent(new CustomEvent(EVENT_REQUEST_UNDOCK));
  };

  const hasActiveNavTarget = targetId.trim().length > 0;
  const autopilotEnabled = hasActiveNavTarget;

  const totalNavContactCount =
    navItems.length +
    generalItems.length +
    magneticContacts.length +
    driveContacts.length +
    proximityContacts.length +
    radioContacts.length +
    radiationContacts.length;

  const handleClearNavTarget = () => {
    clearNavTarget();
    clearSelectedTarget();
    setTargetId('');
    setTargetLabel('');
    setSelectedObjName(null);
    selectedObjNameRef.current = null;
    setOpenScanPicker(null);
    if (autopilotActive.current) {
      disableAutopilot();
      window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: false } }));
    }
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

  if (layout === 'helmet') {
    return (
      <>
        <div className="helmet-nav">
          {isDocked ? (
            <div className="helmet-nav-docked">
              <span className="helmet-nav-tag">DOCK</span>
              <span className="helmet-nav-name">
                {displayNameForDockedStation(dockedStationId)}
              </span>
              <span className="helmet-nav-tag">SPD</span>
              <span ref={speedRef} className="helmet-nav-speed hud-value" />
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
                    className={`helmet-nav-btn helmet-nav-btn--scan helmet-nav-btn--tgt${hasActiveNavTarget ? ' helmet-nav-btn--tgt-filled' : ''}${navTargetHighlight ? ' helmet-nav-btn--highlight' : ''}`}
                    onClick={openNavTargetDialog}
                    title={displayLabel || `Select nav target (${totalNavContactCount} contacts)`}
                    aria-label={
                      hasActiveNavTarget
                        ? `Nav target: ${displayLabel}`
                        : `${totalNavContactCount} nav contacts`
                    }
                  >
                    {hasActiveNavTarget ? displayLabel || '—' : totalNavContactCount}
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
                  scanPickersWithContacts.map((scanId) => {
                    const count = scanContactsByPicker[scanId].length;
                    const theme = getNavScanPickerTheme(scanId);
                    return (
                      <div key={scanId} className="helmet-nav-scan-chip">
                        <span className="helmet-nav-scan-label">{theme.abbrev}</span>
                        <button
                          type="button"
                          className={`helmet-nav-btn helmet-nav-btn--scan${scanTargetActiveByPicker[scanId] ? ' helmet-nav-btn--scan-active' : ''}`}
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
                <button
                  type="button"
                  className={`helmet-nav-btn helmet-nav-btn--ap${!autopilotEnabled ? ' helmet-nav-btn--disabled' : ''}`}
                  onClick={handleAutopilot}
                  disabled={!autopilotEnabled}
                  title={autopilotEnabled ? 'Autopilot' : 'Set a nav target first'}
                >
                  AP <span ref={autopilotBtnRef} className="helmet-ap-state" />
                </button>
              </div>
              <div className="helmet-nav-row helmet-nav-metrics">
                <div className="helmet-nav-metric">
                  <span className="helmet-nav-tag">SPD</span>
                  <span ref={speedRef} className="helmet-nav-speed hud-value" />
                </div>
                <div className="helmet-nav-metric helmet-nav-metric--rel">
                  <span className="helmet-nav-tag">Δv</span>
                  <span ref={relativeVelRef} className="helmet-nav-dv hud-value nav-relative-velocity" />
                  <span ref={dockingHintRef} className="nav-target-dock-hint" />
                </div>
              </div>
              <span ref={orbitLineRef} className="helmet-nav-orbit" />
            </>
          )}
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
                      <span ref={relativeVelRef} className="hud-value nav-relative-velocity" />
                      <span ref={dockingHintRef} className="nav-target-dock-hint" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="nav-target-group">
                <div className="nav-target-label">Autopilot</div>
                <button type="button" className="autopilot-btn" onClick={handleAutopilot}>
                  <span ref={autopilotBtnRef}>AUTOPILOT</span>
                </button>
              </div>
              <div className="nav-target-group">
                <div className="nav-target-label">Relative</div>
                <button
                  ref={velocityMatchBtnRef}
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
            </>
          )}
        </div>
      </div>

      {navTargetDialog}
      {scanPickerDialog}
    </>
  );
};
