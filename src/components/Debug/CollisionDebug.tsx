import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DEBUG_SHOW_COLLIDABLES } from '../../config/debugConfig';
import { getCollidables } from '../../context/CollisionRegistry';
import { SHIP_COLLISION_ID } from '../../context/ShipState';

const SHIP_COLOR = 0x00ff00;
const OBSTACLE_COLOR = 0xff4400;

function disposeMesh(mesh: THREE.Mesh) {
  mesh.geometry.dispose();
  (mesh.material as THREE.Material).dispose();
}

function clearMeshes(group: THREE.Group, meshMap: Map<string, THREE.Mesh>) {
  for (const mesh of meshMap.values()) {
    group.remove(mesh);
    disposeMesh(mesh);
  }
  meshMap.clear();
}

export default function CollisionDebug() {
  const groupRef = useRef<THREE.Group>(null!);
  const meshMap = useRef(new Map<string, THREE.Mesh>());
  const _pos = useRef(new THREE.Vector3());
  const _quat = useRef(new THREE.Quaternion());

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    if (!DEBUG_SHOW_COLLIDABLES) {
      if (meshMap.current.size > 0) clearMeshes(group, meshMap.current);
      return;
    }

    const collidables = getCollidables();
    const activeIds = new Set(collidables.map((c) => c.id));

    for (const [id, mesh] of meshMap.current) {
      if (!activeIds.has(id)) {
        group.remove(mesh);
        disposeMesh(mesh);
        meshMap.current.delete(id);
      }
    }

    for (const c of collidables) {
      if (!meshMap.current.has(c.id)) {
        const shape = c.shape;
        let geo: THREE.BufferGeometry;
        if (shape.type === 'sphere') {
          geo = new THREE.SphereGeometry(shape.radius, 16, 8);
        } else if (shape.type === 'box') {
          geo = new THREE.BoxGeometry(
            shape.halfExtents.x * 2,
            shape.halfExtents.y * 2,
            shape.halfExtents.z * 2
          );
        } else {
          geo = new THREE.CapsuleGeometry(shape.radius, shape.height, 8, 16);
        }

        const mat = new THREE.MeshBasicMaterial({
          color: c.id === SHIP_COLLISION_ID ? SHIP_COLOR : OBSTACLE_COLOR,
          wireframe: true,
          transparent: true,
          opacity: 0.55,
          depthTest: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.renderOrder = 999;
        group.add(mesh);
        meshMap.current.set(c.id, mesh);
      }

      const mesh = meshMap.current.get(c.id)!;
      c.getWorldPosition(_pos.current);
      mesh.position.copy(_pos.current);
      if (c.getWorldQuaternion) {
        c.getWorldQuaternion(_quat.current);
        mesh.quaternion.copy(_quat.current);
      } else {
        mesh.quaternion.identity();
      }
    }
  });

  if (!DEBUG_SHOW_COLLIDABLES) return null;

  return <group ref={groupRef} />;
}
