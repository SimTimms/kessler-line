/**
 * SaveStore — localStorage-backed save slot store.
 *
 * The interface mirrors what a REST/DB backend would expose,
 * so swapping to a real database only requires re-implementing this file.
 */

export const SAVE_VERSION = 1;

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
  // Inbox
  messages: {
    id: string;
    from: string;
    subject: string;
    body: string;
    read: boolean;
    timestamp: number;
  }[];
}

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
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== SAVE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function deleteSlot(id: string): void {
  writeIndex(readIndex().filter((s) => s.id !== id));
  localStorage.removeItem(slotKey(id));
}

export const AUTOSAVE_SLOT = 'autosave';

export function clearAllSaves(): void {
  const index = readIndex();
  index.forEach((s) => localStorage.removeItem(slotKey(s.id)));
  localStorage.removeItem(INDEX_KEY);
}
