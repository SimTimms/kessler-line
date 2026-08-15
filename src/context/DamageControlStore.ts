import { hullIntegrity, setHullIntegrity, shipCrew } from './ShipState';
import { cargo, reduceCargoItem, addCargoItem } from './Inventory';
import {
  FRACTURE_DAMAGE_THRESHOLD,
  FRACTURE_REPAIR_HP,
  FRACTURE_MAX,
  HULL_REPAIR_PATCH_ITEM_ID,
  PATCH_DURATION_SECONDS,
} from '../config/damageConfig';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Fracture {
  id: number;
  section: string;
  createdAt: number;
}

export interface PatchJob {
  fractureId: number;
  startedAt: number;          // performance.now() when activated, 0 while queued
  status: 'active' | 'queued';
}

// ── Ship sections ────────────────────────────────────────────────────────────

export const SHIP_SECTIONS = [
  'Nose Cone',
  'Forward Hull',
  'Cabin',
  'Aft Section',
  'Engine Compartment',
  'Port Nacelle',
  'Starboard Nacelle',
  'Ventral Hull',
] as const;

// ── Internal state ───────────────────────────────────────────────────────────

let nextId = 1;
let fractures: Fracture[] = [];
let lastTrackedHull = hullIntegrity;
let damageAccumulator = 0;
let patchJobs: PatchJob[] = [];

const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

// ── Public API ───────────────────────────────────────────────────────────────

export function getFractures(): readonly Fracture[] {
  return fractures;
}

export function getPatchJobs(): readonly PatchJob[] {
  return patchJobs;
}

export function getPatchJobForFracture(fractureId: number): PatchJob | undefined {
  return patchJobs.find((j) => j.fractureId === fractureId);
}

export function subscribeDamageControl(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Call each frame. Compares current hull to last-tracked value and spawns
 * fractures for every FRACTURE_DAMAGE_THRESHOLD HP of cumulative damage.
 */
export function tickDamageControl(): void {
  const current = hullIntegrity;

  // Only accumulate when hull drops (ignore healing)
  if (current < lastTrackedHull) {
    damageAccumulator += lastTrackedHull - current;
  }
  lastTrackedHull = current;

  // Spawn fractures for accumulated damage
  let changed = false;
  while (damageAccumulator >= FRACTURE_DAMAGE_THRESHOLD && fractures.length < FRACTURE_MAX) {
    damageAccumulator -= FRACTURE_DAMAGE_THRESHOLD;
    const section = SHIP_SECTIONS[Math.floor(Math.random() * SHIP_SECTIONS.length)];
    fractures = [...fractures, { id: nextId++, section, createdAt: performance.now() }];
    changed = true;
  }

  if (changed) notify();
}

// ── Patch jobs ───────────────────────────────────────────────────────────────

function activeJobCount(): number {
  return patchJobs.filter((j) => j.status === 'active').length;
}

function maxConcurrentPatches(): number {
  return Math.max(1, Math.floor(shipCrew));
}

/**
 * Begin patching a fracture. Consumes one hull-repair-patch immediately.
 * If crew slots are available the job starts active; otherwise it queues.
 * Returns true on success, false if no patches or fracture not found.
 */
export function startPatch(fractureId: number): boolean {
  const patchSlot = cargo.find((c) => c.name === HULL_REPAIR_PATCH_ITEM_ID);
  if (!patchSlot || patchSlot.quantity < 1) return false;

  const idx = fractures.findIndex((f) => f.id === fractureId);
  if (idx === -1) return false;

  // Don't allow duplicate jobs for the same fracture
  if (patchJobs.some((j) => j.fractureId === fractureId)) return false;

  reduceCargoItem(HULL_REPAIR_PATCH_ITEM_ID, 1);

  const canActivate = activeJobCount() < maxConcurrentPatches();
  patchJobs = [
    ...patchJobs,
    {
      fractureId,
      startedAt: canActivate ? performance.now() : 0,
      status: canActivate ? 'active' : 'queued',
    },
  ];
  notify();
  return true;
}

/**
 * Cancel an in-progress or queued patch job. Refunds the patch item.
 */
export function cancelPatch(fractureId: number): void {
  const idx = patchJobs.findIndex((j) => j.fractureId === fractureId);
  if (idx === -1) return;

  patchJobs = patchJobs.filter((j) => j.fractureId !== fractureId);
  addCargoItem(HULL_REPAIR_PATCH_ITEM_ID, 1);

  // Promote queued jobs if a slot opened up
  promoteQueuedJobs();
  notify();
}

/**
 * Call each frame alongside tickDamageControl. Completes active patch jobs
 * whose timer has elapsed, then promotes queued jobs into freed crew slots.
 */
export function tickPatchJobs(): void {
  const now = performance.now();
  const durationMs = PATCH_DURATION_SECONDS * 1000;
  let changed = false;

  // Collect completed job fracture IDs
  const completed: number[] = [];
  for (const job of patchJobs) {
    if (job.status === 'active' && now - job.startedAt >= durationMs) {
      completed.push(job.fractureId);
    }
  }

  // Apply completions
  for (const fId of completed) {
    completeFractureSeal(fId);
    changed = true;
  }

  // Remove completed jobs
  if (completed.length > 0) {
    patchJobs = patchJobs.filter((j) => !completed.includes(j.fractureId));
  }

  // Promote queued → active if crew slots freed up
  if (completed.length > 0) {
    promoteQueuedJobs();
  }

  if (changed) notify();
}

function promoteQueuedJobs(): void {
  const max = maxConcurrentPatches();
  let active = activeJobCount();
  let promoted = false;

  patchJobs = patchJobs.map((j) => {
    if (j.status === 'queued' && active < max) {
      active++;
      promoted = true;
      return { ...j, status: 'active' as const, startedAt: performance.now() };
    }
    return j;
  });

  if (promoted) notify();
}

/** Internal: seal a fracture on timer completion (no item consumption). */
function completeFractureSeal(fractureId: number): void {
  const idx = fractures.findIndex((f) => f.id === fractureId);
  if (idx === -1) return;

  setHullIntegrity(Math.min(100, hullIntegrity + FRACTURE_REPAIR_HP));
  lastTrackedHull = hullIntegrity;
  fractures = fractures.filter((f) => f.id !== fractureId);
}

/**
 * Attempt to seal a fracture by consuming one hull-repair-patch from cargo.
 * Returns true on success, false if no patches available.
 */
export function sealFracture(id: number): boolean {
  const patchSlot = cargo.find((c) => c.name === HULL_REPAIR_PATCH_ITEM_ID);
  if (!patchSlot || patchSlot.quantity < 1) return false;

  const idx = fractures.findIndex((f) => f.id === id);
  if (idx === -1) return false;

  reduceCargoItem(HULL_REPAIR_PATCH_ITEM_ID, 1);
  setHullIntegrity(Math.min(100, hullIntegrity + FRACTURE_REPAIR_HP));
  // Update tracked hull so the restored HP isn't re-counted as new damage
  lastTrackedHull = hullIntegrity;
  fractures = fractures.filter((f) => f.id !== id);
  notify();
  return true;
}

/** Remove all fractures (e.g. on full repair at a station). */
export function clearFractures(): void {
  if (fractures.length === 0 && patchJobs.length === 0) return;
  fractures = [];
  patchJobs = [];
  notify();
}

/** Full reset for scene init. */
export function resetDamageControl(): void {
  fractures = [];
  patchJobs = [];
  nextId = 1;
  lastTrackedHull = hullIntegrity;
  damageAccumulator = 0;
  notify();
}

/** Current number of hull-repair-patches in player cargo. */
export function getPatchCount(): number {
  const slot = cargo.find((c) => c.name === HULL_REPAIR_PATCH_ITEM_ID);
  return slot?.quantity ?? 0;
}
