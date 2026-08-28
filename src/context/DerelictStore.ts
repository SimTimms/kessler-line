import * as THREE from 'three';

export interface DerelictRecord {
  id: string;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  velocity: THREE.Vector3;
  modelUrl: string;
  deathCause: string;
  timestamp: number;
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
