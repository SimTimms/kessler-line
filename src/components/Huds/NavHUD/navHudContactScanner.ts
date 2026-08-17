import * as THREE from 'three';
import { NAV_TARGET_DEFS } from '../../../config/worldConfig';
import { shipPosRef } from '../../../context/ShipPos';
import { gravityBodies } from '../../../context/GravityRegistry';
import { navTargetIdRef, navTargetPosRef } from '../../../context/NavTarget';
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
import { setScannerContactCount } from '../../../context/ScannerContactCounts';
import {
  resolveRadiationZoneWorldPosition,
  horizontalDistanceToRadiationZone,
} from '../../../utils/radiationZonePosition';
import { humanizeCollidableId, type NavScanContact } from './navScanPickerContacts';
import { formatDist, contactListSignature } from './navHudFormatters';
import { pushEventLog, type EventLogType } from '../EventLogHUD/EventLogStore';
import { setContactStoreContacts, setContactStorePlanets } from '../EventLogHUD/ContactStore';
import type { NavTargetItem } from './NavTargetDialog';
import type { TutorialTargetDef } from './NavHUD';

const NAV_TARGETS = NAV_TARGET_DEFS;

// ── Event log: track previously-seen contact IDs per scanner ──────────

const seenContactIds: Record<string, Set<string>> = {
  magnet: new Set(),
  drive: new Set(),
  proximity: new Set(),
  radio: new Set(),
  radiation: new Set(),
};

/**
 * Log new contacts that weren't in the previous scan pass.
 * Updates the seen-set for the scanner type.
 */
function logNewContacts(scannerType: EventLogType, contacts: NavScanContact[]): void {
  const seen = seenContactIds[scannerType];
  if (!seen) return;
  const currentIds = new Set<string>();
  for (const c of contacts) {
    currentIds.add(c.id);
    if (!seen.has(c.id)) {
      pushEventLog(scannerType, `${c.label} | ${c.distance}`);
    }
  }
  seenContactIds[scannerType] = currentIds;
}

// ── Scratch vectors (reused to avoid allocations) ─────────────────────

export interface ScanScratchVecs {
  scan: { current: THREE.Vector3 };
  nav: { current: THREE.Vector3 };
  radioPos: { current: THREE.Vector3 };
}

// ── Previous-signature refs (for change detection) ────────────────────

export interface ScanPrevSigs {
  nav: { current: string };
  general: { current: string };
  magnetic: { current: string };
  drive: { current: string };
  proximity: { current: string };
  radio: { current: string };
  radiation: { current: string };
}

// ── State dispatchers ─────────────────────────────────────────────────

export interface ScanDispatchers {
  setNavItems: (items: NavTargetItem[]) => void;
  setGeneralItems: (items: NavTargetItem[]) => void;
  setMagneticContacts: (contacts: NavScanContact[]) => void;
  setDriveContacts: (contacts: NavScanContact[]) => void;
  setProximityContacts: (contacts: NavScanContact[]) => void;
  setRadioContacts: (contacts: NavScanContact[]) => void;
  setRadiationContacts: (contacts: NavScanContact[]) => void;
}

/**
 * Scans all contact sources and dispatches state updates when values change.
 *
 * Uses signature strings compared against previous refs to avoid unnecessary
 * React setState calls. Designed to be called at a throttled rate (e.g. every
 * 15 frames) from the NavHUD rAF loop.
 */
export function scanAllContacts(
  prevSigs: ScanPrevSigs,
  vecs: ScanScratchVecs,
  dispatch: ScanDispatchers,
  customGeneralTargets?: TutorialTargetDef[],
  customPlanetaryTargets?: TutorialTargetDef[]
): void {
  scanNavTargets(prevSigs, vecs, dispatch, customPlanetaryTargets);
  scanGeneralTargets(prevSigs, vecs, dispatch, customGeneralTargets);
  scanMagnetic(prevSigs, vecs, dispatch);
  scanDrive(prevSigs, vecs, dispatch);
  scanProximity(prevSigs, vecs, dispatch);
  scanRadio(prevSigs, vecs, dispatch);
  scanRadiation(prevSigs, vecs, dispatch);
}

// ── Nav target distances ──────────────────────────────────────────────

function scanNavTargets(
  prevSigs: ScanPrevSigs,
  vecs: ScanScratchVecs,
  dispatch: ScanDispatchers,
  customPlanetaryTargets?: TutorialTargetDef[]
): void {
  const newNavItems: NavTargetItem[] = customPlanetaryTargets
    ? customPlanetaryTargets.map((def) => {
        const pos = def.getPosition(vecs.nav.current);
        const dist = pos.distanceTo(shipPosRef.current);
        return { id: def.id, label: def.label, distance: formatDist(dist) };
      })
    : NAV_TARGETS.map((def) => {
        let pos: THREE.Vector3;
        if (def.orbit) {
          const parentBody = gravityBodies.get(def.orbit.planetName);
          pos = parentBody ? parentBody.position : vecs.nav.current.set(...def.position);
        } else {
          const gravBody =
            gravityBodies.get(def.id.charAt(0).toUpperCase() + def.id.slice(1)) ||
            gravityBodies.get(def.id);
          pos = gravBody ? gravBody.position : vecs.nav.current.set(...def.position);
        }
        const dist = pos.distanceTo(shipPosRef.current);
        return { id: def.id, label: def.label, distance: formatDist(dist) };
      });

  const navSig = newNavItems.map((i) => `${i.id}:${i.distance}`).join('|');
  if (navSig !== prevSigs.nav.current) {
    prevSigs.nav.current = navSig;
    dispatch.setNavItems(newNavItems);
    setContactStorePlanets(newNavItems);
  }

  // Keep custom planetary target position up to date
  const activeCustom = customPlanetaryTargets?.find((t) => t.id === navTargetIdRef.current);
  if (activeCustom) {
    activeCustom.getPosition(navTargetPosRef.current);
  }
}

// ── General (custom tutorial) targets ─────────────────────────────────

function scanGeneralTargets(
  prevSigs: ScanPrevSigs,
  vecs: ScanScratchVecs,
  dispatch: ScanDispatchers,
  customGeneralTargets?: TutorialTargetDef[]
): void {
  if (customGeneralTargets) {
    const newGeneralItems: NavTargetItem[] = customGeneralTargets.map((def) => {
      const pos = def.getPosition(vecs.nav.current);
      const dist = pos.distanceTo(shipPosRef.current);
      return { id: def.id, label: def.label, distance: formatDist(dist) };
    });
    const generalSig = newGeneralItems.map((i) => `${i.id}:${i.distance}`).join('|');
    if (generalSig !== prevSigs.general.current) {
      prevSigs.general.current = generalSig;
      dispatch.setGeneralItems(newGeneralItems);
    }
  } else if (prevSigs.general.current !== '') {
    prevSigs.general.current = '';
    dispatch.setGeneralItems([]);
  }
}

// ── Magnetic contacts ─────────────────────────────────────────────────

function scanMagnetic(
  prevSigs: ScanPrevSigs,
  vecs: ScanScratchVecs,
  dispatch: ScanDispatchers
): void {
  if (magneticOnRef.current) {
    const range = magneticScanRangeRef.current;
    const targets = getMagneticTargets();
    const inRange: NavScanContact[] = [];
    for (const t of targets) {
      t.getPosition(vecs.scan.current);
      const dist = vecs.scan.current.distanceTo(shipPosRef.current);
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
    if (sig !== prevSigs.magnetic.current) {
      prevSigs.magnetic.current = sig;
      logNewContacts('magnet', inRange);
      dispatch.setMagneticContacts(inRange);
      setContactStoreContacts('magnet', inRange);
      setScannerContactCount('magnet', inRange.length);
    }
  } else if (prevSigs.magnetic.current !== '') {
    prevSigs.magnetic.current = '';
    seenContactIds.magnet.clear();
    dispatch.setMagneticContacts([]);
    setContactStoreContacts('magnet', []);
    setScannerContactCount('magnet', 0);
  }
}

// ── Drive signature contacts ──────────────────────────────────────────

function scanDrive(prevSigs: ScanPrevSigs, vecs: ScanScratchVecs, dispatch: ScanDispatchers): void {
  if (driveSignatureOnRef.current) {
    const range = driveSignatureRangeRef.current;
    const sigs = getDriveSignatures();
    const inRange: NavScanContact[] = [];
    for (const s of sigs) {
      s.getPosition(vecs.scan.current);
      const dist = vecs.scan.current.distanceTo(shipPosRef.current);
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
    if (sig !== prevSigs.drive.current) {
      prevSigs.drive.current = sig;
      logNewContacts('drive', inRange);
      dispatch.setDriveContacts(inRange);
      setContactStoreContacts('drive', inRange);
      setScannerContactCount('drive', inRange.length);
    }
  } else if (prevSigs.drive.current !== '') {
    prevSigs.drive.current = '';
    seenContactIds.drive.clear();
    dispatch.setDriveContacts([]);
    setContactStoreContacts('drive', []);
    setScannerContactCount('drive', 0);
  }
}

// ── Proximity contacts (collidables in range) ─────────────────────────

function scanProximity(
  prevSigs: ScanPrevSigs,
  vecs: ScanScratchVecs,
  dispatch: ScanDispatchers
): void {
  if (proximityScanOnRef.current) {
    const range = proximityScanRangeRef.current;
    const inRange: NavScanContact[] = [];
    for (const c of getCollidables()) {
      if (c.id === SHIP_COLLISION_ID) continue;
      c.getWorldPosition(vecs.scan.current);
      const dist = vecs.scan.current.distanceTo(shipPosRef.current);
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
    if (sig !== prevSigs.proximity.current) {
      prevSigs.proximity.current = sig;
      logNewContacts('proximity', inRange);
      dispatch.setProximityContacts(inRange);
      setContactStoreContacts('proximity', inRange);
      setScannerContactCount('proximity', inRange.length);
    }
  } else if (prevSigs.proximity.current !== '') {
    prevSigs.proximity.current = '';
    seenContactIds.proximity.clear();
    dispatch.setProximityContacts([]);
    setContactStoreContacts('proximity', []);
    setScannerContactCount('proximity', 0);
  }
}

// ── Radio broadcasts in range ─────────────────────────────────────────

function scanRadio(prevSigs: ScanPrevSigs, vecs: ScanScratchVecs, dispatch: ScanDispatchers): void {
  if (radioOnRef.current) {
    const range = radioRangeRef.current;
    const inRange: NavScanContact[] = [];
    for (const entry of getRadioBroadcasts()) {
      entry.getPosition(vecs.radioPos.current);
      const dist = vecs.radioPos.current.distanceTo(shipPosRef.current);
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
    if (sig !== prevSigs.radio.current) {
      prevSigs.radio.current = sig;
      logNewContacts('radio', inRange);
      dispatch.setRadioContacts(inRange);
      setContactStoreContacts('radio', inRange);
      setScannerContactCount('radio', inRange.length);
    }
  } else if (prevSigs.radio.current !== '') {
    prevSigs.radio.current = '';
    seenContactIds.radio.clear();
    dispatch.setRadioContacts([]);
    setContactStoreContacts('radio', []);
    setScannerContactCount('radio', 0);
  }
}

// ── Radiation sources in range ────────────────────────────────────────

function scanRadiation(
  prevSigs: ScanPrevSigs,
  vecs: ScanScratchVecs,
  dispatch: ScanDispatchers
): void {
  if (radiationOnRef.current) {
    const range = radiationRangeRef.current;
    const inRange: NavScanContact[] = [];
    for (const zone of activeRadiationZonesRef.current) {
      if (!resolveRadiationZoneWorldPosition(zone, vecs.scan.current)) continue;
      const dist = horizontalDistanceToRadiationZone(shipPosRef.current, vecs.scan.current);
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
    if (sig !== prevSigs.radiation.current) {
      prevSigs.radiation.current = sig;
      logNewContacts('radiation', inRange);
      dispatch.setRadiationContacts(inRange);
      setContactStoreContacts('radiation', inRange);
      setScannerContactCount('radiation', inRange.length);
    }
  } else if (prevSigs.radiation.current !== '') {
    prevSigs.radiation.current = '';
    seenContactIds.radiation.clear();
    dispatch.setRadiationContacts([]);
    setContactStoreContacts('radiation', []);
    setScannerContactCount('radiation', 0);
  }
}
