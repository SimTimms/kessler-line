import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { registerMagnetic, unregisterMagnetic } from '../../context/MagneticRegistry';
import { registerDock, unregisterDock } from '../../context/DockablePartnerStore';
import { DEFAULT_DOCK_CAPTURE_PROFILE } from '../../config/dockCaptureConfig';
import { SHIP_DOCKING_PORT_LOCAL } from '../../config/shipConfig';
import { cloneGltfScene } from '../../utils/cloneGltfScene';
import {
  PLAYER_SHIP_MODEL_URL,
  pendingRespawnCause,
  captureDerelictAtDeath,
  respawnAsNewShip,
} from '../../context/respawnAsNewShip';

const COLLISION_HALF_EXTENTS = new THREE.Vector3(7, 3, 17);
const DOCK_BAY_DIMENSIONS = new THREE.Vector3(2, 2, 1);
/** Impulse-to-velocity scale — lower than containers (0.8) because hulls are heavier. */
const DERELICT_IMPULSE_SCALE = 0.3;
/** Exponential velocity damping per second (0 = instant stop, 1 = no damping). */
const DERELICT_VELOCITY_DAMPING = 0.5;

interface LiveWreck {
  group: THREE.Group;
  velocity: THREE.Vector3;
  collisionId: string;
  magId: string;
  dockBayColId?: string;
  dockId?: string;
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
        if (wreck.dockBayColId) unregisterCollidable(wreck.dockBayColId);
        if (wreck.dockId) unregisterDock(wreck.dockId);
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
      if (wreck.velocity.lengthSq() > 1e-6) {
        wreck.group.position.addScaledVector(wreck.velocity, delta);
        wreck.velocity.multiplyScalar(Math.pow(DERELICT_VELOCITY_DAMPING, delta));
      }
    }

    const cause = pendingRespawnCause.current;
    const host = hostRef.current;
    if (!cause || !host) return;
    pendingRespawnCause.current = null;

    const record = captureDerelictAtDeath(cause);
    const template = templateRef.current;
    if (template) {
      const mesh = cloneGltfScene(template);
      mesh.rotation.set(0, Math.PI / 2, 0);

      const group = new THREE.Group();
      group.position.copy(record.position);
      group.quaternion.copy(record.quaternion);
      group.add(mesh);
      host.add(group);

      const collisionId = `collision-${record.id}`;
      const magId = `mag-${record.id}`;
      const wreckVelocity = new THREE.Vector3();
      registerCollidable({
        id: collisionId,
        label: 'Derelict Hull',
        getWorldPosition: (target) => group.getWorldPosition(target),
        getWorldQuaternion: (target) => group.getWorldQuaternion(target),
        getWorldVelocity: (target) => target.copy(wreckVelocity),
        shape: { type: 'box', halfExtents: COLLISION_HALF_EXTENTS.clone() },
        getObject3D: () => group,
        physicalCollision: true,
        applyImpulse: (impulse) => {
          wreckVelocity.addScaledVector(impulse, DERELICT_IMPULSE_SCALE);
        },
      });
      registerMagnetic({
        id: magId,
        label: 'Derelict Hull',
        getPosition: (target) => group.getWorldPosition(target),
      });

      let dockBayColId: string | undefined;
      let dockId: string | undefined;

      if (record.isDockable) {
        // Dock port parented to mesh — position in ship-local space directly.
        const dockPortGroup = new THREE.Group();
        dockPortGroup.position.set(
          SHIP_DOCKING_PORT_LOCAL[0],
          SHIP_DOCKING_PORT_LOCAL[1],
          SHIP_DOCKING_PORT_LOCAL[2],
        );
        dockPortGroup.rotation.set(0, Math.PI, 0);
        mesh.add(dockPortGroup);

        // Capture mesh (white translucent box)
        const captureGeo = new THREE.BoxGeometry(
          DOCK_BAY_DIMENSIONS.x,
          DOCK_BAY_DIMENSIONS.y,
          DOCK_BAY_DIMENSIONS.z,
        );
        const captureMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          emissive: new THREE.Color(0xffffff),
          transparent: true,
          opacity: 1,
        });
        dockPortGroup.add(new THREE.Mesh(captureGeo, captureMat));

        // Red guide sphere (port)
        const redGeo = new THREE.SphereGeometry(0.2, 10, 10);
        const redMat = new THREE.MeshStandardMaterial({
          color: 0xff0000,
          side: THREE.DoubleSide,
          emissive: new THREE.Color(0xff0000),
          transparent: true,
          opacity: 1,
        });
        const redSphere = new THREE.Mesh(redGeo, redMat);
        redSphere.position.set(-1, 0, 0);
        dockPortGroup.add(redSphere);

        // Green guide sphere (starboard)
        const greenGeo = new THREE.SphereGeometry(0.2, 10, 10);
        const greenMat = new THREE.MeshStandardMaterial({
          color: 0x00ff00,
          side: THREE.DoubleSide,
          emissive: new THREE.Color(0x00ff00),
          transparent: true,
          opacity: 1,
        });
        const greenSphere = new THREE.Mesh(greenGeo, greenMat);
        greenSphere.position.set(1, 0, 0);
        dockPortGroup.add(greenSphere);

        // Register docking bay collidable
        dockBayColId = `docking-bay-${record.id}`;
        registerCollidable({
          id: dockBayColId,
          stationId: record.id,
          getWorldPosition: (target) => dockPortGroup.getWorldPosition(target),
          getWorldQuaternion: (target) => dockPortGroup.getWorldQuaternion(target),
          getWorldVelocity: (target) => target.set(0, 0, 0),
          shape: {
            type: 'box',
            halfExtents: new THREE.Vector3(
              DOCK_BAY_DIMENSIONS.x * 0.5,
              DOCK_BAY_DIMENSIONS.y * 0.5,
              DOCK_BAY_DIMENSIONS.z * 0.5,
            ),
          },
          physicalCollision: false,
          dockingProfile: DEFAULT_DOCK_CAPTURE_PROFILE,
          getObject3D: () => dockPortGroup,
        });

        // Register dock config for transfer panel
        dockId = record.id;
        registerDock({
          id: dockId,
          label: 'Derelict Ship',
          backgroundImage: '/station.jpg',
          fuel: { amount: record.fuel, capacity: 100 },
          o2: { amount: record.o2, capacity: 100 },
          power: { amount: record.power, capacity: 100 },
          inventory: {
            label: 'Salvage',
            slots: record.cargo.map((c) => ({
              itemId: c.itemId,
              quantity: c.quantity,
            })),
          },
        });
      }

      wrecksRef.current.push({
        group,
        velocity: wreckVelocity,
        collisionId,
        magId,
        dockBayColId,
        dockId,
      });
    }

    respawnAsNewShip(cause);
  }, -0.5);

  return <group ref={hostRef} />;
}

useGLTF.preload(PLAYER_SHIP_MODEL_URL);
