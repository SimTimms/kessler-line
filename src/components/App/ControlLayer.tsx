import { memo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import ThrustPanel from './ThrustPanel';

interface ControlLayerProps {
  thrustLevel: number;
  setThrustLevel: Dispatch<SetStateAction<number>>;
}

const ControlLayer = memo(function ControlLayer({
  thrustLevel,
  setThrustLevel,
}: ControlLayerProps) {
  return <ThrustPanel thrustLevel={thrustLevel} setThrustLevel={setThrustLevel} />;
});

export default ControlLayer;
