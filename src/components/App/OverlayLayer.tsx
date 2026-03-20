import { memo } from 'react';
import MobileControls from '../MobileControls';
import { GForceOverlay } from './GForceOverlay';

const OverlayLayer = memo(function OverlayLayer() {
  return (
    <>
      <GForceOverlay />
      <MobileControls />
    </>
  );
});

export default OverlayLayer;
