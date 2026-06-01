import type * as THREE from 'three';

export interface Building {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  warm: boolean;
}

export interface RoadBuilding {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  w: number;
  d: number;
  h: number;
  warm: boolean;
}

export interface DomeLayout {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  radius: number;
  buildings: Building[];
  instanceMatrices: THREE.Matrix4[];
  lights: Float32Array;
}

export interface RoadLayout {
  domeA: number;
  domeB: number;
  linePositions: Float32Array;
  buildings: RoadBuilding[];
  lights: Float32Array;
  vehicleSlots: VehicleSlot[];
}

export interface VehicleSlot {
  roadIndex: number;
  phase: number;
  speed: number;
  brightness: number;
}

export interface SettlementLayout {
  moonRadius: number;
  coverage: number;
  angularRadius: number;
  maxFlatRadius: number;
  domes: DomeLayout[];
  roads: RoadLayout[];
  roadLights: Float32Array;
}
