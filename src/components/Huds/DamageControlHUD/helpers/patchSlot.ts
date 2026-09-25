import { useEffect, useState, type Dispatch, type DragEvent, type SetStateAction } from 'react';
import {
  getFractures,
  subscribeDamageControl,
  startPatch,
  cancelPatch,
  getPatchJobs,
  type PatchJob,
} from '../../../../context/DamageControlStore';
import { HULL_REPAIR_PATCH_ITEM_ID } from '../../../../config/damageConfig';
import { isCargoDragEvent, readCargoDragPayload } from '../../PowerHUD/Cargo/cargoHoldHelpers';

/** Live hull fractures and their in-flight patch jobs. */
export function useDamageControl() {
  const [items, setItems] = useState(() => getFractures());
  const [jobs, setJobs] = useState<readonly PatchJob[]>(() => getPatchJobs());
  useEffect(
    () =>
      subscribeDamageControl(() => {
        setItems(getFractures());
        setJobs(getPatchJobs());
      }),
    []
  );
  return { fractures: items, patchJobs: jobs };
}

interface PatchDragHandlersProps {
  setPatchDropTarget: Dispatch<SetStateAction<number | null>>;
}

/** Drag-and-drop handlers for the per-fracture hull patch slots. */
export function createPatchDragHandlers({ setPatchDropTarget }: PatchDragHandlersProps) {
  function onPatchDragOver(e: DragEvent, fractureId: number) {
    if (!isCargoDragEvent(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setPatchDropTarget(fractureId);
  }

  function onPatchDragLeave(fractureId: number) {
    setPatchDropTarget((prev) => (prev === fractureId ? null : prev));
  }

  function onPatchDrop(e: DragEvent, fractureId: number) {
    setPatchDropTarget(null);
    e.preventDefault();
    const payload = readCargoDragPayload(e.dataTransfer);
    if (!payload || payload.itemId !== HULL_REPAIR_PATCH_ITEM_ID) return;
    startPatch(fractureId);
  }

  function onPatchCancel(fractureId: number) {
    cancelPatch(fractureId);
  }

  return { onPatchDragOver, onPatchDragLeave, onPatchDrop, onPatchCancel };
}
