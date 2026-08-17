import { memo, useEffect, useState } from 'react';
import {
  cameraModeRef,
  EVENT_CAMERA_MODE_CHANGED,
  setCameraMode,
  type CameraFollowMode,
} from '../../../context/CameraMode';
import { displayLabelForKeyCode, KEY_TOGGLE_CAMERA_DECOUPLE } from '../../../config/keybindings';
import './CameraHUD.css';

const MODES: { id: CameraFollowMode; label: string; hint: string }[] = [
  { id: 'ship', label: 'SHIP', hint: 'Offset locked to ship orientation' },
  { id: 'free', label: 'FREE', hint: 'Follows ship; world-aligned' },
];

/** Compact camera-mode switcher — ship-lock vs free-follow. */
const CameraHUD = memo(function CameraHUD() {
  const [mode, setMode] = useState<CameraFollowMode>(() => cameraModeRef.current);

  useEffect(() => {
    const onChange = (event: Event) => {
      const next = (event as CustomEvent<{ mode?: CameraFollowMode }>).detail?.mode;
      if (next === 'ship' || next === 'free') setMode(next);
    };
    window.addEventListener(EVENT_CAMERA_MODE_CHANGED, onChange);
    setMode(cameraModeRef.current);
    return () => window.removeEventListener(EVENT_CAMERA_MODE_CHANGED, onChange);
  }, []);

  return (
    <div className="mech-camera" aria-label="Camera">
      <div className="mech-camera-bezel">
        <div className="mech-camera-modes" role="group" aria-label="Camera follow mode">
          {MODES.map((entry) => {
            const active = mode === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                className={`event-log-tab${active ? ' event-log-tab--active' : ''}`}
                aria-pressed={active}
                title={entry.hint}
                onClick={() => setCameraMode(entry.id)}
              >
                {entry.label}CAM
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default CameraHUD;
