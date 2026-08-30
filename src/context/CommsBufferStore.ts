// ── Comms Buffer Store ────────────────────────────────────────────────────────
// Module-level store following the CO2FilterStore pattern.
// Manages the installed comms buffer slot and per-buffer message snapshots.

import { COMMS_BUFFER_ITEM_ID } from '../config/damageConfig';
import { snapshotMessages, restoreMessages, type InboxMessage } from './MessageStore';
import { getAllThreads, restoreThreads, type ChatThread } from './ChatStore';
import {
  addInventoryItem,
  removeInventoryItem,
} from './InventoryStore';
import { PLAYER_VESSEL_ID } from './PlayerShipState';
import { refreshPlayerCargoBinding } from './Inventory';
import { commsBufferInstalledRef } from './CommsBufferRef';
import { playCommsBufferEject } from '../sound/SoundManager';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BufferSnapshot {
  messages: InboxMessage[];
  chatThreads: Record<string, ChatThread>;
}

// ── Internal state ───────────────────────────────────────────────────────────

const playerOwner = { kind: 'vessel' as const, vesselId: PLAYER_VESSEL_ID };

/** null = empty slot (no buffer installed). */
let installedBufferId: string | null = 'player-ship';

/** Saved data for buffers NOT currently installed (installed buffer is live). */
const bufferSnapshots = new Map<string, BufferSnapshot>();

const listeners = new Set<() => void>();

function syncRef() {
  commsBufferInstalledRef.current = installedBufferId !== null;
}

function notify() {
  syncRef();
  for (const fn of listeners) fn();
}

// ── Snapshot helpers ─────────────────────────────────────────────────────────

function captureLiveSnapshot(): BufferSnapshot {
  const chatThreads: Record<string, ChatThread> = {};
  for (const [id, thread] of getAllThreads()) {
    chatThreads[id] = {
      ...thread,
      messages: thread.messages.map((m) => ({ ...m })),
    };
  }
  return {
    messages: snapshotMessages(),
    chatThreads,
  };
}

function restoreLiveFromSnapshot(snapshot: BufferSnapshot): void {
  restoreMessages(snapshot.messages);
  restoreThreads(snapshot.chatThreads);
}

function clearLiveData(): void {
  restoreMessages([]);
  restoreThreads({});
}

// ── Public API ───────────────────────────────────────────────────────────────

export function getInstalledBufferId(): string | null {
  return installedBufferId;
}

export function isBufferInstalled(): boolean {
  return installedBufferId !== null;
}

export function subscribeCommsBuffer(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Remove the installed buffer: snapshot live data, add buffer to cargo,
 * clear live messages/threads, set slot to null.
 */
export function removeInstalledBuffer(): void {
  if (installedBufferId === null) return;

  const outgoingId = installedBufferId;

  // Snapshot live data into the map
  bufferSnapshots.set(outgoingId, captureLiveSnapshot());

  // Add comms-buffer item to cargo with salvagedBy tag
  addInventoryItem(playerOwner, COMMS_BUFFER_ITEM_ID, 1, { salvagedBy: outgoingId });
  refreshPlayerCargoBinding();

  // Clear live message/thread state
  clearLiveData();

  installedBufferId = null;
  notify();
  playCommsBufferEject();
}

/**
 * Install a buffer from cargo. If a buffer is already installed, it gets
 * snapshotted and returned to cargo first (auto-swap).
 */
export function installBufferFromCargo(bufferId: string): boolean {
  // If the same buffer is already installed, nothing to do
  if (installedBufferId === bufferId) return false;

  // Auto-swap: if a buffer is currently installed, snapshot and return it to cargo
  if (installedBufferId !== null) {
    const outgoingId = installedBufferId;
    bufferSnapshots.set(outgoingId, captureLiveSnapshot());
    addInventoryItem(playerOwner, COMMS_BUFFER_ITEM_ID, 1, { salvagedBy: outgoingId });
    refreshPlayerCargoBinding();
  }

  // Remove incoming buffer from cargo (matched by salvagedBy tag)
  removeInventoryItem(playerOwner, COMMS_BUFFER_ITEM_ID, 1, { salvagedBy: bufferId });
  refreshPlayerCargoBinding();

  // Restore the incoming buffer's snapshot if it exists, otherwise clear
  const snapshot = bufferSnapshots.get(bufferId);
  if (snapshot) {
    restoreLiveFromSnapshot(snapshot);
    bufferSnapshots.delete(bufferId);
  } else {
    clearLiveData();
  }

  installedBufferId = bufferId;
  notify();
  playCommsBufferEject();
  return true;
}

/**
 * Pre-populate a buffer's message data before the player picks it up.
 * Used by missions to seed a buffer with messages.
 */
export function preloadBufferData(bufferId: string, snapshot: BufferSnapshot): void {
  bufferSnapshots.set(bufferId, snapshot);
}

/** Full reset for new-game init. */
export function resetCommsBuffer(): void {
  installedBufferId = 'player-ship';
  bufferSnapshots.clear();
  notify();
}

// ── Save / Restore ───────────────────────────────────────────────────────────

export function captureCommsBufferState(): {
  installedBufferId: string | null;
  snapshots: Record<string, BufferSnapshot>;
} {
  const snapshots: Record<string, BufferSnapshot> = {};
  for (const [id, snap] of bufferSnapshots) {
    snapshots[id] = {
      messages: snap.messages.map((m) => ({ ...m, replies: m.replies?.map((r) => ({ ...r })) })),
      chatThreads: Object.fromEntries(
        Object.entries(snap.chatThreads).map(([k, t]) => [
          k,
          { ...t, messages: t.messages.map((m) => ({ ...m })) },
        ])
      ),
    };
  }
  return { installedBufferId, snapshots };
}

export function applyCommsBufferState(
  savedInstalledId: string | null,
  savedSnapshots: Record<string, BufferSnapshot>,
): void {
  installedBufferId = savedInstalledId;
  bufferSnapshots.clear();
  for (const [id, snap] of Object.entries(savedSnapshots)) {
    bufferSnapshots.set(id, {
      messages: snap.messages.map((m) => ({ ...m, replies: m.replies?.map((r) => ({ ...r })) })),
      chatThreads: Object.fromEntries(
        Object.entries(snap.chatThreads).map(([k, t]) => [
          k,
          { ...t, messages: t.messages.map((m) => ({ ...m })) },
        ])
      ),
    });
  }
  notify();
}
