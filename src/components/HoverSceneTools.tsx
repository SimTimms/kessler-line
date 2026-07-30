import HoverPicker from './HoverPicker';
import HoverTrajectoryIndicator from './HoverTrajectoryIndicator';
import HoverClickNavTargetPicker from './HoverClickNavTargetPicker';

/** Raycast hover picking + short trajectory preview. Mount once inside each game Canvas. */
export default function HoverSceneTools() {
  return (
    <>
      <HoverPicker />
      <HoverClickNavTargetPicker />
      <HoverTrajectoryIndicator />
    </>
  );
}
