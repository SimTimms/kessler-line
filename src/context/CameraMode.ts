/**
 * Shared chase-camera mode for all ship 3D views.
 * - ship: offset is in ship space (camera rotates / yaws with the hull)
 * - free: follows ship position only; offset stays world-aligned
 */

export type CameraFollowMode = 'ship' | 'free';

export const EVENT_CAMERA_MODE_CHANGED = 'CameraModeChanged';

export const cameraModeRef: { current: CameraFollowMode } = { current: 'free' };

export function getCameraMode(): CameraFollowMode {
  return cameraModeRef.current;
}

export function setCameraMode(mode: CameraFollowMode): void {
  if (cameraModeRef.current === mode) return;
  cameraModeRef.current = mode;
  window.dispatchEvent(
    new CustomEvent(EVENT_CAMERA_MODE_CHANGED, { detail: { mode } })
  );
}

export function toggleCameraMode(): CameraFollowMode {
  const next: CameraFollowMode = cameraModeRef.current === 'ship' ? 'free' : 'ship';
  setCameraMode(next);
  return next;
}

export function resetCameraMode(mode: CameraFollowMode = 'free'): void {
  cameraModeRef.current = mode;
  window.dispatchEvent(
    new CustomEvent(EVENT_CAMERA_MODE_CHANGED, { detail: { mode } })
  );
}
