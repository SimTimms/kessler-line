// Module-level step tracking for the tutorial — no React re-renders needed.
// Written by TutorialShell, read each frame by TutorialStepWatcher.
export const tutorialStepRef = { current: 0 };

/** True while the docking drill shell is active — used so HUD can gate tutorial-only cues. */
export const dockingTutorialActiveRef = { current: false };

/** Thruster types to highlight on the ship for the current tutorial step.
 *  Written by TutorialShell, read by useTutorialThrustersHighlighted. */
export const tutorialThrustersHighlightedRef = { current: [] as string[] };
