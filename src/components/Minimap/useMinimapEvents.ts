import { useEffect, useState } from 'react';
import { minimapOverlayActiveRef } from '../../context/MinimapUi';
import { EVENT_DOCK_PERMISSION_CHANGED } from '../../context/DockPermissionState';
import { EVENT_DOCKING_CAPTURE_ENDED, EVENT_DOCKING_CAPTURE_STARTED } from './minimapHelpers';

/** Esc backs out of fullscreen first, then closes the map; M always closes it. */
export function useMinimapKeyboardClose(
  fullscreen: boolean,
  setFullscreen: (value: boolean) => void
) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        if (fullscreen) {
          setFullscreen(false);
          return;
        }
        return;
      }
      if (e.code === 'KeyM') {
        e.preventDefault();
        if (fullscreen) setFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullscreen, setFullscreen]);
}

/** True while the docking capture sequence is running the ship into the bay. */
export function useDockingCaptureActive(): boolean {
  const [dockingCaptureActive, setDockingCaptureActive] = useState(false);

  useEffect(() => {
    const onCaptureStarted = () => setDockingCaptureActive(true);
    const onCaptureEnded = () => setDockingCaptureActive(false);
    const onShipUndocked = () => setDockingCaptureActive(false);
    window.addEventListener(EVENT_DOCKING_CAPTURE_STARTED, onCaptureStarted);
    window.addEventListener(EVENT_DOCKING_CAPTURE_ENDED, onCaptureEnded);
    window.addEventListener('ShipUndocked', onShipUndocked);
    return () => {
      window.removeEventListener(EVENT_DOCKING_CAPTURE_STARTED, onCaptureStarted);
      window.removeEventListener(EVENT_DOCKING_CAPTURE_ENDED, onCaptureEnded);
      window.removeEventListener('ShipUndocked', onShipUndocked);
    };
  }, []);

  return dockingCaptureActive;
}

/** Dock permission lives outside React, so re-render when it changes. */
export function useDockPermissionVersion() {
  const [, bump] = useState(0);

  useEffect(() => {
    const onDockPermissionChanged = () => bump((v) => v + 1);
    window.addEventListener(EVENT_DOCK_PERMISSION_CHANGED, onDockPermissionChanged);
    return () => window.removeEventListener(EVENT_DOCK_PERMISSION_CHANGED, onDockPermissionChanged);
  }, []);
}

/** Hide scene Html labels (speed / target name) while the map overlay covers them. */
export function useMinimapOverlayFlag(active: boolean) {
  useEffect(() => {
    minimapOverlayActiveRef.current = active;
    return () => {
      minimapOverlayActiveRef.current = false;
    };
  }, [active]);
}

/** Dock / orbit assist takes over the corner chart — leaving fullscreen up would show it dimmed/empty. */
export function useExitFullscreenOnAssist(
  assistActive: boolean,
  fullscreen: boolean,
  setFullscreen: (value: boolean) => void
) {
  useEffect(() => {
    if (assistActive && fullscreen) {
      setFullscreen(false);
    }
  }, [assistActive, fullscreen, setFullscreen]);
}
