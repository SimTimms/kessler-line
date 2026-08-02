import * as THREE from 'three';
import { NAV_TARGET_DEFS } from '../../../config/worldConfig';
import { EVENT_REQUEST_UNDOCK } from '../../../config/keybindings';
import { isDockingTutorialUndockAllowed } from '../../../tutorial/tutorialDockingInputGate';
import { gravityBodies } from '../../../context/GravityRegistry';
import { navTargetIdRef, navTargetPosRef, clearNavTarget } from '../../../context/NavTarget';
import {
  selectTarget,
  flashTarget,
  clearSelectedTarget,
  selectedTargetName,
  selectedTargetVelocity,
} from '../../../context/TargetSelection';
import {
  autopilotActive,
  autopilotMode,
  autopilotPhase,
  enableAutopilot,
  enableVelocityMatchAutopilot,
  disableAutopilot,
} from '../../../context/AutopilotState';
import type { NavScanPickerId } from '../../../config/navScanPickerConfig';
import type { NavScanContact } from './navScanPickerContacts';
import type { TutorialTargetDef } from './NavHUD';

const NAV_TARGETS = NAV_TARGET_DEFS;

// ── Dispatch interfaces ───────────────────────────────────────────────

export interface SelectDispatch {
  setTargetId: (id: string) => void;
  setTargetLabel: (label: string) => void;
  setSelectedObjName: (name: string | null) => void;
}

export interface ClearNavTargetDispatch extends SelectDispatch {
  selectedObjNameRef: { current: string | null };
  setOpenScanPicker: (v: NavScanPickerId | null) => void;
}

// ── Nav target selection ──────────────────────────────────────────────

/**
 * Resolve a contact/target ID and set it as the active nav target.
 *
 * Checks custom tutorial targets, planetary nav targets, and scan contacts
 * in order, updating both React state and global refs.
 */
export function handleNavTargetSelect(
  id: string,
  dispatch: SelectDispatch,
  allScanContacts: NavScanContact[],
  velVec: THREE.Vector3,
  customGeneralTargets?: TutorialTargetDef[],
  customPlanetaryTargets?: TutorialTargetDef[],
): void {
  // Custom general target (tutorial)
  const customGeneralDef = customGeneralTargets?.find((t) => t.id === id);
  if (customGeneralDef) {
    dispatch.setTargetId(id);
    dispatch.setTargetLabel(customGeneralDef.label);
    dispatch.setSelectedObjName(null);
    clearSelectedTarget();
    navTargetIdRef.current = id;
    customGeneralDef.getPosition(navTargetPosRef.current);
    return;
  }

  // Custom planetary target (tutorial)
  const customPlanetaryDef = customPlanetaryTargets?.find((t) => t.id === id);
  if (customPlanetaryDef) {
    dispatch.setTargetId(id);
    dispatch.setTargetLabel(customPlanetaryDef.label);
    dispatch.setSelectedObjName(null);
    clearSelectedTarget();
    navTargetIdRef.current = id;
    customPlanetaryDef.getPosition(navTargetPosRef.current);
    return;
  }

  // Standard nav target (planet/station from worldConfig)
  const def = NAV_TARGETS.find((t) => t.id === id);
  if (def) {
    dispatch.setTargetId(id);
    dispatch.setTargetLabel('');
    dispatch.setSelectedObjName(null);
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

  // Scan contact (magnetic, drive, proximity, radio, radiation)
  const contact = allScanContacts.find((c) => c.id === id);
  if (contact) {
    dispatch.setTargetId(id);
    dispatch.setTargetLabel(contact.label);
    navTargetIdRef.current = id;
    contact.getPosition(navTargetPosRef.current);
    const vel = contact.getVelocity ? contact.getVelocity(velVec) : undefined;
    selectTarget(contact.label, vel, navTargetPosRef.current, id, contact.type);
    flashTarget();
    if (autopilotActive.current) {
      autopilotPhase.current = 'align';
    }
    window.dispatchEvent(new CustomEvent('NavScanContactSelected', { detail: { id } }));
  }
}

// ── Autopilot toggles ─────────────────────────────────────────────────

/** Toggle approach autopilot on/off. No-op if no nav target is set. */
export function toggleApproachAutopilot(enabled: boolean): void {
  if (!enabled) return;
  if (autopilotActive.current && autopilotMode.current === 'approach') {
    disableAutopilot();
    window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: false } }));
  } else {
    enableAutopilot();
    window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: true } }));
  }
}

/** Toggle velocity-match autopilot on/off. No-op if no target velocity. */
export function toggleVelocityMatch(): void {
  const hasVel = selectedTargetName !== null && selectedTargetVelocity.lengthSq() > 1e-8;
  if (!hasVel) return;
  if (autopilotActive.current && autopilotMode.current === 'velocityMatch') {
    disableAutopilot();
    window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: false } }));
  } else {
    enableVelocityMatchAutopilot();
    window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: true } }));
  }
}

// ── Clear nav target ──────────────────────────────────────────────────

/** Clear all nav target state — global refs, React state, and autopilot. */
export function clearAllNavTargets(dispatch: ClearNavTargetDispatch): void {
  clearNavTarget();
  clearSelectedTarget();
  dispatch.setTargetId('');
  dispatch.setTargetLabel('');
  dispatch.setSelectedObjName(null);
  dispatch.selectedObjNameRef.current = null;
  dispatch.setOpenScanPicker(null);
  if (autopilotActive.current) {
    disableAutopilot();
    window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: false } }));
  }
}

// ── Undock ─────────────────────────────────────────────────────────────

/** Request undock, respecting tutorial gating. */
export function requestUndock(): void {
  if (!isDockingTutorialUndockAllowed()) return;
  window.dispatchEvent(new CustomEvent(EVENT_REQUEST_UNDOCK));
}
