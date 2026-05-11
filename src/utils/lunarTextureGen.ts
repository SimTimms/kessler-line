import * as THREE from 'three';

// Deterministic LCG — same seed always produces the same texture.
function makeLCG(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/**
 * Procedural lunar color/diffuse map.
 * Gray regolith base with dark mare patches, lighter highland zones,
 * crater ejecta halos, and bright ray streaks from recent impacts.
 */
export function buildLunarColorMap(width = 2048, height = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const rand = makeLCG(91234);

  // Base regolith — mid gray with slight warm tint
  ctx.fillStyle = 'rgb(142,140,132)';
  ctx.fillRect(0, 0, width, height);

  // Dark mare patches — large irregular elliptical basalt blotches
  for (let i = 0; i < 7; i++) {
    const cx = rand() * width;
    const cy = rand() * height;
    const rx = 130 + rand() * 260;
    const ry = 80 + rand() * 180;
    const darkness = 28 + rand() * 22;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rand() * Math.PI);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    const d = Math.floor(108 - darkness);
    g.addColorStop(0, `rgba(${d},${d - 2},${d - 8},0.78)`);
    g.addColorStop(0.55, `rgba(${d + 10},${d + 8},${d + 2},0.40)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Highland lighter patches
  for (let i = 0; i < 22; i++) {
    const cx = rand() * width;
    const cy = rand() * height;
    const r = 55 + rand() * 160;
    const brightness = 10 + rand() * 20;
    const b = Math.floor(160 + brightness);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(${b},${b - 2},${b - 8},0.32)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  // Crater ejecta blankets — bright halos around impact sites
  for (let i = 0; i < 18; i++) {
    const cx = rand() * width;
    const cy = rand() * height;
    const r = 18 + rand() * 55;
    const g = ctx.createRadialGradient(cx, cy, r * 0.25, cx, cy, r);
    g.addColorStop(0, `rgba(205,203,195,${0.28 + rand() * 0.22})`);
    g.addColorStop(0.5, `rgba(185,183,175,${0.15 + rand() * 0.12})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine regolith noise — subtle pixel-level variation
  for (let i = 0; i < 10000; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const v = Math.floor(rand() * 28 - 14);
    const c = 128 + v;
    ctx.fillStyle = `rgba(${c},${c - 1},${c - 5},0.10)`;
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

type CraterDef = { cx: number; cy: number; r: number; depth: number };

function genCraters(W: number, H: number, rand: () => number): CraterDef[] {
  const out: CraterDef[] = [];
  for (let i = 0; i < 6; i++)
    out.push({ cx: rand() * W, cy: rand() * H, r: 160 + rand() * 200, depth: 16 + rand() * 12 });
  for (let i = 0; i < 65; i++)
    out.push({ cx: rand() * W, cy: rand() * H, r: 42 + rand() * 88, depth: 38 + rand() * 26 });
  for (let i = 0; i < 350; i++)
    out.push({ cx: rand() * W, cy: rand() * H, r: 12 + rand() * 38, depth: 46 + rand() * 28 });
  for (let i = 0; i < 1200; i++)
    out.push({ cx: rand() * W, cy: rand() * H, r: 4 + rand() * 11, depth: 50 + rand() * 30 });
  for (let i = 0; i < 3500; i++)
    out.push({ cx: rand() * W, cy: rand() * H, r: 1 + rand() * 4, depth: 36 + rand() * 24 });
  return out;
}

/**
 * Builds both color and bump maps from a single shared crater layout so that
 * visual crater positions in the color map exactly match the bumps/depressions.
 * All features are drawn with toroidal wrapping so the texture tiles seamlessly.
 * Use this for the landscape sphere; the individual builders below remain for Moon.tsx.
 */
export function buildLunarTextures(width = 2048, height = 2048): {
  colorMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  // Returns every (dx, dy) offset needed so a circle at (cx,cy) with given
  // margin appears on all tile edges it overlaps — guarantees seamless repeat.
  const wrapOffsets = (cx: number, cy: number, margin: number): [number, number][] => {
    const offs: [number, number][] = [[0, 0]];
    const wrapX = cx - margin < 0 ? width : cx + margin > width ? -width : 0;
    const wrapY = cy - margin < 0 ? height : cy + margin > height ? -height : 0;
    if (wrapX !== 0) offs.push([wrapX, 0]);
    if (wrapY !== 0) offs.push([0, wrapY]);
    if (wrapX !== 0 && wrapY !== 0) offs.push([wrapX, wrapY]);
    return offs;
  };

  const craterRand = makeLCG(54321);

  type Swell = { cx: number; cy: number; r: number; v: number };
  const swells: Swell[] = [];
  for (let i = 0; i < 30; i++)
    swells.push({
      cx: craterRand() * width,
      cy: craterRand() * height,
      r: 180 + craterRand() * 380,
      v: Math.floor(craterRand() * 18 - 9),
    });

  const craters = genCraters(width, height, craterRand);

  // ── Bump map ──────────────────────────────────────────────────────────────
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bc = bumpCanvas.getContext('2d')!;

  bc.fillStyle = 'rgb(128,128,128)';
  bc.fillRect(0, 0, width, height);

  for (const { cx, cy, r, v } of swells) {
    for (const [dx, dy] of wrapOffsets(cx, cy, r)) {
      const ox = cx + dx, oy = cy + dy;
      const base = 128 + v;
      const g = bc.createRadialGradient(ox, oy, 0, ox, oy, r);
      g.addColorStop(0, `rgba(${base},${base},${base},0.30)`);
      g.addColorStop(1, 'rgba(128,128,128,0)');
      bc.fillStyle = g;
      bc.fillRect(ox - r, oy - r, r * 2, r * 2);
    }
  }

  for (const { cx, cy, r, depth } of craters) {
    for (const [dx, dy] of wrapOffsets(cx, cy, r * 1.5)) {
      const ox = cx + dx, oy = cy + dy;
      const d = Math.floor(128 - depth);
      const dm = Math.floor(128 - depth * 0.4);
      const bowl = bc.createRadialGradient(ox, oy, 0, ox, oy, r);
      bowl.addColorStop(0, `rgba(${d},${d},${d},0.90)`);
      bowl.addColorStop(0.72, `rgba(${dm},${dm},${dm},0.50)`);
      bowl.addColorStop(1, 'rgba(128,128,128,0)');
      bc.fillStyle = bowl;
      bc.beginPath();
      bc.arc(ox, oy, r, 0, Math.PI * 2);
      bc.fill();
      const rim = Math.floor(128 + depth * 0.55);
      bc.strokeStyle = `rgba(${rim},${rim},${rim},0.70)`;
      bc.lineWidth = Math.max(1, r * 0.12);
      bc.beginPath();
      bc.arc(ox, oy, r * 0.88, 0, Math.PI * 2);
      bc.stroke();
      if (r > 45) {
        const peak = Math.floor(128 + depth * 0.35);
        const pg = bc.createRadialGradient(ox, oy, 0, ox, oy, r * 0.12);
        pg.addColorStop(0, `rgba(${peak},${peak},${peak},0.65)`);
        pg.addColorStop(1, 'rgba(128,128,128,0)');
        bc.fillStyle = pg;
        bc.beginPath();
        bc.arc(ox, oy, r * 0.12, 0, Math.PI * 2);
        bc.fill();
      }
    }
  }

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.colorSpace = THREE.NoColorSpace;
  bumpMap.needsUpdate = true;

  // ── Color map — derived from same craters ─────────────────────────────────
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const cc = colorCanvas.getContext('2d')!;

  cc.fillStyle = 'rgb(142,140,132)';
  cc.fillRect(0, 0, width, height);

  const colorRand = makeLCG(91234);

  // Dark mare patches — wrapped
  for (let i = 0; i < 7; i++) {
    const cx = colorRand() * width;
    const cy = colorRand() * height;
    const rx = 130 + colorRand() * 260;
    const ry = 80 + colorRand() * 180;
    const darkness = 28 + colorRand() * 22;
    const angle = colorRand() * Math.PI;
    const dv = Math.floor(108 - darkness);
    for (const [dx, dy] of wrapOffsets(cx, cy, rx * 1.2)) {
      const ox = cx + dx, oy = cy + dy;
      cc.save();
      cc.translate(ox, oy);
      cc.rotate(angle);
      cc.scale(1, ry / rx);
      const g = cc.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, `rgba(${dv},${dv - 2},${dv - 8},0.78)`);
      g.addColorStop(0.55, `rgba(${dv + 10},${dv + 8},${dv + 2},0.40)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      cc.fillStyle = g;
      cc.beginPath();
      cc.arc(0, 0, rx, 0, Math.PI * 2);
      cc.fill();
      cc.restore();
    }
  }

  // Highland patches — wrapped
  for (let i = 0; i < 22; i++) {
    const cx = colorRand() * width;
    const cy = colorRand() * height;
    const r = 55 + colorRand() * 160;
    const brightness = 10 + colorRand() * 20;
    const bv = Math.floor(160 + brightness);
    for (const [dx, dy] of wrapOffsets(cx, cy, r)) {
      const ox = cx + dx, oy = cy + dy;
      const g = cc.createRadialGradient(ox, oy, 0, ox, oy, r);
      g.addColorStop(0, `rgba(${bv},${bv - 2},${bv - 8},0.32)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      cc.fillStyle = g;
      cc.fillRect(ox - r, oy - r, r * 2, r * 2);
    }
  }

  // Crater color — same positions as bump, wrapped
  for (const { cx, cy, r, depth } of craters) {
    if (r < 4) continue;
    const darkness = depth * 0.18;
    for (const [dx, dy] of wrapOffsets(cx, cy, r * 1.5)) {
      const ox = cx + dx, oy = cy + dy;
      const bowl = cc.createRadialGradient(ox, oy, 0, ox, oy, r * 0.85);
      bowl.addColorStop(0, `rgba(${Math.floor(100 - darkness)},${Math.floor(98 - darkness)},${Math.floor(90 - darkness)},0.55)`);
      bowl.addColorStop(1, 'rgba(0,0,0,0)');
      cc.fillStyle = bowl;
      cc.beginPath();
      cc.arc(ox, oy, r * 0.85, 0, Math.PI * 2);
      cc.fill();
      const ejecta = cc.createRadialGradient(ox, oy, r * 0.75, ox, oy, r * 1.3);
      ejecta.addColorStop(0, `rgba(195,193,185,${0.20 + depth * 0.003})`);
      ejecta.addColorStop(1, 'rgba(0,0,0,0)');
      cc.fillStyle = ejecta;
      cc.beginPath();
      cc.arc(ox, oy, r * 1.3, 0, Math.PI * 2);
      cc.fill();
    }
  }

  // Fine noise (no wrapping needed — random scatter covers edges naturally)
  for (let i = 0; i < 10000; i++) {
    const x = colorRand() * width;
    const y = colorRand() * height;
    const v = Math.floor(colorRand() * 28 - 14);
    const cv = 128 + v;
    cc.fillStyle = `rgba(${cv},${cv - 1},${cv - 5},0.10)`;
    cc.fillRect(x, y, 2, 2);
  }

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.needsUpdate = true;

  return { colorMap, bumpMap };
}

/**
 * Procedural lunar bump map.
 * Mid-grey = flat; darker = depression; brighter = raised rim.
 * Multi-scale cratering from mega basins down to micro pits,
 * with low-frequency terrain undulation beneath.
 */
export function buildLunarBumpMap(width = 2048, height = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const rand = makeLCG(54321);

  ctx.fillStyle = 'rgb(128,128,128)';
  ctx.fillRect(0, 0, width, height);

  // Low-frequency terrain undulation — gentle broad rises and dips
  for (let i = 0; i < 30; i++) {
    const cx = rand() * width;
    const cy = rand() * height;
    const r = 180 + rand() * 380;
    const v = Math.floor(rand() * 18 - 9);
    const base = 128 + v;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(${base},${base},${base},0.30)`);
    g.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  const drawCrater = (cx: number, cy: number, r: number, depth: number) => {
    // Bowl depression
    const d = Math.floor(128 - depth);
    const dm = Math.floor(128 - depth * 0.4);
    const bowl = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    bowl.addColorStop(0, `rgba(${d},${d},${d},0.90)`);
    bowl.addColorStop(0.72, `rgba(${dm},${dm},${dm},0.50)`);
    bowl.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = bowl;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Raised rim
    const rim = Math.floor(128 + depth * 0.55);
    ctx.strokeStyle = `rgba(${rim},${rim},${rim},0.70)`;
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2);
    ctx.stroke();
    // Central peak for large craters
    if (r > 45) {
      const peak = Math.floor(128 + depth * 0.35);
      const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.12);
      pg.addColorStop(0, `rgba(${peak},${peak},${peak},0.65)`);
      pg.addColorStop(1, 'rgba(128,128,128,0)');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Mega basins (Mare-scale, very shallow)
  for (let i = 0; i < 6; i++)
    drawCrater(rand() * width, rand() * height, 160 + rand() * 200, 16 + rand() * 12);
  // Large craters
  for (let i = 0; i < 65; i++)
    drawCrater(rand() * width, rand() * height, 42 + rand() * 88, 38 + rand() * 26);
  // Medium craters
  for (let i = 0; i < 350; i++)
    drawCrater(rand() * width, rand() * height, 12 + rand() * 38, 46 + rand() * 28);
  // Small craters
  for (let i = 0; i < 1200; i++)
    drawCrater(rand() * width, rand() * height, 4 + rand() * 11, 50 + rand() * 30);
  // Micro pits
  for (let i = 0; i < 3500; i++)
    drawCrater(rand() * width, rand() * height, 1 + rand() * 4, 36 + rand() * 24);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}
