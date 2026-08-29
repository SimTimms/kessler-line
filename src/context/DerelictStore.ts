import * as THREE from 'three';
import type { InboxMessage } from './MessageStore';
import type { ChatThread } from './ChatStore';
import type { DossierData } from '../components/CommsChat/ContactDossier';

export interface DerelictRecord {
  id: string;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  velocity: THREE.Vector3;
  modelUrl: string;
  deathCause: string;
  timestamp: number;
  cargo: { itemId: string; quantity: number }[];
  fuel: number;
  o2: number;
  power: number;
  isDockable: boolean;
  shipName: string;
  savedContactIds: string[];
  historicalContactIds: string[];
  messages: InboxMessage[];
  chatThreads: ChatThread[];
  pilotDossier: DossierData;
}

const derelicts: DerelictRecord[] = [];

let nextId = 1;

export function addDerelict(
  record: Omit<DerelictRecord, 'id' | 'timestamp'>,
): DerelictRecord {
  const entry: DerelictRecord = {
    ...record,
    position: record.position.clone(),
    quaternion: record.quaternion.clone(),
    velocity: record.velocity.clone(),
    cargo: record.cargo.map((c) => ({ ...c })),
    savedContactIds: [...record.savedContactIds],
    historicalContactIds: [...record.historicalContactIds],
    messages: record.messages.map((m) => ({ ...m })),
    chatThreads: record.chatThreads.map((t) => ({
      ...t,
      messages: t.messages.map((m) => ({ ...m })),
    })),
    pilotDossier: { ...record.pilotDossier },
    id: `derelict-${nextId++}`,
    timestamp: Date.now(),
  };
  derelicts.push(entry);
  return entry;
}

export function getDerelicts(): readonly DerelictRecord[] {
  return derelicts;
}

export function clearDerelicts(): void {
  derelicts.length = 0;
}
