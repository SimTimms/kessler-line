import {
  DOCKING_PORT_RADIUS,
  SHIP_DOCK_ATTACH_OFFSET_LOCAL,
  SHIP_DOCKING_PORT_LOCAL,
} from './shipConfig';

export type DockCaptureMode = 'nose' | 'hover';

/**
 * World-unit gap kept between ship and partner docking ports while attached.
 * Prevents hull/port collision the instant undock physics resumes.
 */
export const DOCK_ATTACH_PORT_GAP = 0.2;

export interface DockCaptureProfile {
  mode: DockCaptureMode;
  /** Max relative velocity (ship - dock) allowed to trigger docking. */
  maxRelativeSpeed: number;
  /** Ship-local probe point used to test docking capture overlap. */
  probeLocalOffset: [number, number, number];
  /** Docking capture radius around the probe point. */
  captureRadius: number;
  /**
   * Dock-local offset where the ship root snaps when docked.
   * For nose docks this should be {@link SHIP_DOCK_ATTACH_OFFSET_LOCAL} so the
   * ship's docking port coincides with the bay origin (not the ship center).
   */
  attachOffsetLocal: [number, number, number];
  /** Initial speed applied when undocking from this dock profile. */
  undockReleaseSpeed: number;
  /** Hover-mode dock-local Y to return to on undock when capture height was not recorded. */
  hoverReleaseLocalY?: number;
  /**
   * When true (default), ship physics freeze and the ship parents to the bay.
   * When false, the ship keeps flying and the docked partner is towed (e.g. cargo).
   */
  disablePhysicsOnDock?: boolean;
}

export const DEFAULT_DOCK_CAPTURE_PROFILE: DockCaptureProfile = {
  mode: 'nose',
  maxRelativeSpeed: 4,
  probeLocalOffset: [...SHIP_DOCKING_PORT_LOCAL],
  captureRadius: DOCKING_PORT_RADIUS,
  attachOffsetLocal: [...SHIP_DOCK_ATTACH_OFFSET_LOCAL],
  undockReleaseSpeed: 8,
  disablePhysicsOnDock: true,
};

export const RENDEZVOUS_DOCK_CAPTURE_PROFILE: DockCaptureProfile = {
  ...DEFAULT_DOCK_CAPTURE_PROFILE,
  maxRelativeSpeed: 18,
  undockReleaseSpeed: 2.5,
};

export const LANDING_PAD_DOCK_CAPTURE_PROFILE: DockCaptureProfile = {
  mode: 'hover',
  maxRelativeSpeed: 10.65,
  probeLocalOffset: [0, -2.4, 0],
  captureRadius: 3,
  attachOffsetLocal: [0, 6.5, 0],
  undockReleaseSpeed: 3,
  disablePhysicsOnDock: true,
};

/** Cargo-container docking port — towable; ship keeps physics while attached. */
export const CARGO_CONTAINER_DOCK_CAPTURE_PROFILE: DockCaptureProfile = {
  mode: 'nose',
  maxRelativeSpeed: 12,
  probeLocalOffset: [...SHIP_DOCKING_PORT_LOCAL],
  captureRadius: DOCKING_PORT_RADIUS,
  // Pull ship root slightly further from the bay so ports keep a small gap.
  attachOffsetLocal: [
    SHIP_DOCK_ATTACH_OFFSET_LOCAL[0],
    SHIP_DOCK_ATTACH_OFFSET_LOCAL[1],
    SHIP_DOCK_ATTACH_OFFSET_LOCAL[2] + DOCK_ATTACH_PORT_GAP,
  ],
  undockReleaseSpeed: 4,
  disablePhysicsOnDock: false,
};

/** True when docking should freeze the ship (stations / landing pads). */
export function disablesShipPhysicsWhenDocked(profile: DockCaptureProfile): boolean {
  return profile.disablePhysicsOnDock !== false;
}
