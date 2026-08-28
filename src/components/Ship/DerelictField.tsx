import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { registerMagnetic, unregisterMagnetic } from '../../context/MagneticRegistry';
import { cloneGltfScene } from '../../utils/cloneGltfScene';
import {
  PLAYER_SHIP_MODEL_URL,
  pendingRespawnCause,
  captureDerelictAtDeath,
  respawnAsNewShip,
} from '../../context/respawnAsNewShip';

const COLLISION_HALF_EXTENTS = new THREE.Vector3(7, 3, 17);
const _tumbleQ = new THREE.Quaternion();

function darkenMaterials(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (let i = 0; i < materials.length; i++) {
      const mat = materials[i];
      if (!(mat instanceof THREE.MeshStandardMaterial)) continue;
      const clone = mat.clone();
      clone.color.multiplyScalar(0.3);
      clone.emissive.set(0, 0, 0);
      clone.emissiveIntensity = 0;
      clone.metalness = Math.max(clone.metalness, 0.7);
      clone.roughness = Math.max(clone.roughness, 0.8);
      if (Array.isArray(mesh.material)) {
        mesh.material[i] = clone;
      } else {
        mesh.material = clone;
      }
    }
  });
}

interface LiveWreck {
  group: THREE.Group;
  axis: THREE.Vector3;
  speed: number;
  collisionId: string;
  magId: string;
}

/**
 * Host for wrecks plus Canvas-side death handling.
 * Spawns derelicts as plain THREE objects and runs respawn inside useFrame so
 * neither path mounts React children or setStates from the DOM overlay.
 */
export default function DerelictField({
  modelUrl = PLAYER_SHIP_MODEL_URL,
}: {
  modelUrl?: string;
}) {
  const hostRef = useRef<THREE.Group>(null);
  const wrecksRef = useRef<LiveWreck[]>([]);
  const templateRef = useRef<THREE.Object3D | null>(null);
  const gltf = useGLTF(modelUrl) as unknown as { scene: THREE.Group };

  useEffect(() => {
    templateRef.current = gltf.scene;
  }, [gltf.scene]);

  useEffect(() => {
    const wrecks = wrecksRef.current;
    return () => {
      for (const wreck of wrecks) {
        unregisterCollidable(wreck.collisionId);
        unregisterMagnetic(wreck.magId);
      }
      wrecks.length = 0;
    };
  }, []);

  useEffect(() => {
    const queue = (cause: string) => {
      if (pendingRespawnCause.current) return;
      pendingRespawnCause.current = cause;
    };
    const onO2 = () => queue('o2');
    const onHull = (e: Event) => {
      const detail = (e as CustomEvent<{ cause?: string }>).detail;
      queue(detail?.cause ?? 'hull');
    };
    window.addEventListener('O2Depleted', onO2);
    window.addEventListener('ShipDestroyed', onHull);
    return () => {
      window.removeEventListener('O2Depleted', onO2);
      window.removeEventListener('ShipDestroyed', onHull);
    };
  }, []);

  useFrame((_, delta) => {
    for (const wreck of wrecksRef.current) {
      _tumbleQ.setFromAxisAngle(wreck.axis, wreck.speed * delta);
      wreck.group.quaternion.premultiply(_tumbleQ);
    }

    const cause = pendingRespawnCause.current;
    const host = hostRef.current;
    if (!cause || !host) return;
    pendingRespawnCause.current = null;

    const record = captureDerelictAtDeath(cause);
    const template = templateRef.current;
    if (template) {
      const mesh = cloneGltfScene(template);
      darkenMaterials(mesh);
      mesh.rotation.set(0, Math.PI / 2, 0);

      const group = new THREE.Group();
      group.position.copy(record.position);
      group.quaternion.copy(record.quaternion);
      group.add(mesh);
      host.add(group);

      const collisionId = `collision-${record.id}`;
      const magId = `mag-${record.id}`;
      registerCollidable({
        id: collisionId,
        label: 'Derelict Hull',
        getWorldPosition: (target) => group.getWorldPosition(target),
        getWorldQuaternion: (target) => group.getWorldQuaternion(target),
        shape: { type: 'box', halfExtents: COLLISION_HALF_EXTENTS.clone() },
        getObject3D: () => group,
        physicalCollision: true,
      });
      registerMagnetic({
        id: magId,
        label: 'Derelict Hull',
        getPosition: (target) => group.getWorldPosition(target),
      });

      wrecksRef.current.push({
        group,
        axis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize(),
        speed: 0.02 + Math.random() * 0.04,
        collisionId,
        magId,
      });
    }

    respawnAsNewShip(cause);
  }, -0.5);

  return <group ref={hostRef} />;
}

useGLTF.preload(PLAYER_SHIP_MODEL_URL);
