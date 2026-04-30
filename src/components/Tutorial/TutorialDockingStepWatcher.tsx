import { useEffect, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { tutorialStepRef } from '../../context/TutorialState';
import { TUTORIAL_DOCKING_STEPS } from '../../tutorial/tutorialDockingSteps';
import {
  KEY_TOGGLE_CAMERA_DECOUPLE,
  KEY_TOGGLE_NAV_HUD,
  KEY_UNDOCK_CARGO,
} from '../../config/keybindings';
import { shipPosRef } from '../../context/ShipPos';
import { shipVelocity } from '../../context/ShipState';
import { magneticOnRef } from '../../context/MagneticScan';
import { selectedTargetPosition, selectedTargetVelocity } from '../../context/TargetSelection';

interface Props {
  onStepAdvance: () => void;
  waypointRef: RefObject<THREE.Object3D | null>;
}

const _waypointWorld = new THREE.Vector3();
const _toTargetDir = new THREE.Vector3();
const WAYPOINT_REACHED_DISTANCE = 120;
const WAYPOINT_MAGNETIC_ID = 'tutorial-waypoint-drone';

export default function TutorialDockingStepWatcher({ onStepAdvance, waypointRef }: Props) {
  const lastStep = useRef(-1);
  const advancedRef = useRef(false);
  const undockedRef = useRef(false);
  const navHudToggleRef = useRef(false);
  const navViewRef = useRef(false);
  const waypointTargetSelectedRef = useRef(false);
  const redockedRef = useRef(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const id = TUTORIAL_DOCKING_STEPS[tutorialStepRef.current]?.id;
      if (id === 'docking-undock' && e.code === KEY_UNDOCK_CARGO) undockedRef.current = true;
      if (id === 'docking-navhud-toggle' && e.code === KEY_TOGGLE_NAV_HUD) navHudToggleRef.current = true;
      if (id === 'docking-navview' && e.code === KEY_TOGGLE_CAMERA_DECOUPLE) navViewRef.current = true;
    };
    const onUndocked = () => {
      if (TUTORIAL_DOCKING_STEPS[tutorialStepRef.current]?.id === 'docking-undock') {
        undockedRef.current = true;
      }
    };
    const onDocked = (event: Event) => {
      const detail = (event as CustomEvent<{ stationId?: string | null }>).detail;
      if (TUTORIAL_DOCKING_STEPS[tutorialStepRef.current]?.id !== 'docking-redock') return;
      if (!detail?.stationId || detail.stationId === 'tutorial-space-station') redockedRef.current = true;
    };
    const onNavScanContactSelected = (event: Event) => {
      const id = TUTORIAL_DOCKING_STEPS[tutorialStepRef.current]?.id;
      if (id !== 'docking-scanner') return;
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (detail?.id === WAYPOINT_MAGNETIC_ID) waypointTargetSelectedRef.current = true;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('ShipUndocked', onUndocked);
    window.addEventListener('ShipDocked', onDocked);
    window.addEventListener('NavScanContactSelected', onNavScanContactSelected);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('ShipUndocked', onUndocked);
      window.removeEventListener('ShipDocked', onDocked);
      window.removeEventListener('NavScanContactSelected', onNavScanContactSelected);
    };
  }, []);

  useFrame(() => {
    const step = tutorialStepRef.current;
    if (step >= TUTORIAL_DOCKING_STEPS.length) return;

    if (lastStep.current !== step) {
      lastStep.current = step;
      advancedRef.current = false;
      undockedRef.current = false;
      navHudToggleRef.current = false;
      navViewRef.current = false;
      waypointTargetSelectedRef.current = false;
      redockedRef.current = false;
    }
    if (advancedRef.current) return;

    const id = TUTORIAL_DOCKING_STEPS[step].id;
    let met = false;
    if (id === 'docking-undock') {
      met = undockedRef.current;
    } else if (id === 'docking-navhud-toggle') {
      met = navHudToggleRef.current;
    } else if (id === 'docking-navview') {
      met = navViewRef.current;
    } else if (id === 'docking-magnetic-scan') {
      met = magneticOnRef.current;
    } else if (id === 'docking-waypoint') {
      const waypointObj = waypointRef.current;
      if (waypointObj) {
        waypointObj.getWorldPosition(_waypointWorld);
        met = shipPosRef.current.distanceTo(_waypointWorld) <= WAYPOINT_REACHED_DISTANCE;
      }
    } else if (id === 'docking-scanner') {
      met = waypointTargetSelectedRef.current;
    } else if (id === 'docking-relative-velocity-state') {
      _toTargetDir.subVectors(selectedTargetPosition, shipPosRef.current);
      const dist = _toTargetDir.length();
      if (dist > 1e-5) {
        _toTargetDir.multiplyScalar(1 / dist);
        const relVel =
          (shipVelocity.x - selectedTargetVelocity.x) * _toTargetDir.x +
          (shipVelocity.y - selectedTargetVelocity.y) * _toTargetDir.y +
          (shipVelocity.z - selectedTargetVelocity.z) * _toTargetDir.z;
        // Advance as soon as we are closing in on the target.
        met = relVel > 0;
      }
    } else if (id === 'docking-redock') {
      met = redockedRef.current;
    }

    if (met) {
      advancedRef.current = true;
      onStepAdvance();
    }
  });

  return null;
}
