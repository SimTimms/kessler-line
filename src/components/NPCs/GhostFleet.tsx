import { useEffect } from 'react';
import * as THREE from 'three';
import {
  registerDriveSignature,
  unregisterDriveSignature,
} from '../../context/DriveSignatureRegistry';
import { SHIP_LABELS, GHOST_FLEET_RADIUS } from '../../config/ghostFleetConfig';

interface GhostShipDef {
  id: string;
  label: string;
  position: THREE.Vector3;
}

// Deterministic LCG so positions are consistent across reloads
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function buildGhostFleet(): GhostShipDef[] {
  const rand = seededRandom(42);
  const ships: GhostShipDef[] = [];
  for (let i = 0; i < 100; i++) {
    const angle = rand() * Math.PI * 2;
    const r = -GHOST_FLEET_RADIUS + rand() * GHOST_FLEET_RADIUS; // spread across outer solar system
    ships.push({
      id: `ghost-${i}`,
      label: SHIP_LABELS[i % SHIP_LABELS.length],
      position: new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r),
    });
  }
  return ships;
}

// Built once at module load; positions are stable for the lifetime of the session
const GHOST_FLEET: readonly GhostShipDef[] = buildGhostFleet();

/**
 * Non-rendering component. Registers 100 ghost ships into DriveSignatureRegistry
 * on mount so the DriveSignatureHUD can display them when the scanner is active
 * and the ship is within range — without ever rendering 3D models for them.
 */
export default function GhostFleet() {
  useEffect(() => {
    for (const ship of GHOST_FLEET) {
      const pos = ship.position;
      registerDriveSignature({
        id: ship.id,
        label: ship.label,
        getPosition: (target) => target.copy(pos),
      });
    }
    return () => {
      for (const ship of GHOST_FLEET) {
        unregisterDriveSignature(ship.id);
      }
    };
  }, []);

  return null;
}
