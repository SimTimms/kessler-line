import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { proximityScanOnRef, proximityScanRangeRef } from '../../context/ProximityScan';
import { getCollidables, type CollidableEntry } from '../../context/CollisionRegistry';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { SHIP_COLLISION_ID } from '../../context/ShipState';

// Module-level scratch — component is a singleton
const _pos = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

// Cache EdgesGeometry per source geometry to avoid duplicate work for shared GLB meshes
const edgesCache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();

function getEdgesGeo(srcGeo: THREE.BufferGeometry): THREE.BufferGeometry {
  if (edgesCache.has(srcGeo)) return edgesCache.get(srcGeo)!;
  const edges = new THREE.EdgesGeometry(srcGeo, 15); // 15° crease threshold
  edgesCache.set(srcGeo, edges);
  return edges;
}

function makeMat(color: THREE.ColorRepresentation): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
}

// ─── Two wireframe strategies ─────────────────────────────────────────────────

/** Actual-geometry wireframe: one LineSegments per child mesh of the object3D */
type Object3DWireframe = {
  kind: 'object3d';
  pairs: Array<{ lines: THREE.LineSegments; source: THREE.Mesh }>;
};

/** Shape-based fallback wireframe: single LineSegments positioned from collision entry */
type ShapeWireframe = {
  kind: 'shape';
  lines: THREE.LineSegments;
};

type WireframeData = Object3DWireframe | ShapeWireframe;

function buildObject3DWireframe(obj: THREE.Object3D): Object3DWireframe {
  const pairs: Object3DWireframe['pairs'] = [];
  obj.updateWorldMatrix(true, true);

  obj.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.geometry) return;
    const lines = new THREE.LineSegments(getEdgesGeo(child.geometry), makeMat('#44ffcc'));
    pairs.push({ lines, source: child });
  });

  return { kind: 'object3d', pairs };
}

function buildShapeWireframe(entry: CollidableEntry): ShapeWireframe {
  const { shape, id } = entry;
  let src: THREE.BufferGeometry;

  if (shape.type === 'sphere') {
    // Use the right polyhedron for known asteroid types, sphere otherwise
    if (id.startsWith('asteroid-0-')) src = new THREE.IcosahedronGeometry(shape.radius, 1);
    else if (id.startsWith('asteroid-1-')) src = new THREE.OctahedronGeometry(shape.radius);
    else if (id.startsWith('asteroid-2-')) src = new THREE.DodecahedronGeometry(shape.radius);
    else src = new THREE.SphereGeometry(shape.radius, 10, 7);
  } else if (shape.type === 'box') {
    const { halfExtents: h } = shape;
    src = new THREE.BoxGeometry(h.x * 2, h.y * 2, h.z * 2);
  } else {
    src = new THREE.CapsuleGeometry(shape.radius, shape.height, 4, 8);
  }

  const geo = new THREE.EdgesGeometry(src);
  src.dispose();
  return { kind: 'shape', lines: new THREE.LineSegments(geo, makeMat('#44ffcc')) };
}

function applyStyle(mat: THREE.LineBasicMaterial, ratio: number) {
  const color: THREE.ColorRepresentation =
    ratio < 0.25
      ? 'rgba(255,40,140,0.85)'
      : ratio < 0.5
        ? 'rgba(255,40,140,0.85)'
        : ratio < 0.75
          ? 'rgba(0,200,255,0.8)'
          : 'rgba(0,200,255,0.8)';
  mat.color.set(color);
  mat.opacity = 0.2 + (1 - ratio) * 0.55;
}

function setVisible(data: WireframeData, visible: boolean) {
  if (data.kind === 'object3d') {
    for (const { lines } of data.pairs) lines.visible = visible;
  } else {
    data.lines.visible = visible;
  }
}

function addToGroup(data: WireframeData, group: THREE.Group) {
  if (data.kind === 'object3d') {
    for (const { lines } of data.pairs) group.add(lines);
  } else {
    group.add(data.lines);
  }
}

function disposeData(data: WireframeData) {
  if (data.kind === 'object3d') {
    for (const { lines } of data.pairs) {
      // Don't dispose edges geo — it's shared via edgesCache
      (lines.material as THREE.LineBasicMaterial).dispose();
    }
  } else {
    data.lines.geometry.dispose();
    (data.lines.material as THREE.LineBasicMaterial).dispose();
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProximityWireframes() {
  const groupRef = useRef<THREE.Group>(null!);
  const wireframes = useRef(new Map<string, WireframeData>());

  useFrame(() => {
    if (!proximityScanOnRef.current) {
      for (const data of wireframes.current.values()) setVisible(data, false);
      return;
    }

    const range = proximityScanRangeRef.current;
    const collidables = getCollidables().filter((c) => c.id !== SHIP_COLLISION_ID);
    const visibleIds = new Set<string>();

    for (const entry of collidables) {
      entry.getWorldPosition(_pos);
      const dist = minimapShipPosition.distanceTo(_pos);

      if (dist > range) {
        const d = wireframes.current.get(entry.id);
        if (d) setVisible(d, false);
        continue;
      }

      visibleIds.add(entry.id);

      // Build wireframe on first sight
      if (!wireframes.current.has(entry.id)) {
        const obj = entry.getObject3D?.();
        let data: WireframeData;

        if (obj) {
          data = buildObject3DWireframe(obj);
        } else {
          data = buildShapeWireframe(entry);
        }

        wireframes.current.set(entry.id, data);
        addToGroup(data, groupRef.current);
      }

      const data = wireframes.current.get(entry.id)!;
      const ratio = dist / range;

      if (data.kind === 'object3d') {
        // Each LineSegments tracks its source mesh's live world transform
        for (const { lines, source } of data.pairs) {
          source.matrixWorld.decompose(_pos, _q, _s);
          lines.position.copy(_pos);
          lines.quaternion.copy(_q);
          lines.scale.copy(_s);
          lines.visible = true;
          applyStyle(lines.material as THREE.LineBasicMaterial, ratio);
        }
      } else {
        // Shape-based: position from collision entry
        entry.getWorldPosition(_pos);
        data.lines.position.copy(_pos);
        if (entry.getWorldQuaternion) {
          entry.getWorldQuaternion(_q);
          data.lines.quaternion.copy(_q);
        }
        data.lines.visible = true;
        applyStyle(data.lines.material as THREE.LineBasicMaterial, ratio);
      }
    }

    // Hide wireframes no longer in range
    for (const [id, data] of wireframes.current) {
      if (!visibleIds.has(id)) setVisible(data, false);
    }
  });

  useEffect(() => {
    return () => {
      for (const data of wireframes.current.values()) disposeData(data);
    };
  }, []);

  return <group ref={groupRef} />;
}
