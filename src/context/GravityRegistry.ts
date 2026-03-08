import * as THREE from 'three';

export type GravityBody = {
  position: THREE.Vector3; // world-space position, updated each frame
  velocity: THREE.Vector3; // world-space velocity, updated each frame (zero for static bodies)
  mu: number; // gravitational parameter (GM), world-space units²/s²
  soiRadius: number; // sphere of influence radius, world-space units
  surfaceRadius: number; // physical surface radius — gravity is not applied inside this
  orbitAltitude: number; // ideal orbit altitude above surface, world-space units
};

// Mutable registry — planet components write world positions each frame,
// useShipPhysics and VelocityIndicator read it each frame.
export const gravityBodies: Map<string, GravityBody> = new Map();
