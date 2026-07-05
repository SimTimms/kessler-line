import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DEBUG_SHOW_COLLIDABLES } from '../../config/debugConfig';
import { getCollidables } from '../../context/CollisionRegistry';
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

function shouldShowVelocityArrow(c: {
  id: string;
  planetSurfaceImpact?: boolean;
  getWorldVelocity?: () => THREE.Vector3;
  physicalCollision?: boolean;
}): boolean {
  if (!c.getWorldVelocity || c.physicalCollision === false) return false;
  // Planets orbit at thousands of units/s — arrows become screen-spanning lines.
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
  if (c.shape.type === 'sphere') return OBSTACLE_COLOR;
  return OBSTACLE_COLOR;
}

function collidableOpacity(c: {
  physicalCollision?: boolean;
  planetSurfaceImpact?: boolean;
}): number {
  if (c.physicalCollision === false) return 0.2;
  if (c.planetSurfaceImpact) return 0.12;
  return 0.55;
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

export default function CollisionDebug() {
  const groupRef = useRef<THREE.Group>(null!);
  const meshMap = useRef(new Map<string, THREE.Mesh>());
  const arrowMap = useRef(new Map<string, THREE.ArrowHelper>());
  const shipAttachRef = useRef<THREE.Group | null>(null);
  const shipDebugParentRef = useRef<THREE.Object3D | null>(null);
  const _pos = useRef(new THREE.Vector3());
  const _quat = useRef(new THREE.Quaternion());
  const _velocity = useRef(new THREE.Vector3());
  const _arrowDir = useRef(new THREE.Vector3());
  const _origin = useRef(new THREE.Vector3());
  const _relPos = useRef(new THREE.Vector3());

  const ensureShipAttachedDebug = (shipObject: THREE.Object3D) => {
    if (shipDebugParentRef.current === shipObject && shipAttachRef.current) return;

    detachShipDebug(shipAttachRef.current, shipDebugParentRef.current);

    const attach = new THREE.Group();
    attach.name = 'collision-debug:ship-local';

    const hullGeo = new THREE.BoxGeometry(
      SHIP_BOX_HALF_EXTENTS[0] * 2,
      SHIP_BOX_HALF_EXTENTS[1] * 2,
      SHIP_BOX_HALF_EXTENTS[2] * 2
    );
    const hullMat = new THREE.MeshBasicMaterial({
      color: SHIP_COLOR,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
      depthTest: false,
    });
    const hullMesh = new THREE.Mesh(hullGeo, hullMat);
    hullMesh.name = `collision-debug:${SHIP_COLLISION_ID}`;
    hullMesh.renderOrder = 1001;
    attach.add(hullMesh);

    for (let i = 0; i < SHIP_COLLISION_SAMPLES.length; i++) {
      const sample = SHIP_COLLISION_SAMPLES[i]!;
      const geo = new THREE.SphereGeometry(sample.radius, 10, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: SHIP_SAMPLE_COLOR,
        wireframe: true,
        transparent: true,
        opacity: 0.7,
        depthTest: false,
      });
      const sampleMesh = new THREE.Mesh(geo, mat);
      sampleMesh.name = `${SHIP_COLLISION_ID}:sample:${i}`;
      sampleMesh.position.set(sample.local[0], sample.local[1], sample.local[2]);
      sampleMesh.renderOrder = 1002;
      attach.add(sampleMesh);
    }

    shipObject.add(attach);
    shipAttachRef.current = attach;
    shipDebugParentRef.current = shipObject;
  };

  const clearShipAttachedDebug = () => {
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
  };

  // Priority 4: after FloatingOrigin (3) so debug uses render-space positions.
  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    if (!DEBUG_SHOW_COLLIDABLES) {
      if (meshMap.current.size > 0) clearMeshes(group, meshMap.current);
      if (arrowMap.current.size > 0) clearArrows(group, arrowMap.current);
      clearShipAttachedDebug();
      group.position.set(0, 0, 0);
      return;
    }

    const collidables = getCollidables();
    const activeIds = new Set(collidables.map((c) => c.id));
    const ship = collidables.find((c) => c.id === SHIP_COLLISION_ID);

    if (ship) {
      ship.getWorldPosition(_origin.current);
      const shipObject = ship.getObject3D?.() ?? null;
      if (shipObject) {
        ensureShipAttachedDebug(shipObject);
      } else {
        clearShipAttachedDebug();
      }
    } else {
      _origin.current.set(0, 0, 0);
      clearShipAttachedDebug();
    }

    // When FloatingOrigin is active, getWorldPosition already returns render-space coords
    // and the ship sits near the origin — keep overlays at scene root without extra offset.
    if (!floatingOriginActiveRef.current) {
      group.position.copy(_origin.current);
    } else {
      group.position.set(0, 0, 0);
    }

    for (const [id, mesh] of meshMap.current) {
      if (!activeIds.has(id) || id === SHIP_COLLISION_ID) {
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
      if (c.id === SHIP_COLLISION_ID) continue;

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
          color: collidableColor(c),
          wireframe: true,
          transparent: true,
          opacity: collidableOpacity(c),
          depthTest: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = `collision-debug:${c.id}`;
        mesh.renderOrder = 999;
        group.add(mesh);
        meshMap.current.set(c.id, mesh);
      }

      const mesh = meshMap.current.get(c.id)!;
      c.getWorldPosition(_pos.current);
      if (floatingOriginActiveRef.current) {
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

      if (shouldShowVelocityArrow(c)) {
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
  }, 4);

  if (!DEBUG_SHOW_COLLIDABLES) return null;

  return <group ref={groupRef} />;
};
