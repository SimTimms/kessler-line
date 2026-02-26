import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getCollidables } from '../context/CollisionRegistry';

// Colours for debug spheres
const SHIP_COLOR = 0x00ff00;      // green  = player
const OBSTACLE_COLOR = 0xff4400;  // orange = obstacle

export default function CollisionDebug() {
  const groupRef = useRef<THREE.Group>(null!);
  // Persistent map of collidable id → wireframe mesh so we create geometry once.
  const meshMap = useRef(new Map<string, THREE.Mesh>());
  const _pos = useRef(new THREE.Vector3());
  const _quat = useRef(new THREE.Quaternion());

  useFrame(() => {
    if (!groupRef.current) return;

    const collidables = getCollidables();
    const activeIds = new Set(collidables.map((c) => c.id));

    // Remove meshes for collidables that have unregistered
    for (const [id, mesh] of meshMap.current) {
      if (!activeIds.has(id)) {
        groupRef.current.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        meshMap.current.delete(id);
      }
    }

    // Add meshes for newly registered collidables, update transforms for all
    for (const c of collidables) {
      if (!meshMap.current.has(c.id)) {
        const isShip = c.id === 'spaceship';
        const shape = c.shape;
        let geo: THREE.BufferGeometry;
        if (shape.type === 'sphere') {
          geo = new THREE.SphereGeometry(shape.radius, 16, 8);
        } else if (shape.type === 'box') {
          geo = new THREE.BoxGeometry(
            shape.halfExtents.x * 2,
            shape.halfExtents.y * 2,
            shape.halfExtents.z * 2,
          );
        } else {
          // capsule
          geo = new THREE.CapsuleGeometry(shape.radius, shape.height, 8, 16);
        }
        const mat = new THREE.MeshBasicMaterial({
          color: isShip ? SHIP_COLOR : OBSTACLE_COLOR,
          wireframe: true,
          transparent: true,
          opacity: 0.4,
        });
        const mesh = new THREE.Mesh(geo, mat);
        groupRef.current.add(mesh);
        meshMap.current.set(c.id, mesh);
      }

      const mesh = meshMap.current.get(c.id)!;
      c.getWorldPosition(_pos.current);
      mesh.position.copy(_pos.current);
      if (c.getWorldQuaternion) {
        c.getWorldQuaternion(_quat.current);
        mesh.quaternion.copy(_quat.current);
      }
    }
  });

  return <group ref={groupRef} />;
}
