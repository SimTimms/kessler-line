import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DEBUG_SHOW_COLLIDABLES } from '../../config/debugConfig';
import { getCollidables, type CollidableEntry, type ColliderShape } from '../../context/CollisionRegistry';
import { floatingOriginActiveRef } from '../../context/FloatingOrigin';
import { SHIP_COLLISION_ID } from '../../context/ShipState';
import { SHIP_BOX_HALF_EXTENTS, SHIP_COLLISION_SAMPLES } from '../../config/shipConfig';

const SHIP_COLOR = 0x00ff00;
const SHIP_SAMPLE_COLOR = 0x88ff88;
const DOCKING_BAY_COLOR = 0x00ffff;
const SCANNER_COLOR = 0xffff00;
const PLANET_SURFACE_COLOR = 0xff8800;
const OBSTACLE_COLOR = 0xff4400;
const VELOCITY_ARROW_COLOR = 0xff00ff;
/** World-units per m/s for velocity arrow length. */
const VELOCITY_ARROW_SCALE = 0.25;
const MAX_VELOCITY_ARROW_LENGTH = 80;
const MIN_VELOCITY_ARROW_SPEED = 0.5;

export const EVENT_SET_COLLISION_DEBUG_VISIBLE = 'SetCollisionDebugVisible';

function shouldShowVelocityArrow(c: {
  id: string;
  planetSurfaceImpact?: boolean;
  getWorldVelocity?: () => THREE.Vector3;
  physicalCollision?: boolean;
}): boolean {
  if (!c.getWorldVelocity || c.physicalCollision === false) return false;
  if (c.planetSurfaceImpact || c.id.startsWith('planet-surface-')) return false;
  return true;
}

function collidableColor(c: {
  id: string;
  shape: { type: string };
  physicalCollision?: boolean;
  planetSurfaceImpact?: boolean;
}): number {
  if (c.id === SHIP_COLLISION_ID) return SHIP_COLOR;
  if (c.id.startsWith('docking-bay-')) return DOCKING_BAY_COLOR;
  if (c.planetSurfaceImpact) return PLANET_SURFACE_COLOR;
  if (c.physicalCollision === false) return SCANNER_COLOR;
  return OBSTACLE_COLOR;
}

function collidableOpacity(c: {
  physicalCollision?: boolean;
  planetSurfaceImpact?: boolean;
}): number {
  if (c.physicalCollision === false) return 0.2;
  if (c.planetSurfaceImpact) return 0.12;
  return 0.75;
}

function createShapeGeometry(shape: ColliderShape): THREE.BufferGeometry {
  if (shape.type === 'sphere') {
    return new THREE.SphereGeometry(shape.radius, 16, 8);
  }
  if (shape.type === 'box') {
    return new THREE.BoxGeometry(
      shape.halfExtents.x * 2,
      shape.halfExtents.y * 2,
      shape.halfExtents.z * 2
    );
  }
  return new THREE.CapsuleGeometry(shape.radius, shape.height, 8, 16);
}

function createWireframeMesh(shape: ColliderShape, color: number, opacity: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    createShapeGeometry(shape),
    new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
      transparent: true,
      opacity,
      depthTest: false,
    })
  );
  mesh.renderOrder = 999;
  return mesh;
}

function disposeMesh(mesh: THREE.Mesh) {
  mesh.geometry.dispose();
  (mesh.material as THREE.Material).dispose();
}

function disposeArrow(arrow: THREE.ArrowHelper) {
  arrow.line.geometry.dispose();
  (arrow.line.material as THREE.Material).dispose();
  arrow.cone.geometry.dispose();
  (arrow.cone.material as THREE.Material).dispose();
}

function clearMeshes(group: THREE.Group, meshMap: Map<string, THREE.Mesh>) {
  for (const mesh of meshMap.values()) {
    group.remove(mesh);
    disposeMesh(mesh);
  }
  meshMap.clear();
}

function clearArrows(group: THREE.Group, arrowMap: Map<string, THREE.ArrowHelper>) {
  for (const arrow of arrowMap.values()) {
    group.remove(arrow);
    disposeArrow(arrow);
  }
  arrowMap.clear();
}

function detachShipDebug(shipAttach: THREE.Group | null, shipDebugParent: THREE.Object3D | null) {
  if (shipAttach && shipDebugParent) {
    shipDebugParent.remove(shipAttach);
  }
}

interface CollisionDebugProps {
  visible?: boolean;
  includeIds?: string[];
  includeIdPrefixes?: string[];
  /** Parent wireframes on each collidable's Object3D instead of a moving scene-root group. */
  attachToObjects?: boolean;
}

export default function CollisionDebug({
  visible: visibleProp,
  includeIds,
  includeIdPrefixes,
  attachToObjects = false,
}: CollisionDebugProps = {}) {
  const [eventVisible, setEventVisible] = useState(DEBUG_SHOW_COLLIDABLES);
  const visible = visibleProp ?? eventVisible;
  const groupRef = useRef<THREE.Group>(null!);
  const meshMap = useRef(new Map<string, THREE.Mesh>());
  const arrowMap = useRef(new Map<string, THREE.ArrowHelper>());
  const objectAttachMap = useRef(new Map<string, THREE.Mesh>());
  const shipAttachRef = useRef<THREE.Group | null>(null);
  const shipDebugParentRef = useRef<THREE.Object3D | null>(null);
  const _pos = useRef(new THREE.Vector3());
  const _quat = useRef(new THREE.Quaternion());
  const _velocity = useRef(new THREE.Vector3());
  const _arrowDir = useRef(new THREE.Vector3());
  const _origin = useRef(new THREE.Vector3());
  const _relPos = useRef(new THREE.Vector3());

  const filterCollidables = useCallback(
    (entries: CollidableEntry[]) =>
      entries.filter((c) => {
        if (!includeIds && !includeIdPrefixes) return true;
        if (includeIds?.includes(c.id)) return true;
        if (includeIdPrefixes?.some((prefix) => c.id.startsWith(prefix))) return true;
        return false;
      }),
    [includeIds, includeIdPrefixes]
  );

  const clearObjectAttaches = useCallback(() => {
    for (const mesh of objectAttachMap.current.values()) {
      mesh.parent?.remove(mesh);
      disposeMesh(mesh);
    }
    objectAttachMap.current.clear();
  }, []);

  const clearAllDebug = useCallback(() => {
    const group = groupRef.current;
    if (group) {
      clearMeshes(group, meshMap.current);
      clearArrows(group, arrowMap.current);
      group.position.set(0, 0, 0);
    }
    clearObjectAttaches();
    if (shipAttachRef.current) {
      while (shipAttachRef.current.children.length > 0) {
        const child = shipAttachRef.current.children[0] as THREE.Mesh;
        shipAttachRef.current.remove(child);
        disposeMesh(child);
      }
      detachShipDebug(shipAttachRef.current, shipDebugParentRef.current);
      shipAttachRef.current = null;
      shipDebugParentRef.current = null;
    }
  }, [clearObjectAttaches]);

  const ensureShipAttachedDebug = (shipObject: THREE.Object3D) => {
    if (shipDebugParentRef.current === shipObject && shipAttachRef.current) return;

    detachShipDebug(shipAttachRef.current, shipDebugParentRef.current);

    const attach = new THREE.Group();
    attach.name = 'collision-debug:ship-local';

    const hullMesh = createWireframeMesh(
      {
        type: 'box',
        halfExtents: new THREE.Vector3(...SHIP_BOX_HALF_EXTENTS),
      },
      SHIP_COLOR,
      0.55
    );
    hullMesh.name = `collision-debug:${SHIP_COLLISION_ID}`;
    hullMesh.renderOrder = 1001;
    attach.add(hullMesh);

    for (let i = 0; i < SHIP_COLLISION_SAMPLES.length; i++) {
      const sample = SHIP_COLLISION_SAMPLES[i]!;
      const sampleMesh = createWireframeMesh(
        { type: 'sphere', radius: sample.radius },
        SHIP_SAMPLE_COLOR,
        0.7
      );
      sampleMesh.name = `${SHIP_COLLISION_ID}:sample:${i}`;
      sampleMesh.position.set(sample.local[0], sample.local[1], sample.local[2]);
      sampleMesh.renderOrder = 1002;
      attach.add(sampleMesh);
    }

    shipObject.add(attach);
    shipAttachRef.current = attach;
    shipDebugParentRef.current = shipObject;
  };

  useEffect(() => {
    const onSetVisible = (event: Event) => {
      const next = (event as CustomEvent<{ visible?: boolean }>).detail?.visible;
      if (typeof next === 'boolean') setEventVisible(next);
    };
    window.addEventListener(EVENT_SET_COLLISION_DEBUG_VISIBLE, onSetVisible);
    return () => {
      window.removeEventListener(EVENT_SET_COLLISION_DEBUG_VISIBLE, onSetVisible);
      clearAllDebug();
    };
  }, [clearAllDebug]);

  useEffect(() => {
    if (!visible) clearAllDebug();
  }, [visible, clearAllDebug]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group || !visible) return;

    const collidables = filterCollidables(getCollidables());
    const activeIds = new Set(collidables.map((c) => c.id));
    const ship = collidables.find((c) => c.id === SHIP_COLLISION_ID);

    if (attachToObjects) {
      group.position.set(0, 0, 0);

      for (const [id, mesh] of objectAttachMap.current) {
        if (!activeIds.has(id)) {
          mesh.parent?.remove(mesh);
          disposeMesh(mesh);
          objectAttachMap.current.delete(id);
        }
      }

      for (const c of collidables) {
        if (c.id === SHIP_COLLISION_ID) continue;
        const parent = c.getObject3D?.();
        if (!parent) continue;
        if (!objectAttachMap.current.has(c.id)) {
          const mesh = createWireframeMesh(c.shape, collidableColor(c), collidableOpacity(c));
          mesh.name = `collision-debug:${c.id}`;
          parent.add(mesh);
          objectAttachMap.current.set(c.id, mesh);
        } else {
          const mesh = objectAttachMap.current.get(c.id)!;
          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.color.setHex(collidableColor(c));
          mat.opacity = collidableOpacity(c);
        }
      }
    } else {
      if (ship) {
        ship.getWorldPosition(_origin.current);
        const shipObject = ship.getObject3D?.() ?? null;
        if (shipObject) ensureShipAttachedDebug(shipObject);
      } else {
        _origin.current.set(0, 0, 0);
        if (shipAttachRef.current) {
          while (shipAttachRef.current.children.length > 0) {
            const child = shipAttachRef.current.children[0] as THREE.Mesh;
            shipAttachRef.current.remove(child);
            disposeMesh(child);
          }
          detachShipDebug(shipAttachRef.current, shipDebugParentRef.current);
          shipAttachRef.current = null;
          shipDebugParentRef.current = null;
        }
      }

      if (!floatingOriginActiveRef.current) {
        group.position.copy(_origin.current);
      } else {
        group.position.set(0, 0, 0);
      }
    }

    for (const [id, mesh] of meshMap.current) {
      const attached = objectAttachMap.current.has(id);
      if (!activeIds.has(id) || id === SHIP_COLLISION_ID || attached) {
        group.remove(mesh);
        disposeMesh(mesh);
        meshMap.current.delete(id);
      }
    }

    for (const [id, arrow] of arrowMap.current) {
      if (!activeIds.has(id) || id === SHIP_COLLISION_ID) {
        group.remove(arrow);
        disposeArrow(arrow);
        arrowMap.current.delete(id);
      }
    }

    for (const c of collidables) {
      if (c.id === SHIP_COLLISION_ID || objectAttachMap.current.has(c.id)) continue;

      if (!meshMap.current.has(c.id)) {
        const mesh = createWireframeMesh(c.shape, collidableColor(c), collidableOpacity(c));
        mesh.name = `collision-debug:${c.id}`;
        group.add(mesh);
        meshMap.current.set(c.id, mesh);
      }

      const mesh = meshMap.current.get(c.id)!;
      c.getWorldPosition(_pos.current);
      if (attachToObjects || floatingOriginActiveRef.current) {
        mesh.position.copy(_pos.current);
      } else {
        _relPos.current.copy(_pos.current).sub(_origin.current);
        mesh.position.copy(_relPos.current);
      }
      if (c.getWorldQuaternion) {
        c.getWorldQuaternion(_quat.current);
        mesh.quaternion.copy(_quat.current);
      } else {
        mesh.quaternion.identity();
      }
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.setHex(collidableColor(c));
      mat.opacity = collidableOpacity(c);

      if (!attachToObjects && shouldShowVelocityArrow(c)) {
        c.getWorldVelocity!(_velocity.current);
        const speed = _velocity.current.length();
        if (speed >= MIN_VELOCITY_ARROW_SPEED) {
          if (!arrowMap.current.has(c.id)) {
            const arrow = new THREE.ArrowHelper(
              new THREE.Vector3(0, 1, 0),
              new THREE.Vector3(),
              1,
              VELOCITY_ARROW_COLOR,
              0.15,
              0.08
            );
            arrow.renderOrder = 1000;
            group.add(arrow);
            arrowMap.current.set(c.id, arrow);
          }
          const arrow = arrowMap.current.get(c.id)!;
          _arrowDir.current.copy(_velocity.current).normalize();
          if (floatingOriginActiveRef.current) {
            arrow.position.copy(_pos.current);
          } else {
            arrow.position.copy(_relPos.current);
          }
          arrow.setDirection(_arrowDir.current);
          arrow.setLength(
            Math.min(speed * VELOCITY_ARROW_SCALE, MAX_VELOCITY_ARROW_LENGTH),
            0.15,
            0.08
          );
          arrow.visible = true;
        } else if (arrowMap.current.has(c.id)) {
          arrowMap.current.get(c.id)!.visible = false;
        }
      } else if (arrowMap.current.has(c.id)) {
        arrowMap.current.get(c.id)!.visible = false;
      }
    }
  });

  return <group ref={groupRef} visible={visible} />;
};
