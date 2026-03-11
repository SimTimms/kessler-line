import { memo } from 'react';
import MobileControls from '../MobileControls';
import { ShipDestroyedOverlay } from '../Ship/ShipDestroyedOverlay';
import { GForceOverlay } from '../../GForceOverlay';

const OverlayLayer = memo(function OverlayLayer() {
  return (
    <>
      <GForceOverlay />
      <ShipDestroyedOverlay />
      <MobileControls />
    </>
  );
});

export default OverlayLayer;
