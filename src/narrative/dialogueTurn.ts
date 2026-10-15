// Dialogue turn engine — the single path a conversation takes, whether it is
// running over the radio (CommsChat) or face to face in a dock interior
// (StationDialogue). Two primitives:
//
//   deliverTurn()          — NPC side: push a turn's line, then hand the player
//                            its options (or close the channel on a dead end).
//   chooseDialogueOption() — player side: log the chosen line, apply the
//                            option's effects, then deliver the next turn.
//
// The differences between the two callers are injected, not branched on:
// `resolveText` for radio {{token}} substitution, `delayMs` for pacing, and
// `onDelivered` for the dock trade panel.

import {
  addChatMessage,
  getThread,
  setChatTurn,
  setThreadDialogueTree,
} from '../context/ChatStore';
import { resolveNpcVoiceClipSrc } from '../sound/npcVoiceClips';
import { applyDialogueEffects } from './dialogueEffects';
import type { DockDialogueTurn } from '../types/dialogueTypes';

/**
 * Turn map accepted by both callers. The dock turn is the superset — radio
 * trees simply leave `audio`, `trade` and option `effects` unset — so a
 * `Record<string, DialogueTurn>` from npcDialogues is assignable as-is.
 */
export type DialogueTurnMap = Record<string, DockDialogueTurn>;

/** Dock trees carry no {{tokens}}, so text passes through untouched. */
const asIs = (text: string) => text;

// ── Pacing ──────────────────────────────────────────────────────────────────
/** Dock opening line, re-entry, or a turn pushed in from outside the panel. */
export const dockTurnDelayMs = () => 700 + Math.random() * 900;
/** Dock reply — someone is standing in front of you. */
export const dockReplyDelayMs = () => 900 + Math.random() * 1100;
/** Radio opening line. */
export const radioOpeningDelayMs = () => 1200 + Math.random() * 1800;
/** Radio reply — interplanetary lag. */
export const radioReplyDelayMs = () => 2000 + Math.random() * 3000;

/** A turn with nothing left to say and no trade to run closes the thread. */
export function isTerminalTurn(turn: DockDialogueTurn): boolean {
  return turn.playerOptions.length === 0 && !turn.trade;
}

export interface DeliverTurnArgs {
  threadId: string;
  turns: DialogueTurnMap;
  /** Turn to deliver, or null to close the conversation after the delay. */
  turnId: string | null;
  delayMs?: number;
  resolveText?: (text: string) => string;
  /** Repoint the saved thread at a swapped-in tree before delivering. */
  treeId?: string;
  /** Lines pushed in ahead of the NPC's reply — effect outcomes. */
  prelude?: string[];
  /** Runs once the line has landed, with the delivered turn (null on close). */
  onDelivered?: (turn: DockDialogueTurn | null) => void;
}

/**
 * Deliver one NPC turn into an existing thread: the line lands after a beat,
 * then the player gets that turn's options. Returns false when there is no
 * thread yet, or the tree has no such turn.
 */
export function deliverTurn({
  threadId,
  turns,
  turnId,
  delayMs = dockTurnDelayMs(),
  resolveText = asIs,
  treeId,
  prelude,
  onDelivered,
}: DeliverTurnArgs): boolean {
  if (!getThread(threadId)) return false;

  const turn = turnId ? turns[turnId] : null;
  if (turnId && !turn) {
    console.warn(`[dialogueTurn] thread "${threadId}" has no turn "${turnId}"`);
    return false;
  }

  if (treeId) setThreadDialogueTree(threadId, treeId);
  // Hold the options row while the NPC "thinks" — including on a closing line.
  setChatTurn(threadId, turnId, true);

  const audioSrc = resolveNpcVoiceClipSrc(turn?.audio);
  const npcText = turn ? resolveText(turn.npcText) : null;

  setTimeout(() => {
    prelude?.forEach((text, i) => {
      addChatMessage(threadId, {
        id: `fx-${threadId}-${i}-${Date.now()}`,
        role: 'npc',
        text,
        timestamp: Date.now(),
      });
    });

    if (turn && npcText !== null) {
      addChatMessage(threadId, {
        id: `npc-${threadId}-${turnId}-${Date.now()}`,
        role: 'npc',
        text: npcText,
        timestamp: Date.now(),
        audioSrc,
      });
    }

    setChatTurn(threadId, turn && !isTerminalTurn(turn) ? turnId : null, false);
    onDelivered?.(turn);
  }, delayMs);

  return true;
}

export interface ChooseDialogueOptionArgs {
  threadId: string;
  turns: DialogueTurnMap;
  /** The thread's current turn — the option is looked up on it. */
  currentTurnId: string | null;
  optionId: string;
  resolveText?: (text: string) => string;
  delayMs?: number;
  /** Clear pending UI (trade drafts) before the conversation moves on. */
  onBeforeAdvance?: () => void;
  onDelivered?: (turn: DockDialogueTurn | null) => void;
}

/**
 * Apply a player's choice: their line goes in immediately, the option's
 * effects fire, and the next turn is delivered after a beat with any effect
 * outcomes riding in ahead of it.
 */
export function chooseDialogueOption({
  threadId,
  turns,
  currentTurnId,
  optionId,
  resolveText = asIs,
  delayMs = dockReplyDelayMs(),
  onBeforeAdvance,
  onDelivered,
}: ChooseDialogueOptionArgs): void {
  const activeTurn = currentTurnId ? turns[currentTurnId] : null;
  if (!activeTurn) return;

  const option = activeTurn.playerOptions.find((o) => o.id === optionId);
  if (!option) return;

  onBeforeAdvance?.();

  addChatMessage(threadId, {
    id: `player-${threadId}-${optionId}-${Date.now()}`,
    role: 'player',
    text: resolveText(option.text),
    timestamp: Date.now(),
  });

  const prelude = applyDialogueEffects(option.effects)
    .map((outcome) => outcome.text)
    .filter((text): text is string => !!text)
    .map((text) => `» ${text}`);

  deliverTurn({
    threadId,
    turns,
    turnId: option.nextTurnId,
    delayMs,
    resolveText,
    prelude,
    onDelivered,
  });
}
