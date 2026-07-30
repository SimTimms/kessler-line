import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';

// Thresholds for colour-coding each stat.
// FPS is inverted (lower = worse) and handled separately.
interface StatDef {
  label: string;
  warnAbove?: number;
  badAbove?: number;
}

const STAT_DEFS: StatDef[] = [
  { label: 'FPS' },
  { label: 'MS',      warnAbove: 20,    badAbove: 33     }, // 50 fps / 30 fps
  { label: 'CALLS',   warnAbove: 80,    badAbove: 200    },
  { label: 'TRIS',    warnAbove: 300000, badAbove: 600000 },
  { label: 'PTS',     warnAbove: 50000,  badAbove: 200000 },
  { label: 'LINES',   warnAbove: 5000,   badAbove: 20000  },
  { label: 'GEOM',    warnAbove: 50,    badAbove: 100    },
  { label: 'TEX',     warnAbove: 30,    badAbove: 60     },
  { label: 'SHADERS', warnAbove: 15,    badAbove: 30     },
  // useFrame subscriber count — direct measure of per-frame JS overhead.
  // Each active useFrame hook adds one subscriber.
  { label: 'SUBS',    warnAbove: 25,    badAbove: 50     },
];

const C_NORMAL = 'rgba(140,220,255,0.9)';
const C_WARN   = 'rgba(255,200,80,0.9)';
const C_BAD    = 'rgba(255,80,80,0.9)';
const C_GOOD   = 'rgba(100,255,150,0.9)';

function valueColor(def: StatDef, val: number): string {
  if (def.label === 'FPS') {
    if (val >= 55) return C_GOOD;
    if (val >= 30) return C_WARN;
    return C_BAD;
  }
  if (def.badAbove !== undefined && val > def.badAbove) return C_BAD;
  if (def.warnAbove !== undefined && val > def.warnAbove) return C_WARN;
  return C_NORMAL;
}

function fmt(label: string, val: number): string {
  if (label === 'MS')   return val.toFixed(1) + ' ms';
  if (label === 'TRIS' || label === 'PTS' || label === 'LINES') {
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + 'M';
    if (val >= 1_000)     return (val / 1_000).toFixed(0) + 'k';
  }
  return String(val);
}

/**
 * R3F component (must sit inside <Canvas>).
 * Mounts a fixed-position DOM overlay and updates it directly each frame —
 * no React state, no re-renders.
 *
 * We own the info reset cycle (autoReset = false) so we capture the true
 * per-frame total across ALL render passes (main scene, minimap, chase cam,
 * post-processing, shadow maps, etc.) rather than only the last render call.
 */
export default function RenderInfoPanel() {
  const { gl, internal } = useThree();
  const spansRef = useRef<HTMLSpanElement[]>([]);
  const frameTimesRef = useRef<number[]>([]);

  useEffect(() => {
    // Take over reset responsibility so info accumulates across every render
    // pass in a frame and we read the complete total before clearing.
    gl.info.autoReset = false;
    return () => { gl.info.autoReset = true; };
  }, [gl]);

  useEffect(() => {
    const container = document.createElement('div');
    Object.assign(container.style, {
      position:      'fixed',
      top:           '10px',
      right:         '10px',
      zIndex:        '9999',
      background:    'rgba(4,10,20,0.88)',
      border:        '1px solid rgba(100,200,255,0.2)',
      borderRadius:  '5px',
      padding:       '8px 12px',
      fontFamily:    'monospace',
      fontSize:      '10px',
      color:         'rgba(180,220,255,0.85)',
      lineHeight:    '1.75',
      pointerEvents: 'none',
      userSelect:    'none',
      minWidth:      '148px',
    });

    const header = document.createElement('div');
    header.textContent = 'RENDER INFO';
    Object.assign(header.style, {
      fontSize:     '9px',
      letterSpacing:'0.12em',
      opacity:      '0.45',
      marginBottom: '4px',
      paddingBottom:'3px',
      borderBottom: '1px solid rgba(100,200,255,0.12)',
    });
    container.appendChild(header);

    const spans: HTMLSpanElement[] = [];

    for (const def of STAT_DEFS) {
      const row = document.createElement('div');
      Object.assign(row.style, { display: 'flex', justifyContent: 'space-between', gap: '12px' });

      const label = document.createElement('span');
      label.textContent = def.label;
      Object.assign(label.style, { opacity: '0.45' });

      const val = document.createElement('span');
      val.textContent = '—';

      row.appendChild(label);
      row.appendChild(val);
      container.appendChild(row);
      spans.push(val);
    }

    spansRef.current = spans;
    document.body.appendChild(container);
    return () => { document.body.removeChild(container); };
  }, []);

  // Priority 100 → runs after all other useFrame callbacks so we capture
  // the final scene state, then reset info before this frame's render passes.
  useFrame((_, delta) => {
    const spans = spansRef.current;
    if (!spans.length) return;

    // Rolling 60-frame average for stable FPS / MS readout
    const ft = frameTimesRef.current;
    ft.push(delta);
    if (ft.length > 60) ft.shift();
    const avgDelta = ft.reduce((a, b) => a + b, 0) / ft.length;
    const fps = Math.round(1 / avgDelta);
    const ms  = avgDelta * 1000;

    // Read stats accumulated during the PREVIOUS frame's render passes
    const r = gl.info.render;
    const m = gl.info.memory;
    const shaderCount = gl.info.programs?.length ?? 0;

    const subCount = internal.subscribers.length;
    const rawValues: number[] = [fps, ms, r.calls, r.triangles, r.points, r.lines, m.geometries, m.textures, shaderCount, subCount];

    for (let i = 0; i < STAT_DEFS.length; i++) {
      const def  = STAT_DEFS[i];
      const val  = rawValues[i];
      const span = spans[i];
      span.textContent  = fmt(def.label, val);
      span.style.color  = valueColor(def, val);
    }

    // Reset now so this frame's render passes start from zero
    gl.info.reset();
  }, 100);

  return null;
}
