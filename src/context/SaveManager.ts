/**
 * SaveManager — reads from / writes to all global state refs.
 *
 * capture() snapshots the current game state into a SaveData object.
 * apply()   restores a SaveData object back into all global state refs.
 *
 * Note: mission state and docking state live in React hooks rather than
 * global refs; those will be wired in once lifted to module-level refs.
 */

import * as THREE from 'three';
import { SAVE_VERSION, type SaveData } from './SaveStore';
import { shipPosRef } from './ShipPos';
import {
  power,
  fuel,
  o2,
  hullIntegrity,
  setPower,
  setFuel,
  setO2,
  setHullIntegrity,
  shipVelocity,
  shipQuaternion,
  mainEngineDisabled,
} from './ShipState';
import { cargo, setCargo } from './Inventory';
import { navTargetIdRef, navTargetPosRef } from './NavTarget';
import { messageStore } from './MessageStore';

export function capture(): SaveData {
  return {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    position: [shipPosRef.current.x, shipPosRef.current.y, shipPosRef.current.z],
    velocity: [shipVelocity.x, shipVelocity.y, shipVelocity.z],
    quaternion: [shipQuaternion.x, shipQuaternion.y, shipQuaternion.z, shipQuaternion.w],
    power,
    fuel,
    o2,
    hullIntegrity,
    engineDamage: {
      reverseA: mainEngineDisabled.reverseA.current,
      reverseB: mainEngineDisabled.reverseB.current,
    },
    cargo: cargo.map((c) => ({ name: c.name, quantity: c.quantity })),
    navTargetId: navTargetIdRef.current,
    navTargetPos: [navTargetPosRef.current.x, navTargetPosRef.current.y, navTargetPosRef.current.z],
    messages: messageStore.current.map((m) => ({ ...m })),
  };
}

/**
 * Apply a save to all module-level state refs.
 * Call this before the Spaceship component mounts so that initialPosition
 * picks up the restored coordinates.
 */
export function apply(data: SaveData): void {
  // Position — shipPosRef is read by Scene to set initialPosition
  shipPosRef.current.set(...data.position);

  // Velocity & quaternion — written into the Three.js objects that
  // useShipPhysics reads on its first frame
  shipVelocity.set(...data.velocity);
  shipQuaternion.set(...data.quaternion);

  // Resources
  setPower(data.power);
  setFuel(data.fuel);
  setO2(data.o2);
  setHullIntegrity(data.hullIntegrity);

  // Engine damage
  mainEngineDisabled.reverseA.current = data.engineDamage.reverseA;
  mainEngineDisabled.reverseB.current = data.engineDamage.reverseB;

  // Cargo
  setCargo(data.cargo);

  // Nav target
  navTargetIdRef.current = data.navTargetId;
  navTargetPosRef.current.set(...data.navTargetPos);

  // Inbox — add messages that aren't already present
  for (const msg of data.messages) {
    const exists = messageStore.current.some((m) => m.id === msg.id);
    if (!exists) {
      messageStore.current.push({ ...msg });
    } else {
      // Restore read state
      const existing = messageStore.current.find((m) => m.id === msg.id);
      if (existing) existing.read = msg.read;
    }
  }
}

/** Convert a saved quaternion to Euler XYZ angles for R3F group rotation prop. */
export function savedQuaternionToEuler(
  q: [number, number, number, number]
): [number, number, number] {
  const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(...q), 'XYZ');
  return [euler.x, euler.y, euler.z];
}
