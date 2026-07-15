import HoverSceneTools from './HoverSceneTools';
import ScannerRangeRings from './Scanners/ScannerRangeRings';

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
    </>
  );
}
