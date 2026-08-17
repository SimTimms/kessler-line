import { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { NAV_TARGET_DEFS } from '../../../config/worldConfig';
import { dockingTutorialActiveRef, tutorialStepRef } from '../../../context/TutorialState';
import { TUTORIAL_DOCKING_STEPS } from '../../../tutorial/tutorialDockingSteps';
import type { NavScanContact } from './navScanPickerContacts';
import { updateHudDisplayRefs, type HudDisplayRefs } from './navHudDisplayUpdater';
import { scanAllContacts, type ScanPrevSigs, type ScanScratchVecs } from './navHudContactScanner';
import type { NavTargetItem } from './NavTargetDialog';
import type { TutorialTargetDef } from './NavHUD';

const NAV_TARGETS = NAV_TARGET_DEFS;

interface UseNavHudScanningOptions {
  layout: 'classic' | 'helmet';
  focusElements: string[];
  customGeneralTargets?: TutorialTargetDef[];
  customPlanetaryTargets?: TutorialTargetDef[];
  selectedObjNameRef: { current: string | null };
  isDockedRef: { current: boolean };
  undockBtnRef: { current: HTMLButtonElement | null };
}

export interface NavHudScanState {
  displayRefs: HudDisplayRefs;
  navItems: NavTargetItem[];
  generalItems: NavTargetItem[];
  magneticContacts: NavScanContact[];
  driveContacts: NavScanContact[];
  proximityContacts: NavScanContact[];
  radioContacts: NavScanContact[];
  radiationContacts: NavScanContact[];
}

/**
 * Owns contact scan state, display refs, and the rAF loop.
 *
 * Runs `updateHudDisplayRefs` every frame and `scanAllContacts` every
 * 15 frames (~4x/sec at 60 fps). Returns all contact arrays and the
 * display ref bundle for JSX binding.
 */
export function useNavHudScanning(opts: UseNavHudScanningOptions): NavHudScanState {
  const {
    layout,
    focusElements,
    customGeneralTargets,
    customPlanetaryTargets,
    selectedObjNameRef,
    isDockedRef,
    undockBtnRef,
  } = opts;

  // ── Contact state ───────────────────────────────────────────────────
  const [navItems, setNavItems] = useState<NavTargetItem[]>(() =>
    customPlanetaryTargets
      ? customPlanetaryTargets.map((t) => ({ id: t.id, label: t.label }))
      : NAV_TARGETS.map((t) => ({ id: t.id, label: t.label }))
  );
  const [generalItems, setGeneralItems] = useState<NavTargetItem[]>([]);
  const [magneticContacts, setMagneticContacts] = useState<NavScanContact[]>([]);
  const [driveContacts, setDriveContacts] = useState<NavScanContact[]>([]);
  const [proximityContacts, setProximityContacts] = useState<NavScanContact[]>([]);
  const [radioContacts, setRadioContacts] = useState<NavScanContact[]>([]);
  const [radiationContacts, setRadiationContacts] = useState<NavScanContact[]>([]);

  // ── Display refs (DOM elements mutated directly to avoid re-renders) ─
  const displayRefs: HudDisplayRefs = {
    coords: useRef<HTMLSpanElement>(null!),
    orbit: useRef<HTMLSpanElement>(null!),
    alt: useRef<HTMLSpanElement>(null!),
    periapsis: useRef<HTMLSpanElement>(null!),
    apoapsis: useRef<HTMLSpanElement>(null!),
    apsesTarget: useRef<HTMLSpanElement>(null!),
    approach: useRef<HTMLSpanElement>(null!),
    relativeVel: useRef<HTMLSpanElement>(null!),
    autopilotBtn: useRef<HTMLSpanElement>(null!),
    orbitLine: useRef<HTMLSpanElement>(null!),
    speed: useRef<HTMLSpanElement>(null!),
  };

  // ── Scan infrastructure ─────────────────────────────────────────────
  const scanPrevSigs: ScanPrevSigs = {
    nav: useRef(''),
    general: useRef(''),
    magnetic: useRef(''),
    drive: useRef(''),
    proximity: useRef(''),
    radio: useRef(''),
    radiation: useRef(''),
  };

  const scanVecs: ScanScratchVecs = {
    scan: useRef(new THREE.Vector3()),
    nav: useRef(new THREE.Vector3()),
    radioPos: useRef(new THREE.Vector3()),
  };

  const scanFrameCounter = useRef(0);

  // ── rAF loop ────────────────────────────────────────────────────────

  useEffect(() => {
    let raf: number;
    const tick = () => {
      // Per-frame DOM ref updates (coords, orbit, velocity, etc.)
      // updateHudDisplayRefs(displayRefs, selectedObjNameRef.current, layout, focusElements);
      // Throttle contact scanning — every 15 frames (~4x/sec at 60 fps)
      scanFrameCounter.current += 1;
      if (scanFrameCounter.current >= 15) {
        scanFrameCounter.current = 0;
        scanAllContacts(
          scanPrevSigs,
          scanVecs,
          {
            setNavItems,
            setGeneralItems,
            setMagneticContacts,
            setDriveContacts,
            setProximityContacts,
            setRadioContacts,
            setRadiationContacts,
          },
          customGeneralTargets,
          customPlanetaryTargets
        );
      }

      // Tutorial undock pulse
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

  return {
    displayRefs,
    navItems,
    generalItems,
    magneticContacts,
    driveContacts,
    proximityContacts,
    radioContacts,
    radiationContacts,
  };
}
