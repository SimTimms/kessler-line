import { DOCKING_PORT_LOCAL_Z, DOCKING_PORT_RADIUS } from './shipConfig';

export type DockCaptureMode = 'nose' | 'hover';

export interface DockCaptureProfile {
  mode: DockCaptureMode;
  /** Max relative velocity (ship - dock) allowed to trigger docking. */
  maxRelativeSpeed: number;
  /** Ship-local probe point used to test docking capture overlap. */
  probeLocalOffset: [number, number, number];
  /** Docking capture radius around the probe point. */
  captureRadius: number;
  /** Dock-local offset where the ship root snaps when docked. */
  attachOffsetLocal: [number, number, number];
  /** Initial speed applied when undocking from this dock profile. */
  undockReleaseSpeed: number;
  /** Hover-mode dock-local Y to return to on undock when capture height was not recorded. */
  hoverReleaseLocalY?: number;
}

export const DEFAULT_DOCK_CAPTURE_PROFILE: DockCaptureProfile = {
  mode: 'nose',
  maxRelativeSpeed: 4,
  probeLocalOffset: [0, -0.025, DOCKING_PORT_LOCAL_Z - 0.1],
  captureRadius: DOCKING_PORT_RADIUS,
  attachOffsetLocal: [0, 0, -DOCKING_PORT_LOCAL_Z],
  undockReleaseSpeed: 8,
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
};
