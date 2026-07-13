import type { MutableRefObject } from 'react';
import type * as THREE from 'three';

export type ThrusterKind = 'main' | 'rcs';

export type RegisteredThruster = {
  id: string;
  vesselId: string;
  objectRef: MutableRefObject<THREE.Object3D | null>;
  keyCode: string | null;
  activeRef?: MutableRefObject<boolean>;
  fuelConsumptionMultiplier: number;
  thrustMultiplier: number;
  kind: ThrusterKind;
  yaw: boolean;
  /** +1 or -1 yaw torque direction when `yaw` is true. */
  yawSign: 1 | -1;
  /** Local-space direction linear thrust is applied along (normalized each frame). */
  thrustDirection: THREE.Vector3;
  /** Updated each physics frame for visuals. */
  firing: boolean;
};

const thrusters = new Map<string, RegisteredThruster>();
const keyStates = new Map<string, boolean>();

export function registerThruster(entry: RegisteredThruster): void {
  thrusters.set(entry.id, entry);
}

export function unregisterThruster(id: string): void {
  thrusters.delete(id);
}

export function getThrustersForVessel(vesselId: string): RegisteredThruster[] {
  const result: RegisteredThruster[] = [];
  for (const entry of thrusters.values()) {
    if (entry.vesselId === vesselId) result.push(entry);
  }
  return result;
}

export function setThrusterKeyState(keyCode: string, pressed: boolean): void {
  keyStates.set(keyCode, pressed);
}

export function isThrusterKeyPressed(keyCode: string): boolean {
  return keyStates.get(keyCode) ?? false;
}

export function isThrusterActive(entry: RegisteredThruster): boolean {
  if (entry.keyCode) return isThrusterKeyPressed(entry.keyCode);
  return entry.activeRef?.current ?? false;
}

export function getThruster(id: string): RegisteredThruster | undefined {
  return thrusters.get(id);
}

export function clearThrusterKeyStates(): void {
  keyStates.clear();
}
