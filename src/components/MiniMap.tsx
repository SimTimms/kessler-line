import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import MiniMapScene, { type HoverInfo } from './MiniMapScene';
import { waypointPromptDef } from '../context/WaypointPrompt';
import { navTargetPosRef, navTargetIdRef } from '../context/NavTarget';
import type { WorldObjectDef } from '../config/worldConfig';

const HALF_H_MIN = 10;
const HALF_H_MAX = 300;
const HALF_H_DEFAULT = 80;

// Applies the current halfH from a shared ref to the orthographic camera each frame.
function CameraFrustum({ halfHRef }: { halfHRef: React.RefObject<number> }) {
  const { camera, size } = useThree();

  useFrame(() => {
    const orth = camera as THREE.OrthographicCamera;
    const h = halfHRef.current ?? HALF_H_DEFAULT;
    const hHalf = (size.width / size.height) * h;
    orth.top = h;
    orth.bottom = -h;
    orth.left = -hHalf;
    orth.right = hHalf;
    orth.updateProjectionMatrix();
  });

  return null;
}

export default function MiniMap() {
  const [tooltip, setTooltip] = useState<HoverInfo | null>(null);
  const [waypointPrompt, setWaypointPrompt] = useState<WorldObjectDef | null>(null);
  const halfHRef = useRef<number>(HALF_H_DEFAULT);

  // Poll waypointPromptDef so clicks on dots surface as a React panel
  useEffect(() => {
    const poll = window.setInterval(() => {
      if (waypointPromptDef.current) {
        setWaypointPrompt(waypointPromptDef.current);
        waypointPromptDef.current = null;
      }
    }, 100);
    return () => window.clearInterval(poll);
  }, []);

  function confirmWaypoint() {
    if (!waypointPrompt) return;
    navTargetPosRef.current.set(...waypointPrompt.position);
    navTargetIdRef.current = waypointPrompt.id;
    setWaypointPrompt(null);
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    halfHRef.current = Math.max(HALF_H_MIN, Math.min(HALF_H_MAX, halfHRef.current * factor));
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 8, 0.88)',
        zIndex: 10,
      }}
      onWheel={handleWheel}
    >
      <Canvas
        orthographic
        camera={{ position: [0, 10, 0], up: [0, 0, -1], near: -100, far: 5000 }}
        gl={{ antialias: false }}
      >
        <CameraFrustum halfHRef={halfHRef} />
        <MiniMapScene onHover={(info) => setTooltip(info)} />
      </Canvas>

      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 14,
            top: tooltip.y - 10,
            background: 'rgba(0, 0, 8, 0.9)',
            color: '#00ff88',
            fontFamily: 'monospace',
            fontSize: 13,
            padding: '4px 10px',
            borderRadius: 3,
            border: '1px solid rgba(0,255,136,0.5)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            letterSpacing: '0.05em',
          }}
        >
          {tooltip.label}
        </div>
      )}

      {waypointPrompt && (
        <div
          style={{
            position: 'fixed',
            bottom: 48,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 8, 0.95)',
            border: '1px solid rgba(255,153,0,0.6)',
            borderRadius: 4,
            padding: '16px 24px',
            fontFamily: 'monospace',
            color: '#ff9900',
            letterSpacing: '0.08em',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            zIndex: 11,
          }}
        >
          <div style={{ fontSize: 11, color: 'rgba(255,153,0,0.6)' }}>NAV COMPUTER</div>
          <div style={{ fontSize: 14 }}>PLOT WAYPOINT: {waypointPrompt.label.toUpperCase()}</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={confirmWaypoint}
              style={{
                background: 'rgba(255,153,0,0.15)',
                border: '1px solid rgba(255,153,0,0.7)',
                color: '#ff9900',
                fontFamily: 'monospace',
                fontSize: 12,
                letterSpacing: '0.1em',
                padding: '6px 18px',
                cursor: 'pointer',
              }}
            >
              CONFIRM
            </button>
            <button
              onClick={() => setWaypointPrompt(null)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.4)',
                fontFamily: 'monospace',
                fontSize: 12,
                letterSpacing: '0.1em',
                padding: '6px 18px',
                cursor: 'pointer',
              }}
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Title */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(0,255,136,0.55)',
          fontFamily: 'monospace',
          fontSize: 11,
          letterSpacing: '0.18em',
          pointerEvents: 'none',
        }}
      >
        SOLAR SYSTEM — NAV CHART
      </div>

      {/* Legend */}
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: 20,
          color: 'rgba(255,255,255,0.3)',
          fontFamily: 'monospace',
          fontSize: 10,
          letterSpacing: '0.08em',
          pointerEvents: 'none',
          lineHeight: 1.8,
        }}
      >
        <span style={{ color: '#ffffff' }}>▲</span> HEADING&nbsp;&nbsp;
        <span style={{ color: '#44ff88' }}>—</span> VELOCITY&nbsp;&nbsp;
        <span style={{ color: '#ff9900' }}>—</span> WAYPOINT
      </div>

      {/* Close hint */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          right: 20,
          color: 'rgba(0,255,136,0.4)',
          fontFamily: 'monospace',
          fontSize: 12,
          letterSpacing: '0.1em',
          pointerEvents: 'none',
        }}
      >
        [M] CLOSE MAP
      </div>
    </div>
  );
}
