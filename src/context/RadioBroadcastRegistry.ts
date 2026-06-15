import * as THREE from 'three';
import type { RadioBroadcastDef } from '../config/worldConfig';

/** A radio contact registered by a world object present in the scene. */
export interface RadioBroadcastEntry {
  id: string;
  label: string;
  getPosition: (target: THREE.Vector3) => THREE.Vector3;
  dialogue: string[];
  hailRange?: number;
  dialogueTreeId?: string;
  dockable?: boolean;
  dockingBay?: string;
  /** Dynamic broadcast lines (e.g. settlement needs). */
  getDialogue?: () => string[];
  /** Dynamic hail dialogue tree (e.g. settlement needs). */
  getDialogueTreeId?: () => string | undefined;
  /** When false, incoming hail is suppressed (e.g. dead settlement). */
  isHailEnabled?: () => boolean;
}

const entries: RadioBroadcastEntry[] = [];

export function registerRadioBroadcast(entry: RadioBroadcastEntry): void {
  const idx = entries.findIndex((e) => e.id === entry.id);
  if (idx !== -1) entries.splice(idx, 1);
  entries.push(entry);
}

export function unregisterRadioBroadcast(id: string): void {
  const idx = entries.findIndex((e) => e.id === id);
  if (idx !== -1) entries.splice(idx, 1);
}

export function getRadioBroadcasts(): readonly RadioBroadcastEntry[] {
  return entries;
}

export function resolveRadioDialogue(entry: RadioBroadcastEntry): string[] {
  return entry.getDialogue?.() ?? entry.dialogue;
}

export function resolveRadioDialogueTreeId(entry: RadioBroadcastEntry): string | undefined {
  return entry.getDialogueTreeId?.() ?? entry.dialogueTreeId;
}

export function isRadioHailEnabled(entry: RadioBroadcastEntry): boolean {
  return entry.isHailEnabled?.() ?? true;
}

export function patchRadioBroadcastSettlement(
  objectId: string,
  patch: Pick<RadioBroadcastEntry, 'getDialogue' | 'getDialogueTreeId' | 'isHailEnabled'>
): void {
  const idx = entries.findIndex((e) => e.id === objectId);
  if (idx === -1) return;
  Object.assign(entries[idx], patch);
}

export function clearRadioBroadcastSettlementPatches(objectId: string): void {
  patchRadioBroadcastSettlement(objectId, {
    getDialogue: undefined,
    getDialogueTreeId: undefined,
    isHailEnabled: undefined,
  });
}

export function registerRadioBroadcastFromDef(
  def: RadioBroadcastDef,
  getPosition: (target: THREE.Vector3) => THREE.Vector3
): void {
  registerRadioBroadcast({
    id: def.id,
    label: def.label,
    getPosition,
    dialogue: def.dialogue,
    hailRange: def.hailRange,
    dialogueTreeId: def.dialogueTreeId,
    dockable: def.dockable,
    dockingBay: def.dockingBay,
  });
}
