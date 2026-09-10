import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getPhysicals } from '../../context/PhysicalRegistry';

const GRAVITATIONAL_CONSTANT = 10000;
const SOFTENING = 500;

export default function BodyPhysics() {
  const snapshotPositions = useRef(new Map<string, THREE.Vector3>());
  useFrame((_, delta) => {
    const physicals = getPhysicals();

    //1. copy positions and velocity
    physicals.forEach((physical) => {
      const existingPos = snapshotPositions.current.get(physical.id);
      if (existingPos) {
        existingPos.copy(physical.position);
      } else {
        snapshotPositions.current.set(physical.id, physical.position.clone());
      }
    });
    //2. get distance to other bodies
    physicals.forEach((physical) => {
      const snapPos = snapshotPositions.current.get(physical.id)!;
      physicals.forEach((otherPhysical) => {
        if (physical.id === otherPhysical.id) return;
        const snapOtherPos = snapshotPositions.current.get(otherPhysical.id)!;
        const distance = Math.sqrt(
          (snapPos.x - snapOtherPos.x) ** 2 +
            (snapPos.y - snapOtherPos.y) ** 2 +
            (snapPos.z - snapOtherPos.z) ** 2
        );
        const gravityPullDirection = new THREE.Vector3(
          (snapOtherPos.x - snapPos.x) / distance,
          (snapOtherPos.y - snapPos.y) / distance,
          (snapOtherPos.z - snapPos.z) / distance
        );

        const gravityPullForce =
          (GRAVITATIONAL_CONSTANT * physical.mass * otherPhysical.mass) / (distance ** 2 + SOFTENING ** 2);

        const acceleration = gravityPullForce / physical.mass;

        physical.velocity.addScaledVector(gravityPullDirection, acceleration * delta);
      });
      physical.position.addScaledVector(physical.velocity, delta);
    });
  });
  return null;
}
