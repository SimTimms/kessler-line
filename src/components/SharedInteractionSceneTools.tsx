import HoverSceneTools from './HoverSceneTools';
import ScannerRangeRings from './Scanners/ScannerRangeRings';
import RenderInfoPanel from './Debug/RenderInfoPanel';
import SceneDrawCallBreakdown from './Debug/SceneDrawCallBreakdown';
import { DEBUG_SHOW_PERF_MONITOR } from '../config/debugConfig';
import CargoContainerProximityManager from './CargoContainer/CargoContainerProximityManager';

interface SharedInteractionSceneToolsProps {
  showHoverTools?: boolean;
  showScannerTools?: boolean;
}

/**
 * Shared in-scene interaction/scanner helpers.
 * Use this in scenes so hover/scanner behavior lands everywhere consistently.
 */
export default function SharedInteractionSceneTools({
  showHoverTools = true,
  showScannerTools = true,
}: SharedInteractionSceneToolsProps) {
  return (
    <>
      {showHoverTools ? <HoverSceneTools /> : null}
      {showScannerTools ? <ScannerRangeRings /> : null}
      {DEBUG_SHOW_PERF_MONITOR ? <RenderInfoPanel /> : null}
      {DEBUG_SHOW_PERF_MONITOR ? <SceneDrawCallBreakdown /> : null}
      <CargoContainerProximityManager />
    </>
  );
}
