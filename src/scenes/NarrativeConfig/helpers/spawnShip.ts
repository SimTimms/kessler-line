import { minimapShipPosition } from '../../../context/MinimapShipPosition';
import { shipPosRef } from '../../../context/ShipPos';
import { getNarrativeShipSpawn } from '../narrativeSceneConfig';
import * as THREE from 'three';

const shipSpawn = getNarrativeShipSpawn();

interface SpawnShipProps {
  spaceshipGroupRef: React.RefObject<THREE.Group>;
}

export function spawnShip({ spaceshipGroupRef }: SpawnShipProps) {
  shipPosRef.current.set(shipSpawn.position[0], shipSpawn.position[1], shipSpawn.position[2]);
  minimapShipPosition.set(shipSpawn.position[0], shipSpawn.position[1], shipSpawn.position[2]);
  const group = spaceshipGroupRef.current;
  if (group) {
    group.position.set(shipSpawn.position[0], shipSpawn.position[1], shipSpawn.position[2]);
    group.rotation.set(shipSpawn.rotation[0], shipSpawn.rotation[1], shipSpawn.rotation[2]);
  }
}
