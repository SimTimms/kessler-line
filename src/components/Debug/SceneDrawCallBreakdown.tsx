import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Dev tool: press B to log a per-top-level-child mesh count breakdown to the console.
 * Walks the scene graph one level deep and counts visible meshes/lines/points
 * under each direct child of the scene root.
 *
 * Mount alongside RenderInfoPanel (inside <Canvas>).
 * Remove before shipping.
 */

interface ChildSummary {
  name: string;
  meshes: number;
  lines: number;
  points: number;
  total: number;
}

function countDrawables(obj: THREE.Object3D): { meshes: number; lines: number; points: number } {
  let meshes = 0, lines = 0, points = 0;
  obj.traverse((child) => {
    if (!child.visible) return;
    if (child instanceof THREE.Mesh) meshes++;
    else if (child instanceof THREE.Line) lines++;
    else if (child instanceof THREE.Points) points++;
  });
  return { meshes, lines, points };
}

export default function SceneDrawCallBreakdown() {
  const state = useThree();
  const { scene } = state;
  const pendingRef = useRef(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'b' || e.key === 'B') pendingRef.current = true;
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useFrame(() => {
    if (!pendingRef.current) return;
    pendingRef.current = false;

    const rows: ChildSummary[] = [];

    for (const child of scene.children) {
      const { meshes, lines, points } = countDrawables(child);
      const total = meshes + lines + points;
      if (total === 0) continue;

      // Try to get a useful name: explicit name → R3F fiber type → GLB asset name
      // from first named descendant → fall back to Three.js type.
      let name = child.name || '';
      if (!name) {
        // R3F attaches fiber info under __r3f in v8+
        const fiber = (child as unknown as Record<string, unknown>).__r3f as
          | { type?: string | { name?: string } }
          | undefined;
        if (fiber?.type) {
          name = typeof fiber.type === 'string' ? fiber.type : (fiber.type.name ?? '');
        }
      }
      if (!name) {
        // Walk descendants for the first named GLB node
        child.traverse((c) => {
          if (!name && c.name && c !== child) name = `~${c.name}`;
        });
      }
      name = name || child.type || '(unnamed)';

      rows.push({ name, meshes, lines, points, total });
    }

    rows.sort((a, b) => b.total - a.total);

    const grand = rows.reduce((s, r) => s + r.total, 0);
    const subCount = state.internal.subscribers.length;

    // ── Texture enumeration ───────────────────────────────────────────────────
    const texMap = new Map<string, { slot: string; texture: string; usedBy: string }>();
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.material) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      (mats as THREE.Material[]).forEach((mat) => {
        (Object.entries(mat) as [string, unknown][]).forEach(([slot, val]) => {
          if (val && typeof val === 'object' && (val as THREE.Texture).isTexture) {
            const tex = val as THREE.Texture;
            if (texMap.has(tex.uuid)) return;

            // URL textures (HTMLImageElement) expose src directly.
            // GLB-embedded textures load as ImageBitmap — no src, but may have tex.name
            // set by GLTFLoader, or we can infer source from the mesh hierarchy.
            const img = tex.image as (HTMLImageElement | null | undefined);
            const src = img?.src ?? img?.currentSrc ?? '';
            let textureName: string;
            if (src) {
              textureName = src.split('/').pop() ?? src;
            } else if (tex.name) {
              textureName = `[glb] ${tex.name}`;
            } else {
              textureName = `[glb:${tex.uuid.slice(0, 8)}]`;
            }

            // Climb the hierarchy for a useful object label, falling back to
            // the material name (also set by GLTFLoader from the GLTF asset).
            const usedBy =
              mesh.name ||
              mesh.parent?.name ||
              mesh.parent?.parent?.name ||
              mesh.parent?.parent?.parent?.name ||
              mat.name ||
              '?';

            texMap.set(tex.uuid, { slot, texture: textureName, usedBy });
          }
        });
      });
    });

    console.group(`%c[SceneDrawCallBreakdown] ${grand} drawables · ${subCount} useFrame subs · ${texMap.size} textures`, 'font-weight:bold;color:#4af');
    console.table(rows.map(r => ({
      name:   r.name,
      meshes: r.meshes || undefined,
      lines:  r.lines  || undefined,
      points: r.points || undefined,
      TOTAL:  r.total,
    })));
    console.log('Note: InstancedMesh counts as 1 drawable regardless of instance count.');
    console.log('Note: visible=false children are excluded.');

    if (texMap.size > 0) {
      console.groupCollapsed(`%cTextures (${texMap.size})`, 'color:#fa4');
      console.table([...texMap.values()].sort((a, b) => a.texture.localeCompare(b.texture)));
      console.groupEnd();
    }

    console.groupEnd();
  });

  return null;
}
