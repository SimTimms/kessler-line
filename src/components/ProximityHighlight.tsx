import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { proximityScanOnRef, proximityScanRangeRef } from '../context/ProximityScan';
import { getCollidables } from '../context/CollisionRegistry';
import { minimapShipPosition } from '../context/MinimapShipPosition';
import { SHIP_COLLISION_ID } from '../context/ShipState';

const _pos = new THREE.Vector3();

type HighlightData = {
  meshes: Array<{ mesh: THREE.Mesh; original: THREE.Material | THREE.Material[] }>;
  mat: THREE.MeshBasicMaterial;
};

function getColor(ratio: number): THREE.ColorRepresentation {
  // Matches ProximityHUD color scheme: close = magenta, far = cyan
  return ratio < 0.5 ? '#ff288c' : '#00c8ff';
}

function getOpacity(ratio: number): number {
  // Closer = more opaque
  return 0.25 + (1 - ratio) * 0.45;
}

function restoreAll(map: Map<string, HighlightData>) {
  for (const data of map.values()) {
    for (const { mesh, original } of data.meshes) mesh.material = original;
    data.mat.dispose();
  }
  map.clear();
}

export default function ProximityHighlight() {
  const highlighted = useRef(new Map<string, HighlightData>());

  useFrame(() => {
    const map = highlighted.current;

    if (!proximityScanOnRef.current) {
      if (map.size > 0) restoreAll(map);
      return;
    }

    const range = proximityScanRangeRef.current;
    const collidables = getCollidables().filter(
      (c) => c.id !== SHIP_COLLISION_ID && c.getObject3D != null,
    );
    const inRange = new Set<string>();

    for (const entry of collidables) {
      entry.getWorldPosition(_pos);
      const dist = minimapShipPosition.distanceTo(_pos);
      if (dist > range) continue;

      inRange.add(entry.id);
      const ratio = dist / range;

      if (!map.has(entry.id)) {
        const obj = entry.getObject3D!();
        if (!obj) continue;

        const mat = new THREE.MeshBasicMaterial({
          color: getColor(ratio),
          transparent: true,
          opacity: getOpacity(ratio),
          depthWrite: false,
        });

        const meshes: HighlightData['meshes'] = [];
        obj.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          meshes.push({ mesh: child, original: child.material });
          child.material = mat;
        });

        map.set(entry.id, { meshes, mat });
      } else {
        const { mat } = map.get(entry.id)!;
        mat.color.set(getColor(ratio));
        mat.opacity = getOpacity(ratio);
      }
    }

    // Restore objects that left range this frame
    for (const [id, data] of map) {
      if (!inRange.has(id)) {
        for (const { mesh, original } of data.meshes) mesh.material = original;
        data.mat.dispose();
        map.delete(id);
      }
    }
  });

  useEffect(() => {
    const map = highlighted.current;
    return () => restoreAll(map);
  }, []);

  return null;
}
