import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { RootState } from '@react-three/fiber';

interface ChildSummary {
  name: string;
  meshes: number;
  lines: number;
  points: number;
  total: number;
}

function countDrawables(obj: THREE.Object3D): { meshes: number; lines: number; points: number } {
  let meshes = 0,
    lines = 0,
    points = 0;
  obj.traverse((child) => {
    if (!child.visible) return;
    if (child instanceof THREE.Mesh) meshes++;
    else if (child instanceof THREE.Line) lines++;
    else if (child instanceof THREE.Points) points++;
  });
  return { meshes, lines, points };
}

function dumpBreakdown(state: RootState) {
  const { scene } = state;
  const rows: ChildSummary[] = [];

  for (const child of scene.children) {
    const { meshes, lines, points } = countDrawables(child);
    const total = meshes + lines + points;
    if (total === 0) continue;

    let name = child.name || '';
    if (!name) {
      const fiber = (child as unknown as Record<string, unknown>).__r3f as
        | { type?: string | { name?: string } }
        | undefined;
      if (fiber?.type) {
        name = typeof fiber.type === 'string' ? fiber.type : (fiber.type.name ?? '');
      }
    }
    if (!name) {
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

          const img = tex.image as HTMLImageElement | null | undefined;
          const src = img?.src ?? img?.currentSrc ?? '';
          let textureName: string;
          if (src) {
            textureName = src.split('/').pop() ?? src;
          } else if (tex.name) {
            textureName = `[glb] ${tex.name}`;
          } else {
            textureName = `[glb:${tex.uuid.slice(0, 8)}]`;
          }

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

  console.group(
    `%c[SceneDrawCallBreakdown] ${grand} drawables · ${subCount} useFrame subs · ${texMap.size} textures`,
    'font-weight:bold;color:#4af'
  );
  console.table(
    rows.map((r) => ({
      name: r.name,
      meshes: r.meshes || undefined,
      lines: r.lines || undefined,
      points: r.points || undefined,
      TOTAL: r.total,
    }))
  );
  console.log('Note: InstancedMesh counts as 1 drawable regardless of instance count.');
  console.log('Note: visible=false children are excluded.');

  if (texMap.size > 0) {
    console.groupCollapsed(`%cTextures (${texMap.size})`, 'color:#fa4');
    console.table([...texMap.values()].sort((a, b) => a.texture.localeCompare(b.texture)));
    console.groupEnd();
  }

  console.groupEnd();
}

/**
 * Dev tool: press B (or click DUMP SCENE) to log a mesh-count breakdown.
 * Must sit inside <Canvas>. Open the browser DevTools console to see the table.
 */
export default function SceneDrawCallBreakdown() {
  const state = useThree();

  useEffect(() => {
    const dump = () => dumpBreakdown(state);

    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== 'KeyB' || e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (e.target as HTMLElement | null)?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      dump();
    }

    window.addEventListener('keydown', onKeyDown, true);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'DUMP SCENE (B)';
    Object.assign(btn.style, {
      position: 'fixed',
      top: '140px',
      right: '10px',
      zIndex: '10000',
      padding: '6px 10px',
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#b8e0ff',
      background: 'rgba(4,10,20,0.9)',
      border: '1px solid rgba(100,200,255,0.35)',
      borderRadius: '4px',
      cursor: 'pointer',
    });
    btn.addEventListener('click', dump);
    document.body.appendChild(btn);

    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      btn.remove();
    };
  }, [state]);

  return null;
}
