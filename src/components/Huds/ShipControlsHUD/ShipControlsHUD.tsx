import { memo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import ThrustPanel from '../../App/ThrustPanel';
import './ShipControlsHUD.css';

interface ShipControlsHUDProps {
  thrustLevel?: number;
  setThrustLevel?: Dispatch<SetStateAction<number>>;
}

/** Vertical thrust slider — mech console, bottom-right beside Dock Assist / Star Chart. */
const ShipControlsHUD = memo(function ShipControlsHUD({
  thrustLevel,
  setThrustLevel,
}: ShipControlsHUDProps) {
  return (
    <div className="mech-thrust" aria-label="Thrust">
      <div className="mech-thrust-bezel">
        <div className="mech-thrust-head">
          <span className="mech-thrust-lamp" aria-hidden />
          <span className="mech-thrust-title">ENG</span>
        </div>
        <ThrustPanel embedded thrustLevel={thrustLevel} setThrustLevel={setThrustLevel} />
      </div>
    </div>
  );
});

export default ShipControlsHUD;
