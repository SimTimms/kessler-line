/** Public folder holding pre-recorded NPC dialogue clips. */
const NPC_VOICE_CLIP_BASE_PATH = '/npc/';

/**
 * Resolve a dialogue-turn `audio` value to a playable src.
 * Absolute paths and URLs pass through; bare filenames resolve against
 * `public/npc/`.
 */
export function resolveNpcVoiceClipSrc(file?: string): string | undefined {
  const trimmed = file?.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('/') || /^https?:\/\//i.test(trimmed)) return trimmed;
  return `${NPC_VOICE_CLIP_BASE_PATH}${trimmed}`;
}
