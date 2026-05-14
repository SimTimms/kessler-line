/**
 * Returns the thruster types that should be highlighted on the ship for a
 * given tutorial step ID. Returns an empty array when no highlights are needed.
 *
 * This is the single source of truth for step → highlight mappings. Add new
 * entries here when additional steps need visual thruster callouts.
 *
 * Consumed via useTutorialThrustersHighlighted (R3F canvas components) or by
 * reading tutorialThrustersHighlightedRef directly (non-canvas code).
 */
export function getThrustersHighlightedForStep(stepId: string | undefined): string[] {
  switch (stepId) {
    case 'bas-250-features':
      return ['vertical'];
    case 'bas-250-features-2':
      return ['main'];
    case 'bas-250-features-3':
      return ['rcs'];
    default:
      return [];
  }
}
