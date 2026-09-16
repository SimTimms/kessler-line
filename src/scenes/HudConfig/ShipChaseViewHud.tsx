import { forwardRef } from 'react';
import './ShipChaseViewHud.css';

/**
 * Mech-style HUD chrome for the chase / exterior camera PIP.
 * The CRT region is the scissor track — expose via ref.
 * Stacked on the right above CameraHUD (Ship / Free).
 */
const ShipChaseViewHud = forwardRef<HTMLDivElement>(function ShipChaseViewHud(_props, ref) {
  return (
    <div className="ship-chase-hud" aria-label="Exterior chase camera">
      <div className="ship-chase-hud-bezel">
        <div className="ship-chase-hud-head">
          <span className="ship-chase-hud-lamp" aria-hidden />
          <span className="ship-chase-hud-title">EXT CAM</span>
          <span className="ship-chase-hud-sub">CHASE</span>
        </div>
        <div ref={ref} className="ship-chase-hud-crt" />
      </div>
    </div>
  );
});

export default ShipChaseViewHud;
