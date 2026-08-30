/**
 * SaveStore — localStorage-backed save slot store.
 *
 * The interface mirrors what a REST/DB backend would expose,
 * so swapping to a real database only requires re-implementing this file.
 */

import type { SettlementStatus } from '../config/settlementConfig';
import type { MessagePlatform, ReplyOption } from './MessageStore';
import type { DroneFlightMode } from './DroneStore';
import type { InventorySlot } from '../config/inventoryTypes';
import type { ChatThread } from './ChatStore';
import type { HailStatus } from './HailState';
import type { ShipRecord } from '../narrative/shipRegistry';
import type { ScannerElementId } from '../config/scanRanges';

export const SAVE_VERSION = 2;

// ── V2 sub-types ──────────────────────────────────────────────────────────────

export interface SavedMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
  read: boolean;
  timestamp: number;
  repliedWith?: string;
  platform?: MessagePlatform;
  replies?: ReplyOption[];
  audioFile?: string;
  audioVoice?: string;
  senderLocationId?: string;
}

export interface SavedMissions {
  activeMission: string[];
  completedMissions: string[];
  declinedMissions?: string[];
}

export interface SavedTutorial {
  step: number;
  dockingActive: boolean;
}

export interface SavedSettlement {
  food: number;
  water: number;
  air: number;
  population: number;
  violence: number;
  status: SettlementStatus;
  starvationElapsedSec: number;
  tickAccumulatorSec: number;
}

export interface SavedDrone {
  mode: DroneFlightMode;
  hull: number;
  targetId: string | null;
  targetLabel: string | null;
  mining: boolean;
  miningProgress: number;
  statusLine: string;
}

export interface SavedInventory {
  ownerKey: string;
  label: string;
  slots: InventorySlot[];
}

// ── Main SaveData ─────────────────────────────────────────────────────────────

export interface SaveData {
  version: number;
  timestamp: number;
  // Position & physics
  position: [number, number, number];
  velocity: [number, number, number];
  quaternion: [number, number, number, number]; // x, y, z, w
  // Resources
  power: number;
  fuel: number;
  o2: number;
  hullIntegrity: number;
  // Damage
  engineDamage: { reverseA: boolean; reverseB: boolean };
  // Inventory
  cargo: { name: string; quantity: number }[];
  // Navigation
  navTargetId: string;
  navTargetPos: [number, number, number];
  // Inbox — V2 includes full message fields
  messages: SavedMessage[];
  // Mission progress
  missions: SavedMissions;
  // Tutorial progress
  tutorial: SavedTutorial;
  // Settlement simulation state
  settlements: Record<string, SavedSettlement>;
  // Drone state
  drone: SavedDrone;
  // Dock/contact inventories (excludes vessel inventories — cargo covers those)
  dockInventories: Record<string, SavedInventory>;
  // Radio comms state (optional — absent in older saves)
  chatThreads?: Record<string, ChatThread>;
  hailStates?: { states: Record<string, HailStatus>; declinedAt: Record<string, number> };
  shipRegistry?: Record<string, ShipRecord>;
  // Scanner power levels (optional — absent in older saves)
  scannerPowerLevels?: Partial<Record<ScannerElementId, number>>;
  // Cargo container sim-space positions (optional — absent in older saves)
  containerPositions?: Record<string, [number, number, number]>;
  // Saved contacts persistence (optional — absent in older saves)
  savedContactIds?: string[];
  historicalContactIds?: string[];
  // CO2 filter state (optional — absent in older saves)
  co2FilterLevel?: number | null;
  co2SpareFilters?: number[];
  co2NoFilterElapsed?: number;
  // Comms buffer state (optional — absent in older saves)
  commsBufferInstalledId?: string | null;
  commsBufferSnapshots?: Record<string, { messages: SavedMessage[]; chatThreads: Record<string, ChatThread> }>;
  // Emergency battery state (optional — absent in older saves)
  emergencyBatteryLevel?: number | null;
  emergencyBatterySpares?: number[];
}

// ── V1 migration ──────────────────────────────────────────────────────────────

interface SaveDataV1 {
  version: number;
  timestamp: number;
  position: [number, number, number];
  velocity: [number, number, number];
  quaternion: [number, number, number, number];
  power: number;
  fuel: number;
  o2: number;
  hullIntegrity: number;
  engineDamage: { reverseA: boolean; reverseB: boolean };
  cargo: { name: string; quantity: number }[];
  navTargetId: string;
  navTargetPos: [number, number, number];
  messages: {
    id: string;
    from: string;
    subject: string;
    body: string;
    read: boolean;
    timestamp: number;
  }[];
}

function migrateV1toV2(v1: SaveDataV1): SaveData {
  return {
    ...v1,
    version: 2,
    // V1 messages didn't have the extra fields — spread keeps existing fields
    messages: v1.messages.map((m) => ({ ...m })),
    missions: { activeMission: [], completedMissions: [] },
    tutorial: { step: 0, dockingActive: false },
    settlements: {},
    drone: {
      mode: 'stowed',
      hull: 100,
      targetId: null,
      targetLabel: null,
      mining: false,
      miningProgress: 0,
      statusLine: 'Bayed — select a target and launch',
    },
    dockInventories: {},
  };
}

// ── Persistence ───────────────────────────────────────────────────────────────

export interface SaveSlotMeta {
  id: string;
  label: string;
  timestamp: number;
}

const NS = 'crubbs';
const INDEX_KEY = `${NS}_saves_index`;
const slotKey = (id: string) => `${NS}_save_${id}`;

function readIndex(): SaveSlotMeta[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]') as SaveSlotMeta[];
  } catch {
    return [];
  }
}

function writeIndex(index: SaveSlotMeta[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function listSlots(): SaveSlotMeta[] {
  return readIndex();
}

export function saveSlot(id: string, label: string, data: SaveData): void {
  const index = readIndex().filter((s) => s.id !== id);
  index.push({ id, label, timestamp: data.timestamp });
  writeIndex(index);
  localStorage.setItem(slotKey(id), JSON.stringify(data));
}

export function loadSlot(id: string): SaveData | null {
  try {
    const raw = localStorage.getItem(slotKey(id));
    if (!raw) return null;
    const data = JSON.parse(raw) as Record<string, unknown>;
    const version = data.version as number;
    if (version === 1) {
      return migrateV1toV2(data as unknown as SaveDataV1);
    }
    if (version !== SAVE_VERSION) return null;
    return data as unknown as SaveData;
  } catch {
    return null;
  }
}

export function deleteSlot(id: string): void {
  writeIndex(readIndex().filter((s) => s.id !== id));
  localStorage.removeItem(slotKey(id));
}

export const AUTOSAVE_SLOT = 'autosave';
export const NARRATIVE_AUTOSAVE_SLOT = 'narrative-autosave';
export const NARRATIVE_MANUAL_SLOT = 'narrative-manual';

export function hasSlot(id: string): boolean {
  return localStorage.getItem(slotKey(id)) !== null;
}

export function clearAllSaves(): void {
  const index = readIndex();
  index.forEach((s) => localStorage.removeItem(slotKey(s.id)));
  localStorage.removeItem(INDEX_KEY);
}
